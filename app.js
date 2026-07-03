// OsteoGrip IoT System Logic Controller
document.addEventListener("DOMContentLoaded", () => {
    // Current Time Initialisation
    const timeSpan = document.getElementById("current-time");
    const updateTime = () => {
        const now = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        timeSpan.textContent = now.toLocaleDateString('id-ID', options);
    };
    updateTime();
    setInterval(updateTime, 1000);

    // Patient Profiles Data
    const patientProfiles = {
        pasien1: {
            name: "Ny. Aminah",
            age: 68,
            gender: "Perempuan",
            diag: "Osteoporosis Primer (Ringan)",
            targetForce: 27.5,
            fatigue: 18,
            sessions: [24.5, 25.0, 26.2, 25.8, 26.9, 27.5],
            risk: "LOW",
            warnings: {
                title: "Kekuatan Genggaman Stabil (Aman)",
                desc: "Fmax Ny. Aminah berada pada batas normal kelompok usianya. Disarankan melanjutkan senam osteoporosis ringan 3x seminggu.",
                icon: "✅"
            },
            recommendation: "Pertahankan rutinitas latihan fisik mandiri di rumah. Konsumsi kalsium 1200mg/hari dan Vitamin D3 1000 IU. Evaluasi ulang kekuatan genggaman 1 bulan lagi.",
            reminders: {
                latihan: true,
                kontrol: false
            }
        },
        pasien2: {
            name: "Tn. Subarjo",
            age: 72,
            gender: "Laki-laki",
            diag: "Osteoporosis Senilis & Sarkopenia",
            targetForce: 13.8,
            fatigue: 42,
            sessions: [19.5, 17.2, 16.0, 15.1, 14.0, 13.8],
            risk: "HIGH",
            warnings: {
                title: "Risiko Tinggi Penurunan Motorik!",
                desc: "Fmax Tn. Subarjo berada di bawah batas sarkopenia (< 26 kg untuk pria). Penurunan cepat kekuatan mengindikasikan atrofi otot berat.",
                icon: "⚠️"
            },
            recommendation: "Rujuk ke Fisioterapi Medik untuk rehabilitasi kekuatan ekstremitas atas. Pertimbangkan alat bantu aktivitas sehari-hari (ergonomic tools). Rencanakan pemeriksaan kepadatan tulang (DEXA Scan) ulang.",
            reminders: {
                latihan: true,
                kontrol: true
            }
        },
        pasien3: {
            name: "Ny. Kartini",
            age: 64,
            gender: "Perempuan",
            diag: "Osteoporosis Pasca-Menopause",
            targetForce: 19.5,
            fatigue: 29,
            sessions: [17.5, 18.0, 17.8, 18.5, 19.2, 19.5],
            risk: "MEDIUM",
            warnings: {
                title: "Waspada Penurunan Fungsi Otot",
                desc: "Fmax Ny. Kartini berada di zona borderline. Ada sedikit perbaikan dibanding minggu lalu, namun kepatuhan latihan perlu diawasi.",
                icon: "⚠️"
            },
            recommendation: "Tingkatkan intensitas latihan hand grip squeezers menjadi 2 sesi per hari (pagi & sore). Evaluasi status asupan protein dan kadar kalsium darah.",
            reminders: {
                latihan: true,
                kontrol: false
            }
        }
    };

    // Chart.js Configuration
    const ctx = document.getElementById('gripTrendChart').getContext('2d');
    let trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Sesi 1', 'Sesi 2', 'Sesi 3', 'Sesi 4', 'Sesi 5', 'Sesi 6 (Hari Ini)'],
            datasets: [{
                label: 'Kekuatan Genggaman (kg)',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Kekuatan: ${context.parsed.y} kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 40,
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                }
            }
        }
    });

    // Interactive Flow Coordinates for Animated Light Beam
    // The path maps the transform translation centers of the nodes in sequence:
    // Pasien (50,60) -> Device (145,60) -> LoadCell (265,60) -> ESP32 (385,60) -> Wifi (385,140) -> Cloud (265,140) -> AI (145,140) -> Dashboard (145,220) -> Mobile (265,220) -> Dokter (385,220)
    const flowPathData = "M 50 60 L 145 60 L 265 60 L 385 60 L 385 140 L 265 140 L 145 140 L 145 220 L 265 220 L 385 220";
    const activePathElement = document.getElementById("active-path");
    activePathElement.setAttribute("d", flowPathData);

    // DOM Elements
    const patientSelect = document.getElementById("patient-select");
    const btnStart = document.getElementById("btn-start");
    const btnReset = document.getElementById("btn-reset");
    
    // Perangkat Elements
    const oledVal = document.getElementById("oled-val");
    const ledIndicator = document.getElementById("led-indicator");
    const forceFill = document.getElementById("force-fill");
    const liveForceText = document.getElementById("live-force-text");
    const targetForceText = document.getElementById("target-force-text");
    
    // Acquisition Elements
    const acqFmax = document.getElementById("acq-fmax");
    const acqDuration = document.getElementById("acq-duration");
    const acqFatigue = document.getElementById("acq-fatigue");
    const acqSession = document.getElementById("acq-session");
    const acqPname = document.getElementById("acq-pname");
    const acqPmeta = document.getElementById("acq-pmeta");

    // Communication Elements
    const transRate = document.getElementById("trans-rate");
    const txLogs = document.getElementById("tx-log-container");

    // Dashboard clinical elements
    const dashAvgFmax = document.getElementById("dash-avg-fmax");
    const dashSessions = document.getElementById("dash-sessions");
    const dashDeviceConn = document.getElementById("dash-device-conn");
    const sessionTableBody = document.getElementById("session-table-body");

    // AI & Risk alerts
    const aiTrend = document.getElementById("ai-trend");
    const aiMotorStatus = document.getElementById("ai-motor-status");
    const aiOsteoRisk = document.getElementById("ai-osteorisk");
    const warningBanner = document.getElementById("warning-banner");
    const warningIcon = document.getElementById("warning-icon");
    const warningTitle = document.getElementById("warning-title");
    const warningDesc = document.getElementById("warning-desc");
    const riskLevelBadge = document.getElementById("risk-level-badge");

    // Mobile Patient App elements
    const mobPname = document.getElementById("mob-pname");
    const mobLastGrip = document.getElementById("mob-last-grip");
    const mobGripEval = document.getElementById("mob-grip-eval");
    const chkLatihan = document.getElementById("chk-latihan");
    const chkKontrol = document.getElementById("chk-kontrol");

    // Doctor Elements
    const docRecommendation = document.getElementById("doc-recommendation");

    // ThingsBoard Elements
    const tbHost = document.getElementById("tb-host");
    const tbToken = document.getElementById("tb-token");
    const tbDeviceId = document.getElementById("tb-device-id");
    const tbApiKey = document.getElementById("tb-apikey");
    const btnTbTest = document.getElementById("btn-tb-test");
    const tbTestStatus = document.getElementById("tb-test-status");

    // App state variables
    let currentProfile = patientProfiles[patientSelect.value];
    let isRunning = false;

    // Helper to log events in IoT terminal
    const addLog = (message, type = "info") => {
        const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
        const colorClass = type === "error" ? "color: #ef4444" : type === "success" ? "color: #10b981" : "color: #38bdf8";
        txLogs.innerHTML += `<div class="log-entry" style="${colorClass}">[${timestamp}] ${message}</div>`;
        txLogs.scrollTop = txLogs.scrollHeight;
    };

    // Load Profile Function
    const loadProfile = () => {
        const selectedKey = patientSelect.value;
        currentProfile = patientProfiles[selectedKey];

        // Reset inputs & text representation
        liveForceText.textContent = "0";
        targetForceText.textContent = currentProfile.targetForce;
        oledVal.textContent = "0.0 kg";
        forceFill.style.width = "0%";
        ledIndicator.setAttribute("fill", "#64748b"); // Gray default

        // Patient info fields
        acqPname.textContent = currentProfile.name;
        acqPmeta.textContent = `${currentProfile.gender}, ${currentProfile.age} th · Diagnosis: ${currentProfile.diag}`;
        mobPname.textContent = currentProfile.name;

        // Reset local acquisition indicators
        acqFmax.innerHTML = `0.0 <span class="unit">kg</span>`;
        acqDuration.innerHTML = `0.0 <span class="unit">detik</span>`;
        acqFatigue.innerHTML = `0 <span class="unit">%</span>`;
        acqSession.textContent = "#" + (currentProfile.sessions.length + 6); // Mock session number

        // Populate initial table data & charts
        updateTrendChart(currentProfile.sessions);
        populateTable(currentProfile.sessions);

        // Reset dynamic warnings & advice to standby
        aiTrend.textContent = "Menunggu Data...";
        aiTrend.className = "value-highlight";
        aiMotorStatus.textContent = "Menunggu Data...";
        aiMotorStatus.className = "value-highlight";
        aiOsteoRisk.textContent = "Menunggu Data...";
        aiOsteoRisk.className = "value-highlight";

        warningBanner.className = "warning-system-banner";
        warningIcon.textContent = "ℹ️";
        warningTitle.textContent = "Standby - Menunggu Pengukuran";
        warningDesc.textContent = "Silakan tekan tombol 'Mulai Simulasi' untuk memproses.";
        riskLevelBadge.textContent = "UNKNOWN";
        riskLevelBadge.className = "risk-level-badge";

        docRecommendation.textContent = "Silakan lakukan simulasi cengkeraman untuk memproses data analisis biomekanik.";
        docRecommendation.className = "italic-text";

        mobLastGrip.textContent = "0.0 kg";
        mobGripEval.textContent = "Menunggu Pengukuran";
        mobGripEval.style.color = "var(--text-light)";
        chkLatihan.checked = false;
        chkKontrol.checked = false;

        addLog(`Profil dimuat: ${currentProfile.name} (${currentProfile.age} tahun). Mempersiapkan sensor...`);
    };

    const updateTrendChart = (sessionArray) => {
        trendChart.data.datasets[0].data = sessionArray;
        trendChart.update();

        // Calculate average Fmax
        const sum = sessionArray.reduce((a, b) => a + b, 0);
        const avg = (sum / sessionArray.length).toFixed(1);
        dashAvgFmax.textContent = `${avg} kg`;
        dashSessions.textContent = `${sessionArray.length} Sesi`;
    };

    const populateTable = (sessions) => {
        sessionTableBody.innerHTML = "";
        // Render in reverse to show latest sessions first
        const dates = [
            "20 Juni 2026", "23 Juni 2026", "26 Juni 2026", "28 Juni 2026", "01 Juli 2026", "03 Juli 2026"
        ];
        
        for (let i = sessions.length - 1; i >= 0; i--) {
            const val = sessions[i];
            let statusBadge = "";
            
            if (currentProfile.risk === "LOW") {
                statusBadge = `<span class="badge" style="background:#d1fae5; color:#065f46; border:none;">Normal</span>`;
            } else if (currentProfile.risk === "MEDIUM") {
                statusBadge = `<span class="badge" style="background:#fef3c7; color:#92400e; border:none;">Borderline</span>`;
            } else {
                statusBadge = `<span class="badge" style="background:#fee2e2; color:#991b1b; border:none;">Atrofi</span>`;
            }

            sessionTableBody.innerHTML += `
                <tr>
                    <td>Sesi ${i+1}</td>
                    <td><strong>${val.toFixed(1)} kg</strong></td>
                    <td>${dates[i] || '03 Juli 2026'}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }
    };

    // Main Interactive Simulation Sequence
    const runSimulation = () => {
        if (isRunning) return;
        isRunning = true;
        btnStart.disabled = true;
        patientSelect.disabled = true;

        // Reset paths opacity & start glowing beam
        activePathElement.style.opacity = "1";
        
        addLog("Memulai prosedur kalibrasi modul HX711...", "info");
        ledIndicator.setAttribute("fill", "#e2e8f0"); // LED white during calibrate

        setTimeout(() => {
            addLog("Taram / Offset terkalibrasi ke 0.0 kg. Mulai kontraksi cengkeraman...", "info");
            ledIndicator.setAttribute("fill", "#e5e7eb");
            
            // Simulating real-time grip curve
            let elapsed = 0;
            const duration = 3.0; // 3 seconds contraction
            const intervalTime = 100; // updates every 100ms
            const maxTarget = currentProfile.targetForce;

            const simInterval = setInterval(() => {
                elapsed += 0.1;
                
                // Mathematical bell curve representation for physical contraction force
                // Formula: force = MaxForce * sin(pi * elapsed / duration)^0.7
                let currentForce = 0;
                if (elapsed <= duration) {
                    currentForce = maxTarget * Math.pow(Math.sin(Math.PI * elapsed / duration), 0.75);
                } else {
                    currentForce = 0;
                }

                // Random noise jitter
                if (currentForce > 0.5) {
                    currentForce += (Math.random() - 0.5) * 0.4;
                }
                
                currentForce = Math.max(0, currentForce);

                // Update physical visualizers
                oledVal.textContent = `${currentForce.toFixed(1)} kg`;
                liveForceText.textContent = currentForce.toFixed(1);
                
                const percentage = Math.min(100, (currentForce / 35.0) * 100); // 35kg scale max reference
                forceFill.style.width = `${percentage}%`;

                // LED changes based on intensity
                if (currentForce < 10) {
                    ledIndicator.setAttribute("fill", "#f59e0b"); // Yellow load
                } else if (currentForce >= 10 && currentForce < 25) {
                    ledIndicator.setAttribute("fill", "#10b981"); // Green optimal
                } else {
                    ledIndicator.setAttribute("fill", "#ef4444"); // High strain
                }

                // Update local acquisition screen dynamically
                acqDuration.innerHTML = `${elapsed.toFixed(1)} <span class="unit">detik</span>`;
                acqFmax.innerHTML = `${Math.max(parseFloat(acqFmax.textContent) || 0, currentForce).toFixed(1)} <span class="unit">kg</span>`;

                if (elapsed >= duration) {
                    clearInterval(simInterval);
                    finishGripAcquisition();
                }
            }, intervalTime);

        }, 1200);
    };

    const finishGripAcquisition = () => {
        addLog("Kontraksi selesai. Menyimpan Fmax lokal pada EEPROM ESP32...", "info");
        
        const fmaxVal = currentProfile.targetForce; // calibrated result
        oledVal.textContent = `${fmaxVal.toFixed(1)} kg`;
        liveForceText.textContent = fmaxVal.toFixed(1);
        
        acqFmax.innerHTML = `${fmaxVal.toFixed(1)} <span class="unit">kg</span>`;
        acqDuration.innerHTML = `3.0 <span class="unit">detik</span>`;
        acqFatigue.innerHTML = `${currentProfile.fatigue} <span class="unit">%</span>`;

        setTimeout(() => {
            // IoT Transmission Sequence
            addLog("Mengaktifkan modem WiFi ESP32. Membangun koneksi aman (WPA2)...", "info");
            transRate.textContent = "Connecting...";
            transRate.style.color = "var(--warning)";

            setTimeout(() => {
                addLog("WiFi Terhubung: IP 192.168.1.144, RSSI -62 dBm", "success");
                
                const host = tbHost.value.trim();
                const token = tbToken.value.trim();
                const devId = tbDeviceId.value.trim();
                const url = `${host}/api/v1/${token}/telemetry`;

                addLog(`Mempersiapkan pengiriman telemetry ke ThingsBoard (${host})...`, "info");
                transRate.textContent = "TX: 115.2 Kbps";
                transRate.style.color = "var(--success)";

                const rawPayload = {
                    fmax: fmaxVal,
                    duration: 3.0,
                    fatigue: currentProfile.fatigue,
                    patientName: currentProfile.name,
                    patientAge: currentProfile.age,
                    riskLevel: currentProfile.risk,
                    deviceId: devId
                };
                
                const payloadStr = JSON.stringify(rawPayload);
                addLog(`Payload Telemetry: ${payloadStr}`, "info");

                // Execute real HTTP POST request to ThingsBoard Device HTTP API
                addLog(`HTTP POST -> ${url}`, "info");
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: payloadStr,
                    mode: 'cors'
                })
                .then(response => {
                    if (response.ok) {
                        addLog("Koneksi ThingsBoard Sinkron! HTTP 200 OK. Telemetry Berhasil Diunggah.", "success");
                        tbTestStatus.textContent = "Status: Terhubung (200 OK)";
                        tbTestStatus.style.color = "var(--success)";
                    } else {
                        addLog(`ThingsBoard Server merespon dengan error: HTTP ${response.status}`, "error");
                        tbTestStatus.textContent = `Status: Error HTTP ${response.status}`;
                        tbTestStatus.style.color = "var(--danger)";
                    }
                    proceedToAiAndDashboard();
                })
                .catch(err => {
                    addLog(`CORS / Network Error saat menghubungkan ke ThingsBoard. Menggunakan fallback lokal.`, "error");
                    addLog(`Detail Error: ${err.message}`, "info");
                    proceedToAiAndDashboard();
                });

                function proceedToAiAndDashboard() {
                    addLog("Server Cloud: Menjalankan skrip inferensi AI (Decision Tree & SVM)...", "info");

                    setTimeout(() => {
                        // AI analysis finishes
                        addLog("Analisis AI Selesai. Hasil klasifikasi risiko diperbarui.", "success");

                        // Update AI cards
                        aiTrend.textContent = currentProfile.risk === "LOW" ? "Sangat Stabil (Meningkat 2.4%)" : currentProfile.risk === "MEDIUM" ? "Fluktuatif Ringan" : "Menurun Drastis (Penurunan 29%)";
                        aiTrend.style.color = currentProfile.risk === "LOW" ? "var(--success)" : currentProfile.risk === "MEDIUM" ? "var(--warning)" : "var(--danger)";

                        aiMotorStatus.textContent = currentProfile.risk === "LOW" ? "Optimal (Motorik Terjaga)" : currentProfile.risk === "MEDIUM" ? "Penurunan Ringan" : "Defisit Motorik Berat";
                        aiMotorStatus.style.color = currentProfile.risk === "LOW" ? "var(--success)" : currentProfile.risk === "MEDIUM" ? "var(--warning)" : "var(--danger)";

                        aiOsteoRisk.textContent = currentProfile.risk === "LOW" ? "Risiko Osteoporosis Rendah" : currentProfile.risk === "MEDIUM" ? "Risiko Moderat" : "Kepadatan Tulang Kritis";
                        aiOsteoRisk.style.color = currentProfile.risk === "LOW" ? "var(--success)" : currentProfile.risk === "MEDIUM" ? "var(--warning)" : "var(--danger)";

                        // Early warning banner triggers
                        warningBanner.className = `warning-system-banner state-${currentProfile.risk.toLowerCase()}`;
                        warningIcon.textContent = currentProfile.warnings.icon;
                        warningTitle.textContent = currentProfile.warnings.title;
                        warningDesc.textContent = currentProfile.warnings.desc;
                        riskLevelBadge.textContent = currentProfile.risk;

                        // Clinician card updates
                        docRecommendation.textContent = currentProfile.recommendation;
                        docRecommendation.className = "italic-text";
                        docRecommendation.style.color = "var(--text-main)";

                        // Patient App displays
                        mobLastGrip.textContent = `${fmaxVal.toFixed(1)} kg`;
                        mobGripEval.textContent = currentProfile.warnings.title;
                        mobGripEval.style.color = currentProfile.risk === "LOW" ? "var(--success)" : currentProfile.risk === "MEDIUM" ? "var(--warning)" : "var(--danger)";

                        if (currentProfile.reminders.latihan) {
                            chkLatihan.checked = true;
                            document.getElementById("rem-afternoon").className = "reminder-item done";
                        }
                        if (currentProfile.reminders.kontrol) {
                            chkKontrol.checked = false; // still unchecked, flashing for urgency
                            document.getElementById("rem-doctor").className = "reminder-item alert-active";
                        } else {
                            chkKontrol.checked = true;
                            document.getElementById("rem-doctor").className = "reminder-item done";
                        }

                        // Add new data point to the trend chart
                        const newSessions = [...currentProfile.sessions];
                        updateTrendChart(newSessions);
                        populateTable(newSessions);

                        addLog("Sesi pengukuran sukses dicatat secara komplit. Sistem kembali standby.", "success");
                        ledIndicator.setAttribute("fill", "#10b981"); // static green standby
                        
                        // Disable glow pathways
                        setTimeout(() => {
                            activePathElement.style.opacity = "0";
                        }, 2000);

                        isRunning = false;
                        btnStart.disabled = false;
                        patientSelect.disabled = false;

                    }, 1200);
                }

            }, 1000);

        }, 800);
    };

    // Reset procedure
    const resetData = () => {
        if (isRunning) return;
        loadProfile();
        addLog("Data simulasi di-reset. Menunggu instruksi...", "info");
    };

    // Test ThingsBoard Connection
    const testThingsBoardConnection = () => {
        const host = tbHost.value.trim();
        const token = tbToken.value.trim();
        const url = `${host}/api/v1/${token}/telemetry`;

        tbTestStatus.textContent = "Status: Menghubungkan...";
        tbTestStatus.style.color = "var(--warning)";
        addLog(`Uji Koneksi -> HTTP POST ke ${url}...`, "info");

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: "online",
                client: "OsteoGrip Web Poster Dashboard",
                testConnection: true
            }),
            mode: 'cors'
        })
        .then(response => {
            if (response.ok) {
                tbTestStatus.textContent = "Status: Terhubung (200 OK)";
                tbTestStatus.style.color = "var(--success)";
                addLog("Koneksi ke ThingsBoard berhasil terjalin! Device terdaftar.", "success");
            } else {
                tbTestStatus.textContent = `Status: Error ${response.status}`;
                tbTestStatus.style.color = "var(--danger)";
                addLog(`ThingsBoard merespon HTTP ${response.status}. Periksa token Anda.`, "error");
            }
        })
        .catch(err => {
            tbTestStatus.textContent = "Status: CORS/Jaringan Error";
            tbTestStatus.style.color = "var(--danger)";
            addLog("Peringatan CORS: Request diblokir oleh browser. Menggunakan fallback lokal.", "error");
            addLog(`Gunakan browser extension CORS-unblock atau bypass untuk server lokal/publik.`, "info");
            addLog(`Detail Error: ${err.message}`, "info");
        });
    };

    // Set event listeners
    patientSelect.addEventListener("change", loadProfile);
    btnStart.addEventListener("click", runSimulation);
    btnReset.addEventListener("click", resetData);
    btnTbTest.addEventListener("click", testThingsBoardConnection);

    // Initial Loading
    loadProfile();
});
