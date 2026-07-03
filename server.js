const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// PORT is read from environment first, so this also works when deployed
// behind a hosting platform that assigns its own port (Railway, Render, etc).
const PORT = process.env.PORT || 8080;
// Bind to 0.0.0.0 (not 127.0.0.1) so the server is reachable from other
// devices on the network / the internet, not just from the machine itself.
const HOST = '0.0.0.0';

// Normalizes a ThingsBoard host string typed by the user into a clean,
// well-formed base URL (adds https:// if missing, strips trailing slash).
function normalizeHost(rawHost) {
    let h = rawHost.trim();
    if (!/^https?:\/\//i.test(h)) {
        h = `https://${h}`;
    }
    h = h.replace(/\/+$/, ''); // strip trailing slash(es)
    return h;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // Enable CORS headers for development flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 1. Proxy API endpoint to forward telemetry data to ThingsBoard
    if (req.method === 'POST' && parsedUrl.pathname === '/api/telemetry') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { host, token, payload } = data;

                if (!host || !token || !payload) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing host, token, or payload parameters' }));
                    return;
                }

                // Normalize & build target ThingsBoard Device API url
                let parsedTarget;
                try {
                    const normalizedHost = normalizeHost(host);
                    const targetUrl = `${normalizedHost}/api/v1/${encodeURIComponent(token)}/telemetry`;
                    parsedTarget = new URL(targetUrl);
                } catch (parseErr) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid ThingsBoard host URL', details: parseErr.message }));
                    return;
                }

                if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Host must use http or https protocol' }));
                    return;
                }

                console.log(`[PROXY] Forwarding telemetry payload to: ${parsedTarget.href}`);

                const postData = JSON.stringify(payload);

                const options = {
                    hostname: parsedTarget.hostname,
                    port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
                    path: parsedTarget.pathname + parsedTarget.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    },
                    timeout: 10000 // 10s timeout so a dead ThingsBoard server can't hang the request forever
                };

                const client = parsedTarget.protocol === 'https:' ? https : http;

                const proxyReq = client.request(options, (proxyRes) => {
                    let resBody = '';
                    proxyRes.on('data', d => {
                        resBody += d.toString();
                    });
                    proxyRes.on('end', () => {
                        console.log(`[PROXY] ThingsBoard HTTP Status Response: ${proxyRes.statusCode}`);
                        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(resBody || JSON.stringify({ success: proxyRes.statusCode < 300 }));
                    });
                });

                proxyReq.on('timeout', () => {
                    console.error('[PROXY] Request to ThingsBoard timed out');
                    proxyReq.destroy(new Error('Request to ThingsBoard timed out'));
                });

                proxyReq.on('error', (e) => {
                    console.error(`[PROXY] Communication error: ${e.message}`);
                    if (!res.headersSent) {
                        res.writeHead(502, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed connecting to ThingsBoard server', details: e.message }));
                    }
                });

                proxyReq.write(postData);
                proxyReq.end();

            } catch (err) {
                console.error(`[PROXY] JSON parse error: ${err.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON request structure' }));
            }
        });
        return;
    }

    // 2. Serve Static Frontend Files
    const safeSuffix = path.normalize(decodeURIComponent(parsedUrl.pathname)).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(__dirname, safeSuffix === '/' || safeSuffix === '' ? 'index.html' : safeSuffix);

    // Validate request path safety (prevents path traversal outside __dirname)
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Page Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code} ..\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`[SERVER] Running at http://${HOST}:${PORT}/`);
    console.log(`[SERVER] Locally reachable at http://localhost:${PORT}/`);
});
