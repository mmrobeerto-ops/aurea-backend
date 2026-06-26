if (!window.SFA) {
    window.SFA = {
        downloadReport: () => {
            const dateObj = new Date();
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const docCode = `SFA-${yyyy}-${mm}${dd}-${Math.floor(100 + Math.random() * 900)}`;

            const text = `📄 INFORME DE DIAGNÓSTICO INDUSTRIAL — ÁUREA SYSTEMS
DEPARTAMENTO DE CONFIABILIDAD DE ACTIVOS
Reporte de Diagnóstico Espectral SFA (Sensores en Vivo)
Código de Documento: ${docCode} | Fecha de Emisión: ${dd}/${mm}/${yyyy}
==========================================================================
1. RESUMEN EJECUTIVO
Estatus del Núcleo: Calibrado
Índice de Salud: 78% (ADVERTENCIA)

Dictamen Técnico:
⚠️ ADVERTENCIA: Se registra desalineación leve en el acoplamiento del motor. Desviación armónica menor a 7.25 Hz. Monitorear temperatura.

2. COMPORTAMIENTO DE VARIABLES CRÍTICAS
Variable Evaluada        | Valor RMS / Máx | Límite Seguro | Condición
-------------------------|-----------------|---------------|------------------
Temperatura Máxima       | 67.4 °C         | 90.0 °C       | 🟢 Óptimo
Vibración Promedio (RMS) | 0.245 G         | 0.300 G       | 🟢 Óptimo
Fluctuación de Presión   | 0.40 bar        | < 1.50 bar    | 🟢 Óptimo
Consumo Eléctrico        | 21.5 A          | 25.0 A        | ⚠️ Advertencia (Consumo Elevado)

3. DIAGNÓSTICO AUTOMATIZADO SFA
Evidencia Mecánica:
Micro-oscilación cíclica detectada bajo límites de seguridad.
==========================================================================`;

            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const element = document.createElement('a');
            element.href = URL.createObjectURL(blob);
            element.download = `aurea_sfa_sensors_report_${Date.now()}.txt`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. MOBILE NAVBAR & SCROLL EFFECTS
    // ==========================================================================
    const navbar = document.querySelector('.navbar');
    const handleScroll = () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    const menuToggle = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    // ==========================================================================
    // 2. TERMINAL COAXIAL "N" & LOGS ACTIONS
    // ==========================================================================
    const btnTerminalToggle = document.getElementById('btn-terminal-toggle');
    const telemetryConsole = document.getElementById('telemetry-console');
    const consoleCloseBtn = document.getElementById('console-close-btn');
    const logContent = document.getElementById('console-log-content');
    
    if (btnTerminalToggle && telemetryConsole && consoleCloseBtn) {
        btnTerminalToggle.addEventListener('click', () => {
            telemetryConsole.classList.toggle('active');
            if (telemetryConsole.classList.contains('active')) {
                logContent.scrollTop = logContent.scrollHeight;
            }
        });
        consoleCloseBtn.addEventListener('click', () => {
            telemetryConsole.classList.remove('active');
        });
    }

    const addLogLine = (message, type = '') => {
        if (!logContent) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContent.appendChild(line);
        logContent.scrollTop = logContent.scrollHeight;
    };

    // ==========================================================================
    // 3. OSCILLOSCOPE & SFA ENGINE LOGIC
    // ==========================================================================
    const timeSlider = document.getElementById('time-slider');
    const timeSliderVal = document.getElementById('time-slider-val');
    const oscCanvas = document.getElementById('osc-canvas');
    const lblDiagnosticTxt = document.getElementById('lbl-diagnostic-txt');
    const btnDownloadReport = document.getElementById('btn-download-report');
    
    let currentLambda = 1.618;
    let timeShift = 500; // ms

    // Generate Base Telemetry Mock Data using natural equations
    const generateTelemetryData = (shiftMs) => {
        const dataList = [];
        const length = 120;
        const dt = 0.01;
        const phaseShift = (shiftMs / 1000) * 2 * Math.PI;

        for (let i = 0; i < length; i++) {
            const t = i * dt;
            // Ecuación base de vibración con armónicos y ruido fractal
            let vib = 0.12 * Math.sin(2 * Math.PI * 7.25 * t + phaseShift);
            vib += 0.08 * Math.sin(2 * Math.PI * (7.25 * currentLambda) * t + phaseShift * 1.5);
            // Ruido aleatorio
            vib += (Math.random() - 0.5) * 0.04;
            
            dataList.push({
                time: t,
                vibration: vib,
                temperature: 42.5 + Math.sin(t) * 1.2,
                pressure: 5.8 + Math.cos(t) * 0.3,
                current: 11.5 + Math.abs(vib) * 3
            });
        }
        return dataList;
    };

    const drawOscilloscope = () => {
        if (!oscCanvas) return;
        const ctx = oscCanvas.getContext('2d');
        const width = oscCanvas.width = oscCanvas.parentElement.clientWidth;
        const height = oscCanvas.height = 240;

        ctx.clearRect(0, 0, width, height);

        // Drawing settings
        const padding = { top: 25, right: 20, bottom: 25, left: 45 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Draw background grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridCols = 10;
        const gridRows = 6;
        
        for (let i = 0; i <= gridCols; i++) {
            const x = padding.left + (chartWidth / gridCols) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
        }
        for (let i = 0; i <= gridRows; i++) {
            const y = padding.top + (chartHeight / gridRows) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }

        // Generate data list
        const rawData = window.uploadedMotorData || generateTelemetryData(timeShift);
        
        // Analyze SFA using the actual engine binding (if loaded)
        let sfaData;
        if (window.SFA && typeof window.SFA.analyzeSFA === 'function') {
            sfaData = window.SFA.analyzeSFA(rawData, currentLambda);
        } else {
            // Fallback sintonización local simplificada
            const targetFreq = currentLambda === 1.618 ? 7.25 : 7.25 * currentLambda;
            const purified = rawData.map(d => {
                return 0.1 * Math.sin(2 * Math.PI * targetFreq * d.time);
            });
            sfaData = {
                targetFreq,
                amp: 0.1,
                purifiedSignal: purified,
                stats: { maxTempRaw: 45.6, rmsVib: 0.057, maxPresRaw: 6.0, maxCurrentRaw: 12.0 }
            };
        }

        // Scale functions
        const tMin = rawData[0].time;
        const tMax = rawData[rawData.length - 1].time;
        const vMin = -0.3;
        const vMax = 0.3;

        const scaleX = (t) => padding.left + ((t - tMin) / (tMax - tMin)) * chartWidth;
        const scaleY = (v) => padding.top + chartHeight - ((v - vMin) / (vMax - vMin)) * chartHeight;

        // 1. Draw Raw Signal (Muted Orange line)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 115, 0, 0.25)';
        ctx.lineWidth = 1.2;
        rawData.forEach((d, idx) => {
            const x = scaleX(d.time);
            const y = scaleY(d.vibration);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 2. Draw SFA Purified Wave (Glowing Gold line)
        ctx.beginPath();
        ctx.strokeStyle = '#ff7300'; // Orange
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(255, 115, 0, 0.5)';
        ctx.shadowBlur = 6;
        rawData.forEach((d, idx) => {
            const val = sfaData.purifiedSignal[idx];
            const x = scaleX(d.time);
            const y = scaleY(val);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0; // reset glow

        // Draw Axes Labels
        ctx.fillStyle = '#8f9bb3';
        ctx.font = '500 0.6rem Inter';
        ctx.textAlign = 'right';
        ctx.fillText(vMax.toFixed(2) + ' G', padding.left - 8, padding.top + 3);
        ctx.fillText('0.00 G', padding.left - 8, padding.top + chartHeight / 2 + 3);
        ctx.fillText(vMin.toFixed(2) + ' G', padding.left - 8, padding.top + chartHeight + 3);

        ctx.textAlign = 'center';
        ctx.fillText(tMin.toFixed(1) + ' s', padding.left, padding.top + chartHeight + 15);
        ctx.fillText(tMax.toFixed(1) + ' s', padding.left + chartWidth, padding.top + chartHeight + 15);

        // Chart Legends
        ctx.textAlign = 'left';
        ctx.font = '500 0.65rem Outfit';
        ctx.fillStyle = 'rgba(255, 115, 0, 0.5)';
        ctx.fillText('• Señal PLC Cruda', padding.left, padding.top - 8);
        
        ctx.fillStyle = '#ff7300';
        ctx.fillText('• Señal Sintonizada Espectral SFA (7.25 Hz × ' + currentLambda.toFixed(3) + ')', padding.left + 90, padding.top - 8);
    };

    // Sliders & events
    if (timeSlider) {
        timeSlider.addEventListener('input', (e) => {
            timeShift = parseInt(e.target.value);
            timeSliderVal.textContent = `${timeShift} ms`;
            drawOscilloscope();
        });
    }

    // Initial draw
    drawOscilloscope();
    window.addEventListener('resize', drawOscilloscope);

    // ==========================================================================
    // 4. CSV DRAG & DROP & SIMULATOR
    // ==========================================================================
    const dropzone = document.getElementById('sfa-dropzone-top');
    const fileInput = document.getElementById('sfa-file-input');
    const btnSimMotor = document.getElementById('btn-sim-motor');

    if (dropzone && fileInput) {
        dropzone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropzone.style.background = 'rgba(255, 115, 0, 0.08)';
            dropzone.style.borderColor = 'var(--color-primary-gold)';
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.background = 'rgba(197, 168, 128, 0.01)';
            dropzone.style.borderColor = 'rgba(197, 168, 128, 0.2)';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.background = 'rgba(197, 168, 128, 0.01)';
            dropzone.style.borderColor = 'rgba(197, 168, 128, 0.2)';
            
            const file = e.dataTransfer.files[0];
            if (file) {
                processFile(file);
            }
        });

        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                processFile(file);
            }
        });
    }

    // Parse CSV Helper
    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 2) return null;
        
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ';' : ',';
        
        const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            let rowCells = [];
            if (lines[i].includes('"')) {
                let cell = '';
                let inQuotes = false;
                for (let char of lines[i]) {
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === delimiter && !inQuotes) {
                        rowCells.push(cell.trim());
                        cell = '';
                    } else {
                        cell += char;
                    }
                }
                rowCells.push(cell.trim());
            } else {
                rowCells = lines[i].split(delimiter).map(c => c.trim());
            }
            
            const rowData = {};
            headers.forEach((header, idx) => {
                rowData[header] = rowCells[idx] || "";
            });
            rows.push(rowData);
        }
        return { headers, rows };
    };

    const findHeaderAlias = (headers, aliases) => {
        for (let alias of aliases) {
            const idx = headers.indexOf(alias);
            if (idx !== -1) return alias;
        }
        return null;
    };

    const processFile = (file) => {
        addLogLine(`[CARGADOR] Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, "text-gold");
        addLogLine(`[SISTEMA] Leyendo archivo de sensores...`);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            let telemetryData = [];

            if (file.name.endsWith('.json')) {
                try {
                    const json = JSON.parse(text);
                    telemetryData = Array.isArray(json) ? json : (json.data || json.values || []);
                } catch (err) {
                    addLogLine(`[ERROR] JSON malformado.`, "log-cargo");
                    return;
                }
            } else {
                const csv = parseCSV(text);
                if (!csv) {
                    addLogLine(`[ERROR] CSV vacío o malformado.`, "log-cargo");
                    return;
                }
                
                const { headers, rows } = csv;
                const vibKey = findHeaderAlias(headers, ["vibration", "vibracion", "vibracion_g", "vibration_g", "vib", "rms"]);
                const tempKey = findHeaderAlias(headers, ["temperature", "temperatura", "temperatura_c", "temp_c", "temp"]);
                const presKey = findHeaderAlias(headers, ["pressure", "presion", "pressure_bar", "presion_bar", "pres"]);
                const currKey = findHeaderAlias(headers, ["current", "corriente", "corriente_a", "current_a", "amp", "amps"]);
                const timeKey = findHeaderAlias(headers, ["timestamp", "tiempo", "time", "t"]);

                rows.forEach((row, idx) => {
                    telemetryData.push({
                        time: parseFloat(row[timeKey]) || (idx * 0.01),
                        vibration: parseFloat(row[vibKey]) || 0.0,
                        temperature: parseFloat(row[tempKey]) || 40.0,
                        pressure: parseFloat(row[presKey]) || 5.0,
                        current: parseFloat(row[currKey]) || 10.0
                    });
                });
            }

            if (telemetryData.length === 0) {
                addLogLine(`[ERROR] No se encontraron registros válidos.`, "log-cargo");
                return;
            }

            setTimeout(() => {
                addLogLine(`[OK] Archivo sanitizado. Procesando sintonización SFA...`);
                
                window.uploadedMotorData = telemetryData.slice(0, 120);

                let maxTemp = 0;
                let maxPres = 0;
                let maxCurr = 0;
                let rmsVib = 0;
                let vibSumSq = 0;

                telemetryData.forEach(r => {
                    if (r.temperature > maxTemp) maxTemp = r.temperature;
                    if (r.pressure > maxPres) maxPres = r.pressure;
                    if (r.current > maxCurr) maxCurr = r.current;
                    vibSumSq += (r.vibration * r.vibration);
                });
                rmsVib = Math.sqrt(vibSumSq / telemetryData.length);

                let healthVal = 98;
                if (rmsVib > 0.15) healthVal = 78;
                if (rmsVib > 0.25) healthVal = 62;
                if (maxTemp > 65) healthVal = Math.min(healthVal, 75);

                triggerMotorUpdate(
                    "20.00 Hz",
                    `${rmsVib.toFixed(3)} G`,
                    `${maxTemp.toFixed(1)} °C`,
                    `${maxPres.toFixed(2)} bar`,
                    `${maxCurr.toFixed(1)} A`,
                    `${healthVal}%`,
                    1.618
                );
            }, 500);
        };
        reader.readAsText(file);
    };

    const triggerMotorUpdate = (freq, vib, temp, pres, current, health, lambdaVal) => {
        document.getElementById('card-freq').textContent = freq;
        document.getElementById('card-vib').textContent = vib;
        document.getElementById('card-temp').textContent = temp;
        document.getElementById('card-pres').textContent = pres;
        document.getElementById('card-current').textContent = current;
        
        const badge = document.getElementById('lbl-health-badge');
        badge.textContent = `SALUD SFA: ${health}`;
        
        const healthPercent = parseInt(health);
        badge.className = "health-index-badge";
        if (healthPercent < 70) {
            badge.classList.add('danger');
            if (lblDiagnosticTxt) lblDiagnosticTxt.innerHTML = `⚠️ <b>FALLA MECÁNICA INMINENTE (${health})</b><br>La amplitud RMS de vibración supera los límites seguros del estator. Frecuencias armónicas desestabilizadas en el factor espectral. Se sugiere paro de emergencia.`;
            addLogLine(`[ALERTA COAXIAL] Estado crítico de vibración: ${vib}.`, "log-cargo");
        } else if (healthPercent < 90) {
            badge.classList.add('warning');
            if (lblDiagnosticTxt) lblDiagnosticTxt.innerHTML = `⚠️ <b>DIAGNÓSTICO: ADVERTENCIA (${health})</b><br>Se registra desalineación leve en el acoplamiento del motor. Desviación armónica menor a 7.25 Hz. Monitorear temperatura.`;
            addLogLine(`[ADVERTENCIA] Temperatura del rodamiento en aumento: ${temp}.`, "text-gold");
        } else {
            if (lblDiagnosticTxt) lblDiagnosticTxt.innerHTML = `✅ <b>DIAGNÓSTICO: NOMINAL (${health})</b><br>Todos los tags de telemetría de sensores operan dentro del rango de diseño óptimo. Señal espectral filtrada y limpia de ruidos PLC.`;
            addLogLine(`[OK] Sintonización armónica normal. Activos estables.`);
        }

        currentLambda = parseFloat(lambdaVal) || 1.618;
        document.getElementById('val-master-tune').textContent = currentLambda.toFixed(3);
        
        drawOscilloscope();
    };

    // Download SFA report
    if (btnDownloadReport) {
        btnDownloadReport.addEventListener('click', () => {
            if (window.SFA && typeof window.SFA.downloadReport === 'function') {
                window.SFA.downloadReport();
                addLogLine(`[SISTEMA] Reporte técnico SFA descargado por el usuario.`, "text-green");
            } else {
                addLogLine(`[ERROR] Motor SFA no inicializado para descargas.`, "log-cargo");
            }
        });
    }

    // Simulator
    if (btnSimMotor) {
        btnSimMotor.addEventListener('click', () => {
            addLogLine("[SIMULACIÓN] Cargando datos SCADA del motor de prueba...");
            window.uploadedMotorData = null; // reset to simulated values
            setTimeout(() => {
                triggerMotorUpdate(
                    "20.00 Hz",
                    "0.245 G",
                    "67.4 °C",
                    "0.40 bar",
                    "21.5 A",
                    "78%", // Health
                    1.418 // Lambda
                );
            }, 400);
        });
    }
});
