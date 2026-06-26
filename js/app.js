/**
 * Áurea Systems - Motor SFA (Sintonización Fractal de Armónicos)
 * Core Logic, Parser, Analysis, and Canvas Charting Module
 */

class SFAEngine {
    constructor() {
        this.data = null;
        this.results = null;
        this.lambda = 1.618; // Default to golden scale factor
        this.fBase = 7.25;    // Base frequency M (Hz)
        this.pressureUnit = 'bar';
        this.tempUnit = '°C';
        
        // UI Elements (to be initialized on DOMContentLoaded or bind)
        this.elements = {};
        this.translators = null;
    }

    /**
     * Process SFA calculations securely on the backend server
     */
    async processSfaOnServer(csvText, lambdaVal, offsetVal, profileKey = 'auto') {
        const payload = {
            csv_text: csvText,
            lambda_val: parseFloat(lambdaVal) || 1.618,
            offset_val: parseFloat(offsetVal) || 0.0,
            profile_key: profileKey
        };

        // Get configured server URL from localStorage
        const savedSource = localStorage.getItem("aurea_admin_source_type") || "api";
        const savedUrl = localStorage.getItem("aurea_admin_api_url") || "https://aurea-backend-eq8d.onrender.com/api/feedback";
        
        // Infer SFA processing URL from the feedback server address
        let serverUrl = 'https://aurea-backend-eq8d.onrender.com/api/procesar-sfa';
        if (savedSource === "local") {
            serverUrl = 'http://localhost:8000/api/procesar-sfa';
        } else if (savedUrl) {
            try {
                const urlObj = new URL(savedUrl);
                urlObj.pathname = urlObj.pathname.replace('/api/feedback', '/api/procesar-sfa');
                serverUrl = urlObj.toString();
            } catch (e) {
                serverUrl = 'https://aurea-backend.onrender.com/api/procesar-sfa';
            }
        }

        try {
            let sfaKey = 'sfa_key_dev_725_1618_active_precision';
            const storedLicense = localStorage.getItem('aurea_sfa_license');
            if (storedLicense) {
                try {
                    const license = JSON.parse(storedLicense);
                    if (license && license.txId) {
                        sfaKey = license.txId;
                    }
                } catch (e) {
                    console.error("Error parsing stored license key:", e);
                }
            }

            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-SFA-Key': sfaKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errDetail = await response.json();
                throw new Error(errDetail.detail || "Error en el servidor al procesar la señal.");
            }

            const data = await response.json();
            this.results = data.results;
            this.data = data.data;
            this.lambda = parseFloat(lambdaVal) || 1.618;
            this.offset = parseFloat(offsetVal) || 0.0;
            this.pressureUnit = data.results.pressureUnit || 'bar';
            this.tempUnit = data.results.tempUnit || '°C';
            
            return data.results;
        } catch (err) {
            console.error("API error during SFA processing:", err);
            throw new Error(`[ALERTA NÚCLEO] No se pudo procesar la telemetría en el servidor. Verifique que el servidor de telemetría SFA esté activo en ${serverUrl}. Detalle: ${err.message}`);
        }
    }

    /**
     * Generate simulated operational data with noise and harmonics
     */
    async generateMockData(type) {
        const dataList = [];
        const duration = 5.0; // 5 seconds
        const Fs = 100;       // Sample rate 100Hz
        const N = duration * Fs;
        
        let lambdaVal = 1.618;
        let baseVibAmplitude = 0.15;
        let noiseAmplitude = 0.08;
        let baseTemp = 42.5;
        let basePres = 6.2;
        let anomalyFreq = 0;
        let anomalyAmp = 0;
        let tempDrift = 0;
        let presFluct = 0.2;

        let vibrationScale = 1.0;

        if (type === 'optimal') {
            lambdaVal = 1.0;
            baseVibAmplitude = 0.05;
            noiseAmplitude = 0.02;
            baseTemp = 41.2;
            basePres = 6.0;
            presFluct = 0.1;
        } else if (type === 'misalignment') {
            lambdaVal = 1.618; // Golden scale
            baseVibAmplitude = 0.25;
            noiseAmplitude = 0.1;
            anomalyFreq = 7.25 * 1.618; // Resonance peak!
            anomalyAmp = 0.4;
            baseTemp = 63.8;
            tempDrift = 2.4;
            basePres = 5.8;
            presFluct = 0.6;
        } else if (type === 'critical') {
            lambdaVal = 2.15;
            baseVibAmplitude = 0.65;
            noiseAmplitude = 0.85; // Massive random noise
            anomalyFreq = 7.25 * 2.15;
            anomalyAmp = 1.25;
            baseTemp = 120.0;
            tempDrift = 25.0; // Winding temp reaches ~145 °C
            basePres = 65.0;
            presFluct = 7.0; // Discharge pressure reaches ~72 bar
            vibrationScale = 15.0; // Yields ~28.56 mm/s RMS
        }

        for (let i = 0; i < N; i++) {
            const t = i / Fs;
            
            // Raw sensor signal S(t) = base_vibe + anomaly + random_noise
            let vibVal = baseVibAmplitude * Math.sin(2 * Math.PI * 7.25 * t);
            if (anomalyFreq > 0) {
                vibVal += anomalyAmp * Math.sin(2 * Math.PI * anomalyFreq * t + 0.5);
            }
            vibVal += noiseAmplitude * (Math.sin(2 * Math.PI * 37.1 * t) * 0.3 + Math.sin(2 * Math.PI * 74.5 * t) * 0.2 + (Math.random() - 0.5) * 0.9);
            
            vibVal = vibVal * vibrationScale;

            const tempVal = baseTemp + tempDrift * (t / duration) + (Math.random() - 0.5) * 0.3;
            
            const presVal = basePres + Math.sin(2 * Math.PI * 0.8 * t) * presFluct + (Math.random() - 0.5) * 0.15;

            let baseCurrent = 12.0;
            let currentFluct = 0.3;
            if (type === 'optimal') {
                baseCurrent = 11.2;
                currentFluct = 0.15;
            } else if (type === 'misalignment') {
                baseCurrent = 16.5;
                currentFluct = 0.8;
            } else if (type === 'critical') {
                baseCurrent = 118.4;
                currentFluct = 4.0;
            }
            const currentVal = baseCurrent + Math.sin(2 * Math.PI * 0.5 * t) * currentFluct + (Math.random() - 0.5) * 0.2;

            dataList.push({
                time: parseFloat(t.toFixed(3)),
                vibration: parseFloat(vibVal.toFixed(4)),
                temperature: parseFloat(tempVal.toFixed(2)),
                pressure: parseFloat(presVal.toFixed(2)),
                current: parseFloat(currentVal.toFixed(2))
            });
        }

        // Convert to CSV to process securely on the server
        let csvText = "time,vibration,temperature,pressure,current\n";
        dataList.forEach(item => {
            csvText += `${item.time},${item.vibration},${item.temperature},${item.pressure},${item.current}\n`;
        });

        window.currentRawCSVText = csvText;
        await this.processSfaOnServer(csvText, lambdaVal, 0.0);
        return { data: this.data, results: this.results };
    }

    /**
     * Render the chart on the HTML5 Canvas
     */
    drawChart(canvasElement) {
        if (!canvasElement || !this.data || !this.results) return;

        const ctx = canvasElement.getContext('2d');
        let parentWidth = canvasElement.parentElement ? canvasElement.parentElement.clientWidth : 0;
        if (parentWidth < 100) {
            parentWidth = 800; // Fallback width for printing layout
        }
        const width = canvasElement.width = parentWidth;
        const height = canvasElement.height = 280; // fixed height

        // Clear canvas or fill with white for printing
        if (this.isPrinting) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height);
        }

        // Drawing settings
        const padding = { top: 30, right: 30, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Draw background grid lines
        ctx.strokeStyle = this.isPrinting ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridCols = 8;
        const gridRows = 4;
        
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

        // Find min/max values for scaling
        const tMin = this.data[0].time;
        const tMax = this.data[this.data.length - 1].time;
        
        let vMin = Infinity;
        let vMax = -Infinity;
        this.data.forEach((d, idx) => {
            if (d.vibration < vMin) vMin = d.vibration;
            if (d.vibration > vMax) vMax = d.vibration;
            const pure = (this.results.purifiedSignal && this.results.purifiedSignal.length > idx) ? this.results.purifiedSignal[idx] : d.vibration;
            if (pure < vMin) vMin = pure;
            if (pure > vMax) vMax = pure;
        });

        // Add 10% padding to y-axis limits, safeguarding division by zero if vMax == vMin
        let yRange = vMax - vMin;
        if (yRange === 0) {
            vMin = vMin - 1.0;
            vMax = vMax + 1.0;
            yRange = 2.0;
        } else {
            vMin -= yRange * 0.1;
            vMax += yRange * 0.1;
        }

        // Scale functions (safeguard division by zero on time)
        const tRange = (tMax - tMin) || 1.0;
        const scaleX = (t) => padding.left + ((t - tMin) / tRange) * chartWidth;
        const scaleY = (v) => padding.top + chartHeight - ((v - vMin) / (vMax - vMin)) * chartHeight;

        // Determinar colores del gráfico dinámicamente según la severidad del diagnóstico
        let strokeColor = '#06b6d4'; // Azul turquesa por defecto (positivo / healthy)
        let shadowColor = 'rgba(6, 182, 212, 0.65)';
        let rawStrokeColor = 'rgba(6, 182, 212, 0.45)'; // Mayor opacidad (era 0.25)

        if (this.isPrinting) {
            strokeColor = '#0284c7';
            shadowColor = 'transparent';
            rawStrokeColor = 'rgba(2, 132, 199, 0.25)';
            if (this.results.severityClass === 'danger') {
                strokeColor = '#dc2626';
                rawStrokeColor = 'rgba(185, 28, 28, 0.25)';
            } else if (this.results.severityClass === 'warning') {
                strokeColor = '#ea580c';
                rawStrokeColor = 'rgba(217, 119, 6, 0.25)';
            }
        } else {
            if (this.results.severityClass === 'danger') {
                strokeColor = '#ef4444'; // Rojo (crítico / danger)
                shadowColor = 'rgba(239, 68, 68, 0.65)';
                rawStrokeColor = 'rgba(239, 68, 68, 0.5)'; // Mayor opacidad (era 0.25)
            } else if (this.results.severityClass === 'warning') {
                strokeColor = '#f97316'; // Naranja (medio / warning)
                shadowColor = 'rgba(249, 115, 22, 0.65)';
                rawStrokeColor = 'rgba(249, 115, 22, 0.45)'; // Mayor opacidad (era 0.25)
            }
        }

        // 1. Draw Raw Signal (S(t)) in muted color with clear visibility
        ctx.beginPath();
        ctx.strokeStyle = rawStrokeColor;
        ctx.lineWidth = 1.6; // Mayor espesor (era 1.2)
        this.data.forEach((d, idx) => {
            const x = scaleX(d.time);
            const y = scaleY(d.vibration);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 2. Draw SFA Purified Harmonic Signal (Ψ_SFA(t)) in thick glowing representing color
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.8;
        if (!this.isPrinting) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = 8;
        }
        this.data.forEach((d, idx) => {
            const t = d.time;
            const val = this.results.purifiedSignal[idx];
            const x = scaleX(t);
            const y = scaleY(val);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow

        // Draw Axes Labels
        ctx.fillStyle = this.isPrinting ? '#333333' : '#8f9bb3'; // Text gray
        ctx.font = '500 0.68rem Inter';
        ctx.textAlign = 'right';
        ctx.fillText(vMax.toFixed(2) + ' mm/s', padding.left - 10, padding.top + 5);
        ctx.fillText(((vMax + vMin) / 2).toFixed(2) + ' mm/s', padding.left - 10, padding.top + chartHeight / 2 + 3);
        ctx.fillText(vMin.toFixed(2) + ' mm/s', padding.left - 10, padding.top + chartHeight);

        ctx.textAlign = 'center';
        ctx.fillText(tMin.toFixed(1) + ' s', padding.left, padding.top + chartHeight + 20);
        ctx.fillText(((tMax + tMin) / 2).toFixed(1) + ' s', padding.left + chartWidth / 2, padding.top + chartHeight + 20);
        ctx.fillText(tMax.toFixed(1) + ' s', padding.left + chartWidth, padding.top + chartHeight + 20);

        // Chart Title (Legend)
        ctx.textAlign = 'left';
        ctx.font = '500 0.72rem Outfit';
        ctx.fillStyle = this.isPrinting ? 'rgba(0, 0, 0, 0.5)' : rawStrokeColor.replace('0.25', '0.8'); // Mismo tono pero más opaco para texto
        ctx.fillText('• Señal Cruda PLC S(t)', padding.left, padding.top - 12);
        
        ctx.fillStyle = strokeColor;
        const targetFreqText = this.results.targetFreq.toFixed(2) + ' Hz';
        ctx.fillText('• Señal Sintonizada Espectral Ψ SFA (t) [' + targetFreqText + ' | f_base × ' + this.lambda.toFixed(3) + ']', padding.left + 160, padding.top - 12);
    }

    /**
     * Generate text certificate of diagnosis to download
     */
    generateReportText() {
        if (!this.results) return '';

        const s = this.results.stats;
        const dateObj = new Date(this.results.dateAnalyzed);
        
        // Formato de fecha y hora local
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const fechaStr = `${dd}/${mm}/${yyyy}`;
        const horaStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Código de documento autogenerado
        const docCode = `SFA-${yyyy}-${mm}${dd}-${Math.floor(100 + Math.random() * 900)}`;

        // Determinar emoji y estatus de salud
        let healthEmoji = '🟢';
        let healthText = 'ÓPTIMO - OPERACIÓN NOMINAL';
        if (this.results.severityClass === 'danger') {
            healthEmoji = '🔴';
            healthText = 'CRÍTICO - RIESGO DE FALLA INMINENTE';
        } else if (this.results.severityClass === 'warning') {
            healthEmoji = '🟡';
            healthText = 'ADVERTENCIA - REQUIERE INSPECCIÓN';
        }

        // Mapear variables para la tabla de forma dinámica
        const rows = [];
        const padRight = (str, len) => str.toString().padEnd(len, ' ');
        const limits = this.results.limits || {};
        const varsPresent = this.results.variables_present || {
            vibration: true,
            temperature: true,
            pressure: this.results.hasPressure,
            current: true
        };

        // 1. Vibración
        if (varsPresent.vibration) {
            const vibVal = s.rmsVib;
            const vibLimit = limits.warningVib || 4.5;
            const dangerVibLimit = limits.dangerVib || 7.1;
            let vibCond = '🟢 Óptimo';
            if (vibVal > dangerVibLimit) {
                vibCond = '❌ Crítico (Vibración Destructiva)';
            } else if (vibVal > vibLimit) {
                vibCond = '⚠️ Advertencia (Desalineación/Desbalance)';
            }
            rows.push(`${padRight("Vibración Promedio (RMS)", 25)}| ${padRight(vibVal.toFixed(3) + " mm/s", 19)}| ${padRight(vibLimit.toFixed(2) + " mm/s", 14)}| ${vibCond}`);
        }

        // 2. Temperatura
        if (varsPresent.temperature) {
            const isFahrenheit = (this.results.tempUnit || '°C').includes('F');
            const warningTemp = limits.warningTemp || 75.0;
            const tempLimit = isFahrenheit ? (warningTemp * 1.8 + 32.0) : warningTemp;
            const tempVal = s.maxTempRaw || s.maxTemp || 0.0;
            const tempDiff = tempVal - tempLimit;
            let tempCond = '🟢 Óptimo';
            if (tempDiff > 0) {
                tempCond = `❌ Excedido (+${tempDiff.toFixed(1)} ${this.results.tempUnit || '°C'})`;
            }
            rows.push(`${padRight("Temperatura Máxima", 25)}| ${padRight(tempVal.toFixed(1) + " " + (this.results.tempUnit || '°C'), 19)}| ${padRight(tempLimit.toFixed(1) + " " + (this.results.tempUnit || '°C'), 14)}| ${tempCond}`);
        }

        // 3. Presión
        if (varsPresent.pressure) {
            const presDiffBar = s.maxPres - s.minPres;
            const presLimitVal = 1.5;
            const limitStr = '< 1.50 bar';
            let presCond = '🟢 Óptimo';
            if (presDiffBar > presLimitVal) {
                presCond = '❌ Inestable (Fluctuación Alta)';
            }
            let presDisplayStr = `${presDiffBar.toFixed(2)} bar`;
            if (this.results.pressureUnit && this.results.pressureUnit.toLowerCase() !== 'bar') {
                const rawDiff = s.maxPresRaw - s.minPresRaw;
                presDisplayStr = `${presDiffBar.toFixed(2)} bar (${rawDiff.toFixed(2)} ${this.results.pressureUnit})`;
            }
            rows.push(`${padRight("Fluctuación de Presión", 25)}| ${padRight(presDisplayStr, 19)}| ${padRight(limitStr, 14)}| ${presCond}`);
        }

        // 4. Consumo Eléctrico
        if (varsPresent.current) {
            const currentVal = s.maxCurrentRaw || s.maxCurrent || 0.0;
            const currentLimit = limits.warningCurrent || 35.0;
            const dangerCurrentLimit = limits.dangerCurrent || 50.0;
            const currentDiff = currentVal - currentLimit;
            let currentCond = '🟢 Óptimo';
            if (currentVal > dangerCurrentLimit) {
                currentCond = `❌ Sobrecarga (+${currentDiff.toFixed(1)} A)`;
            } else if (currentVal > currentLimit) {
                currentCond = '⚠️ Advertencia (Consumo Elevado)';
            }
            rows.push(`${padRight("Consumo Eléctrico", 25)}| ${padRight(currentVal.toFixed(1) + " A", 19)}| ${padRight(currentLimit.toFixed(1) + " A", 14)}| ${currentCond}`);
        }

        // 5. RPM
        if (varsPresent.rpm) {
            const rpmVal = s.maxRpm || s.avgRpm || 0.0;
            const rpmLimit = limits.warningRpm || 1000.0;
            const dangerRpmLimit = limits.dangerRpm || 1500.0;
            let rpmCond = '🟢 Óptimo';
            if (rpmVal > dangerRpmLimit) {
                rpmCond = '❌ Sobrevelocidad Crítica';
            } else if (rpmVal > rpmLimit) {
                rpmCond = '⚠️ Advertencia (Velocidad Elevada)';
            }
            rows.push(`${padRight("Velocidad de Rotación", 25)}| ${padRight(rpmVal.toFixed(0) + " RPM", 19)}| ${padRight(rpmLimit.toFixed(0) + " RPM", 14)}| ${rpmCond}`);
        }

        // 6. Torque
        if (varsPresent.torque) {
            const torqueVal = s.maxTorque || s.avgTorque || 0.0;
            const torqueLimit = limits.warningTorque || 30.0;
            const dangerTorqueLimit = limits.dangerTorque || 50.0;
            let torqueCond = '🟢 Óptimo';
            if (torqueVal > dangerTorqueLimit) {
                torqueCond = '❌ Sobretorque Crítico';
            } else if (torqueVal > torqueLimit) {
                torqueCond = '⚠️ Advertencia (Esfuerzo Elevado)';
            }
            rows.push(`${padRight("Torque del Husillo", 25)}| ${padRight(torqueVal.toFixed(1) + " Nm", 19)}| ${padRight(torqueLimit.toFixed(1) + " Nm", 14)}| ${torqueCond}`);
        }

        // 7. Tool Wear
        if (varsPresent.tool_wear) {
            const wearVal = s.maxWear || s.avgWear || 0.0;
            const wearLimit = limits.warningWear || 100.0;
            const dangerWearLimit = limits.dangerWear || 200.0;
            let wearCond = '🟢 Óptimo';
            if (wearVal > dangerWearLimit) {
                wearCond = '❌ Reemplazo Herramienta';
            } else if (wearVal > wearLimit) {
                wearCond = '⚠️ Advertencia (Desgaste Avanzado)';
            }
            rows.push(`${padRight("Desgaste Herramienta", 25)}| ${padRight(wearVal.toFixed(1) + " min", 19)}| ${padRight(wearLimit.toFixed(1) + " min", 14)}| ${wearCond}`);
        }

        // 8. Flow
        if (varsPresent.flow) {
            const flowVal = s.maxFlow || s.avgFlow || 0.0;
            const flowLimit = limits.warningFlow || 50.0;
            const dangerFlowLimit = limits.dangerFlow || 80.0;
            let flowCond = '🟢 Óptimo';
            if (flowVal > dangerFlowLimit) {
                flowCond = '❌ Caudal Crítico / Fuga';
            } else if (flowVal > flowLimit) {
                flowCond = '⚠️ Advertencia (Caudal Inestable)';
            }
            rows.push(`${padRight("Flujo / Caudal", 25)}| ${padRight(flowVal.toFixed(1) + " LPM", 19)}| ${padRight(flowLimit.toFixed(1) + " LPM", 14)}| ${flowCond}`);
        }

        // 9. Level
        if (varsPresent.level) {
            const levelVal = s.maxLevel || s.avgLevel || 0.0;
            const levelLimit = limits.warningLevel || 80.0;
            const dangerLevelLimit = limits.dangerLevel || 95.0;
            let levelCond = '🟢 Óptimo';
            if (levelVal > dangerLevelLimit) {
                levelCond = '❌ Nivel Alto Crítico';
            } else if (levelVal > levelLimit) {
                levelCond = '⚠️ Advertencia (Nivel Alto)';
            }
            rows.push(`${padRight("Nivel de Fluido", 25)}| ${padRight(levelVal.toFixed(1) + " %", 19)}| ${padRight(levelLimit.toFixed(1) + " %", 14)}| ${levelCond}`);
        }

        // 10. Voltage
        if (varsPresent.voltage) {
            const voltageVal = s.maxVoltage || s.avgVoltage || 0.0;
            const voltageLimit = limits.warningVoltage || 240.0;
            const dangerVoltageLimit = limits.dangerVoltage || 480.0;
            let voltageCond = '🟢 Óptimo';
            if (voltageVal > dangerVoltageLimit) {
                voltageCond = '❌ Sobretensión Crítica';
            } else if (voltageVal > voltageLimit) {
                voltageCond = '⚠️ Advertencia (Voltaje Inestable)';
            }
            rows.push(`${padRight("Voltaje de Bus", 25)}| ${padRight(voltageVal.toFixed(1) + " V", 19)}| ${padRight(voltageLimit.toFixed(1) + " V", 14)}| ${voltageCond}`);
        }

        // 11. Frecuencia de Sintonía
        const rowFreq = `${padRight("Frecuencia de Sintonía", 25)}| ${padRight(this.results.targetFreq.toFixed(2) + " Hz", 19)}| ${padRight("f_base x λ", 14)}| ${this.results.targetFreq !== this.fBase ? '⚠️ Desviación Espectral' : '🟢 Sintonía Base'}`;
        rows.push(rowFreq);

        // Información de licencia si existe
        let licenseSection = '';
        if (this.license) {
            const isPromo = this.license.plan.includes("Promocional");
            licenseSection = `
--------------------------------------------------------------------------
INFORMACIÓN DE LICENCIA Y AUDITORÍA COMERCIAL:
  - Plan de Análisis : ${this.license.plan.toUpperCase()}
  - Costo de Licencia: $${this.license.price} USD ${isPromo ? '(PROMOCIÓN)' : ''}
  - ID Transacción   : ${this.license.txId}
  - Estado del Pago  : ${isPromo ? 'VERIFICADO / BENEFICIO GRATUITO' : 'COMPLETADO Y VERIFICADO POR PAYPAL'}
--------------------------------------------------------------------------`;
        }

        return `📄 INFORME DE DIAGNÓSTICO INDUSTRIAL — ÁUREA SYSTEMS
DEPARTAMENTO DE CONFIABILIDAD DE ACTIVOS
Reporte de Diagnóstico Espectral SFA
Código de Documento: ${docCode} | Fecha de Emisión: ${fechaStr} | Hora: ${horaStr}
==========================================================================

1. RESUMEN EJECUTIVO (Para el Ingeniero Senior)
Activo Evaluado   : ${window.currentDataSourceName || "Log de Telemetría PLC"}
Estatus del Núcleo: Calibrado (Sintonía Fractal Activa - λ = ${this.lambda.toFixed(3)})
ÍNDICE DE SALUD   : ${healthEmoji} ${this.results.healthScore}% (${healthText})

Dictamen Técnico:
${this.results.diagnosis}

2. COMPORTAMIENTO DE VARIABLES CRÍTICAS
Variable Evaluada        | Valor Máximo / RMS | Límite Seguro | Condición
-------------------------|--------------------|---------------|----------------------------------
${rows.join('\n')}

3. ANÁLISIS ESPECTRAL Y FILTRADO FRACTAL
Análisis de Transductores:
El motor matemático detectó fluctuaciones dinámicas en el conjunto de señales. La amplitud máxima registrada en el armónico objetivo es de ${this.results.amp.toFixed(4)} mm/s con un desfase de fase angular de ${this.results.phase.toFixed(4)} rad.

Eficacia del Filtro:
Se aplicó un filtro digital pasa-bajas IIR de primer orden para atenuar el ruido eléctrico de alta frecuencia del PLC. Posteriormente, el algoritmo de la Ecuación Fractal \u03a8_SFA(t) = \u222b S(t) \u2022 e^(-i \u2022 (f_base \u2022 \u03bb) \u2022 t) dt aisló con éxito el armónico objetivo. La señal sintonizada es estable, diferenciando desviaciones transitorias de fallas mecánicas reales.

4. DIAGNÓSTICO AUTOMATIZADO SFA
Evidencia Mecánica:
${this.results.severityClass === 'danger' ? 'Ruido estructural severo detectado en la banda fractal. Inestabilidad geométrica del flujo.' : (this.results.severityClass === 'warning' ? 'Micro-oscilación cíclica detectada bajo límites de seguridad.' : 'Comportamiento vibratorio y térmico dentro del perfil nominal óptimo.')}

Causas Probables identificadas por el motor de diagnóstico:
- Cavitación hidráulica o fluctuación inestable del flujo de salida.
- Desalineación o desgaste de rodamientos en acoplamientos del rotor.
- Ruido eléctrico transitorio o pérdida de apantallamiento en sensores analógicos de PLC.

5. ACCIONES DE MANTENIMIENTO RECOMENDADAS (Plan de Acción)
${this.results.recommendations.map((rec, i) => `${i + 1}. [ ] ${rec}`).join('\n')}
${licenseSection}

FIRMAS DE RESPONSABILIDAD

 [   Generado por Sistema SFA   ]          [                              ]
    Algoritmo Áurea Systems                    Ingeniero de Campo (Subió datos)
    
                                       [                              ]
                                              Ingeniero Senior (Aprobación)
==========================================================================`;
    }

    /**
     * Download the text certificate
     */
    downloadReport() {
        const text = this.generateReportText();
        if (!text) return;

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const element = document.createElement('a');
        element.href = URL.createObjectURL(blob);
        element.download = `aurea_sfa_diagnostic_report_${Date.now()}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    /**
     * Draw the health degradation trend and projection chart
     */
    drawDegradationChart(canvasElement) {
        if (!canvasElement || !this.results) return;
        
        const ctx = canvasElement.getContext('2d');
        let parentWidth = canvasElement.parentElement ? canvasElement.parentElement.clientWidth : 0;
        if (parentWidth < 100) {
            parentWidth = 800; // Fallback width for printing layout
        }
        const width = canvasElement.width = parentWidth;
        const height = canvasElement.height = 280;
        
        // Clear canvas or fill with white for printing
        if (this.isPrinting) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height);
        }
        
        const padding = { top: 35, right: 40, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        // Grid
        ctx.strokeStyle = this.isPrinting ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridCols = 10;
        const gridRows = 4;
        
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
        
        // 60% Critical Threshold line
        const y60 = padding.top + chartHeight - (0.60 * chartHeight);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y60);
        ctx.lineTo(padding.left + chartWidth, y60);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = '9px monospace';
        ctx.fillText('UMBRAL CRÍTICO (60%)', padding.left + 10, y60 - 5);
        
        const xRangeMin = -20;
        const xRangeMax = 30;
        const scaleX = (day) => padding.left + ((day - xRangeMin) / (xRangeMax - xRangeMin)) * chartWidth;
        const scaleY = (health) => padding.top + chartHeight - (health / 100) * chartHeight;
        
        const currentHealth = this.results.healthScore;
        const startHealth = Math.max(98, currentHealth);
        const historyPoints = [];
        const numHistoryDays = 20;
        
        for (let d = -20; d <= 0; d++) {
            const t = (d - xRangeMin) / numHistoryDays;
            let h = startHealth - (startHealth - currentHealth) * t;
            if (d < 0) {
                h += Math.sin(d * 0.8) * 0.5;
            }
            h = Math.max(5, Math.min(100, h));
            historyPoints.push({ day: d, health: h });
        }
        
        // Draw historical curve (cyan)
        ctx.strokeStyle = this.isPrinting ? '#0284c7' : '#06b6d4';
        ctx.lineWidth = 3;
        if (!this.isPrinting) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
        }
        ctx.beginPath();
        historyPoints.forEach((p, idx) => {
            const cx = scaleX(p.day);
            const cy = scaleY(p.health);
            if (idx === 0) {
                ctx.moveTo(cx, cy);
            } else {
                ctx.lineTo(cx, cy);
            }
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = this.isPrinting ? 'rgba(2, 132, 199, 0.06)' : 'rgba(6, 182, 212, 0.05)';
        ctx.beginPath();
        ctx.moveTo(scaleX(-20), scaleY(0));
        historyPoints.forEach((p) => {
            ctx.lineTo(scaleX(p.day), scaleY(p.health));
        });
        ctx.lineTo(scaleX(0), scaleY(0));
        ctx.closePath();
        ctx.fill();
        
        // Projection calculation
        let rate = (startHealth - currentHealth) / 20;
        if (rate <= 0.05) rate = 0.05;
        
        const projectionPoints = [];
        for (let d = 0; d <= 30; d++) {
            const h = Math.max(5, currentHealth - rate * d);
            projectionPoints.push({ day: d, health: h });
        }
        
        // Draw projection curve (amber dotted)
        ctx.strokeStyle = this.isPrinting ? '#d97706' : '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        projectionPoints.forEach((p, idx) => {
            const cx = scaleX(p.day);
            const cy = scaleY(p.health);
            if (idx === 0) {
                ctx.moveTo(cx, cy);
            } else {
                ctx.lineTo(cx, cy);
            }
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Intersection point with 60%
        let crossDay = (currentHealth - 60) / rate;
        if (currentHealth > 60 && crossDay > 0 && crossDay <= 30) {
            const cx = scaleX(crossDay);
            const cy = scaleY(60);
            
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, padding.top + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Día +${Math.round(crossDay)} (Umbral)`, cx, cy - 12);
        }
        
        // Today marker
        const todayX = scaleX(0);
        const todayY = scaleY(currentHealth);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(todayX, todayY, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = this.isPrinting ? '#0284c7' : '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(todayX, todayY, 5, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Axis Labels
        ctx.fillStyle = this.isPrinting ? '#333333' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        [-20, -10, 0, 10, 20, 30].forEach(day => {
            const label = day === 0 ? 'HOY' : (day > 0 ? `+${day}d` : `${day}d`);
            ctx.fillText(label, scaleX(day), padding.top + chartHeight + 15);
        });
        
        ctx.textAlign = 'right';
        [0, 20, 40, 60, 80, 100].forEach(h => {
            ctx.fillText(`${h}%`, padding.left - 8, scaleY(h) + 3);
        });
        
        ctx.fillStyle = this.isPrinting ? '#000000' : 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px var(--font-accent)';
        ctx.textAlign = 'left';
        ctx.fillText('Tendencia y Proyección a 30 días del Índice de Salud SFA', padding.left, padding.top - 12);
    }
}

window.SFA = new SFAEngine();

document.addEventListener('DOMContentLoaded', () => {
    // Multi-Step Workflow Navigation helper
    const showStep = (stepNum) => {
        const step1 = document.getElementById('sfa-step-1-upload');
        const step2 = document.getElementById('sfa-step-2-processing');
        const step3 = document.getElementById('sfa-step-3-results');
        
        if (step1) step1.style.display = stepNum === 1 ? 'block' : 'none';
        if (step2) step2.style.display = stepNum === 2 ? 'block' : 'none';
        if (step3) step3.style.display = stepNum === 3 ? 'block' : 'none';
    };

    // Canvas Animation Loop for Step 2: "Purificación Geométrica"
    const runPurificationAnimation = (onComplete) => {
        const canvas = document.getElementById('purification-canvas');
        if (!canvas) {
            onComplete();
            return;
        }
        const ctx = canvas.getContext('2d');
        const fill = document.getElementById('processing-progress-fill');
        const percentText = document.getElementById('processing-progress-percentage');
        const logBox = document.getElementById('processing-status-log');
        
        if (logBox) logBox.innerHTML = '';
        
        const logs = [
            { time: 0, text: "[INICIALIZACIÓN] Cargando motor espectral SFA..." },
            { time: 400, text: "[CONEXIÓN] Mapeando registros de telemetría de planta..." },
            { time: 800, text: "[PROCESANDO] Correlacionando consumo de corriente y fricción mecánica..." },
            { time: 1300, text: "[FRACTAL] Calculando factor de escala fractal y dimensionamiento..." },
            { time: 1700, text: "[PURIFICACIÓN] Ejecutando filtro pasa-bajas IIR en aceleración RMS..." },
            { time: 2200, text: "[INTEGRIDAD] Diagnóstico completado con éxito. Desplegando resultados..." }
        ];

        const addLogLine = (text) => {
            if (!logBox) return;
            const line = document.createElement('div');
            line.className = 'status-log-line';
            line.style.opacity = '0.9';
            line.style.animation = 'fadeInStep 0.2s ease-out';
            line.innerHTML = `<span style="color: #6366f1; margin-right: 0.5rem;">[SFA CORE]</span>${text}`;
            logBox.appendChild(line);
            logBox.scrollTop = logBox.scrollHeight;
        };

        let startTime = null;
        const duration = 2500; // 2.5 seconds

        const drawWave = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const pct = Math.round(progress * 100);
            if (fill) fill.style.width = `${pct}%`;
            if (percentText) percentText.textContent = `${pct}%`;
            
            logs.forEach(log => {
                if (elapsed >= log.time && !log.printed) {
                    addLogLine(log.text);
                    log.printed = true;
                }
            });

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const scanX = progress * width;

            // 1. Draw SFA Spectrum Analyzer Bars (Option 3)
            const numBars = 36;
            for (let i = 0; i < numBars; i++) {
                const barX = (i / (numBars - 1)) * width;
                let barProgress = (barX < scanX) ? 1.0 : progress;
                let heightVal = 2; // Noise floor height

                if (i === 18) {
                    // Central 7.25 Hz peak (index 18 is the center)
                    heightVal = 32 + Math.sin(timestamp / 90) * 4;
                } else {
                    // Secondary frequencies that fade away when scanned
                    let maxNoiseH = 15 + Math.cos(timestamp / 50 + i) * 10;
                    heightVal = 2 + (1.0 - barProgress) * maxNoiseH + Math.sin(timestamp / 70 + i) * 2;
                    if (heightVal < 2) heightVal = 2;
                }

                ctx.fillStyle = (i === 18) ? 'rgba(197, 168, 128, 0.45)' : 'rgba(139, 92, 246, 0.15)'; // Gold for peak, purple for secondary
                ctx.fillRect(barX - 1.5, height - heightVal - 8, 3, heightVal);
            }

            // 2. Draw Golden Particle Fibonacci Spiral (Option 2)
            const spiralAngle = timestamp / 1600;
            ctx.fillStyle = 'rgba(197, 168, 128, 0.3)';
            for (let theta = 0; theta < Math.PI * 6.5; theta += 0.16) {
                const r = 3.5 * Math.exp(0.12 * theta);
                if (r > width / 2.5) break;
                const px = centerX + Math.cos(theta + spiralAngle) * r;
                const py = centerY + Math.sin(theta + spiralAngle) * r;
                ctx.beginPath();
                ctx.arc(px, py, 1.1, 0, Math.PI * 2);
                ctx.fill();
            }

            // Inward-flowing telemetry data particles
            ctx.fillStyle = 'rgba(212, 175, 55, 0.55)'; // Amber/Gold glowing particles
            for (let i = 0; i < 20; i++) {
                const angle = (i * 137.5) * Math.PI / 180;
                const travel = (timestamp / 1800 + i / 20) % 1.0; // Inward flow coefficient (0 to 1)
                const dist = (1.0 - travel) * (width * 0.4);
                const px = centerX + Math.cos(angle + timestamp / 1200) * dist;
                const py = centerY + Math.sin(angle + timestamp / 1200) * dist;
                ctx.beginPath();
                ctx.arc(px, py, 1.6 * (1.0 - travel) + 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // 3. Draw Scanner Sweep Line (Option 3)
            ctx.strokeStyle = 'rgba(197, 168, 128, 0.65)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(scanX, 8);
            ctx.lineTo(scanX, height - 8);
            ctx.stroke();

            // Sweep line gradient glow
            const scanGlow = ctx.createLinearGradient(scanX - 10, 0, scanX + 10, 0);
            scanGlow.addColorStop(0, 'rgba(197, 168, 128, 0)');
            scanGlow.addColorStop(0.5, 'rgba(197, 168, 128, 0.22)');
            scanGlow.addColorStop(1, 'rgba(197, 168, 128, 0)');
            ctx.fillStyle = scanGlow;
            ctx.fillRect(scanX - 10, 8, 20, height - 16);

            // 4. Draw Purifying Wave (Option 1)
            ctx.beginPath();
            ctx.lineWidth = 3.0;

            for (let x = 0; x < width; x++) {
                const t = x / 48;
                let y = Math.sin(t * 1.5 + (timestamp / 120)) * 36; // Pure fundamental SFA sine wave

                // Smooth local transition near the scanner sweep line
                const distToScan = x - scanX;
                const transitionWidth = 32;
                let localProgress = progress;

                if (distToScan < 0) {
                    const blendFactor = Math.min(1.0, -distToScan / transitionWidth);
                    localProgress = progress + (1.0 - progress) * blendFactor;
                }

                const noiseLevel = (1.0 - localProgress) * 26;
                const noise = (Math.sin(t * 32 + (timestamp / 16)) * 0.55 + Math.cos(t * 64) * 0.35 + (Math.random() - 0.5) * 0.3) * noiseLevel;
                y += noise;

                if (x === 0) {
                    ctx.moveTo(x, centerY + y);
                } else {
                    ctx.lineTo(x, centerY + y);
                }
            }

            // Dynamic color transition from Gold/Amber to Emerald Green near completion
            const r = Math.round(197 + (16 - 197) * progress);
            const g = Math.round(168 + (185 - 168) * progress);
            const b = Math.round(128 + (129 - 128) * progress);
            
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.55)`;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Faint baseline reference
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            if (progress < 1) {
                requestAnimationFrame(drawWave);
            } else {
                setTimeout(onComplete, 200);
            }
        };
        
        requestAnimationFrame(drawWave);
    };

    // Fetch translators.json for Aurea Systems Telemetry Translator (Fricción Cero)
    fetch('translators.json')
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar la configuración de traductores.");
            return response.json();
        })
        .then(data => {
            if (window.SFA) {
                window.SFA.translators = data;
                console.log("[OK] Traductores de PLC cargados:", Object.keys(data));
            }
        })
        .catch(err => {
            console.error("[ERROR] Cargando traductores:", err);
        });

    // Helper to log messages to the virtual telemetry console
    const logToConsole = (text, colorClass = '') => {
        const logContent = document.getElementById('console-log-content');
        if (!logContent) return;
        
        const line = document.createElement('div');
        line.className = 'log-line';
        if (colorClass) line.classList.add(colorClass); // e.g. text-gold, text-blue
        
        const timestamp = new Date().toLocaleTimeString();
        line.innerHTML = `<span style="opacity: 0.5; margin-right: 0.5rem;">[${timestamp}]</span>${text}`;
        logContent.appendChild(line);
        logContent.scrollTop = logContent.scrollHeight;
    };

    const openConsole = () => {
        const telemetryConsole = document.getElementById('telemetry-console');
        if (telemetryConsole && !telemetryConsole.classList.contains('active')) {
            telemetryConsole.classList.add('active');
            
            // Trigger animation on existing static logs if opening first time
            const lines = telemetryConsole.querySelectorAll('.log-line');
            lines.forEach((line, index) => {
                line.style.opacity = '0';
                line.style.transform = 'translateX(-10px)';
                line.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                setTimeout(() => {
                    line.style.opacity = '1';
                    line.style.transform = 'translateX(0)';
                }, index * 100);
            });
        }
    };

    const runTelemetryLogs = (fileName, fileSize, profileName, recordCount, avgCurrent, finalHealthScore) => {
        openConsole();
        logToConsole("--------------------------------------------------", "text-blue");
        logToConsole(`[CARGA] Procesando archivo '${fileName}' (${(fileSize / 1024).toFixed(1)} KB)...`, "text-gold");
        
        setTimeout(() => {
            logToConsole(`[TRADUCTOR] Analizando afinidad de cabeceras en columnas...`, "");
        }, 300);
        
        setTimeout(() => {
            logToConsole(`[TRADUCTOR] Perfil detectado con éxito: ${profileName}.`, "text-blue");
        }, 600);
        
        setTimeout(() => {
            logToConsole(`[NORMALIZACIÓN] Traduciendo variables a la estructura interna SFA...`, "");
        }, 900);
        
        setTimeout(() => {
            logToConsole(`[NORMALIZACIÓN] ${recordCount} registros normalizados con éxito.`, "text-green");
        }, 1200);
        
        setTimeout(() => {
            logToConsole(`[PROCESANDO] Ejecutando filtro digital pasa-bajas IIR a 15.2 Hz...`, "text-gold");
        }, 1500);
        
        setTimeout(() => {
            logToConsole(`[CORRELACIÓN] Corriente eléctrica promedio: ${avgCurrent.toFixed(1)} A.`, avgCurrent > 12 ? "text-orange" : "text-blue");
        }, 1800);
        
        setTimeout(() => {
            logToConsole(`[OK] Diagnóstico SFA completado. Índice de Salud final: ${finalHealthScore}%.`, finalHealthScore < 60 ? "text-red" : (finalHealthScore < 85 ? "text-orange" : "text-green"));
        }, 2100);
    };

    const runSimulationLogs = (simName, recordCount, avgCurrent, finalHealthScore) => {
        openConsole();
        logToConsole("--------------------------------------------------", "text-blue");
        logToConsole(`[SIMULACIÓN] Iniciando perfil: '${simName}'`, "text-gold");
        
        setTimeout(() => {
            logToConsole(`[GENERADOR] Inyectando ${recordCount} registros de telemetría a 100 Hz...`, "");
        }, 400);
        
        setTimeout(() => {
            logToConsole(`[PROCESANDO] Ejecutando filtrado de ruido y transformadas fractales...`, "text-gold");
        }, 800);
        
        setTimeout(() => {
            logToConsole(`[CORRELACIÓN] Corriente promedio medida: ${avgCurrent.toFixed(1)} A.`, avgCurrent > 12 ? "text-orange" : "text-blue");
        }, 1200);
        
        setTimeout(() => {
            logToConsole(`[OK] Simulación completada. Índice de Salud SFA: ${finalHealthScore}%.`, finalHealthScore < 60 ? "text-red" : (finalHealthScore < 85 ? "text-orange" : "text-green"));
        }, 1600);
    };

    // 1. NAVBAR SCROLL EFFECT
    const navbar = document.querySelector('.navbar');
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    // 2. MOBILE MENU TOGGLE
    const menuToggle = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link, .nav-btn');

    const toggleMenu = () => {
        navMenu.classList.toggle('active');
        menuToggle.classList.toggle('active');
        
        // Animate menu toggle icon bars
        const spans = menuToggle.querySelectorAll('span');
        if (menuToggle.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    };

    menuToggle.addEventListener('click', toggleMenu);

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // 3. SCROLL REVEAL (INTERSECTION OBSERVER)
    const revealElements = document.querySelectorAll('.scroll-reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Reveal only once
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });

    // 4. 3D TILT EFFECT FOR ECOSISTEMA CARDS
    const cards = document.querySelectorAll('.ecosistema-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const cardRect = card.getBoundingClientRect();
            const cardWidth = cardRect.width;
            const cardHeight = cardRect.height;
            
            // Mouse coordinates relative to card center
            const mouseX = e.clientX - cardRect.left - cardWidth / 2;
            const mouseY = e.clientY - cardRect.top - cardHeight / 2;
            
            // Calculate rotation values (max 6 degrees for smoother feel)
            const rotateX = -(mouseY / (cardHeight / 2)) * 6;
            const rotateY = (mouseX / (cardWidth / 2)) * 6;
            
            // Apply 3D transform rotation
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });
        
        card.style.transition = 'transform 0.1s ease-out, box-shadow 0.4s ease';
        
        card.addEventListener('mouseleave', () => {
            // Smoothly reset rotation
            card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease';
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        });
    });

    // 5. INTERACTIVE TELEMETRY CONSOLE ('N' BUTTON)
    const btnTerminalToggle = document.getElementById('btn-terminal-toggle');
    const telemetryConsole = document.getElementById('telemetry-console');
    const consoleCloseBtn = document.getElementById('console-close-btn');
    const logContent = document.getElementById('console-log-content');
    
    if (btnTerminalToggle && telemetryConsole && consoleCloseBtn) {
        btnTerminalToggle.addEventListener('click', () => {
            telemetryConsole.classList.toggle('active');
            
            if (telemetryConsole.classList.contains('active')) {
                // Play typing sound / visual effect by printing lines sequentially
                const lines = logContent.querySelectorAll('.log-line');
                lines.forEach((line, index) => {
                    line.style.opacity = '0';
                    line.style.transform = 'translateX(-10px)';
                    line.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    
                    setTimeout(() => {
                        line.style.opacity = '1';
                        line.style.transform = 'translateX(0)';
                        logContent.scrollTop = logContent.scrollHeight; // Auto-scroll
                    }, index * 200); // 200ms delay between lines
                });
            }
        });
        
        consoleCloseBtn.addEventListener('click', () => {
            telemetryConsole.classList.remove('active');
        });
    }

    // 6. CONTACT FORM INTERACTVITY
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Fetch inputs
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            
            // Simple visual feedback
            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                // Replace form with a success message
                const formParent = contactForm.parentElement;
                
                // Animate fade out
                contactForm.style.transition = 'opacity 0.4s ease';
                contactForm.style.opacity = '0';
                
                setTimeout(() => {
                    contactForm.style.display = 'none';
                    
                    const successDiv = document.createElement('div');
                    successDiv.className = 'contact-form success-message';
                    successDiv.style.textAlign = 'center';
                    successDiv.style.opacity = '0';
                    successDiv.style.transition = 'opacity 0.4s ease';
                    
                    successDiv.innerHTML = `
                        <div style="font-size: 3rem; color: var(--color-primary-gold); margin-bottom: 1.5rem;">
                            <svg viewBox="0 0 24 24" style="width: 60px; height: 60px; fill: var(--color-primary-gold);">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        </div>
                        <h3 style="color: var(--color-primary-gold); margin-bottom: 1rem; font-size: 1.5rem;">¡Mensaje Recibido!</h3>
                        <p style="color: var(--color-text-gray); margin-bottom: 2rem;">Gracias, <strong>${nameInput.value}</strong>. Tu mensaje ha sido procesado correctamente y un asesor de Áurea Systems se pondrá en contacto al correo <em>${emailInput.value}</em> en la brevedad posible.</p>
                        <button class="btn btn-outline" id="reset-form-btn">Enviar otro mensaje</button>
                    `;
                    
                    formParent.appendChild(successDiv);
                    
                    // Force reflow
                    successDiv.offsetHeight;
                    successDiv.style.opacity = '1';
                    
                    document.getElementById('reset-form-btn').addEventListener('click', () => {
                        successDiv.style.opacity = '0';
                        setTimeout(() => {
                            successDiv.remove();
                            contactForm.reset();
                            contactForm.style.display = 'block';
                            // Force reflow
                            contactForm.offsetHeight;
                            contactForm.style.opacity = '1';
                            submitBtn.textContent = originalText;
                            submitBtn.disabled = false;
                            submitBtn.style.opacity = '1';
                        }, 400);
                    });
                }, 400);
                
            }, 1200); // Simulated delay
        });
    }

    // 7. SFA DIAGNOSTIC PLATFORM INTERACTIVE CONTROLLER
    const dropzone = document.getElementById('sfa-dropzone');
    const fileInput = document.getElementById('sfa-file-input');
    const mockButtons = document.querySelectorAll('.btn-mock-data');
    const lambdaSlider = document.getElementById('lambda-slider');
    const lambdaDisplay = document.getElementById('lambda-display');
    const referenceSlider = document.getElementById('reference-slider');
    const referenceDisplay = document.getElementById('reference-display');
    const statusPanel = document.getElementById('sfa-status-panel');
    const resultsPanel = document.getElementById('sfa-dashboard-results');
    const canvas = document.getElementById('sfa-chart-canvas');
    const degradationCanvas = document.getElementById('degradation-chart-canvas');
    const tabBtnSpectral = document.getElementById('tab-btn-spectral');
    const tabBtnDegradation = document.getElementById('tab-btn-degradation');
    const btnDownload = document.getElementById('btn-download-report');
    const btnPrint = document.getElementById('btn-print-report');

    // Payment & License variables
    const planCards = document.querySelectorAll('.plan-card');
    const btnSimulatePayment = document.getElementById('btn-simulate-payment');
    const btnActivatePromo = document.getElementById('btn-activate-promo');
    const activePlan = { name: 'Plan Consultor / Senior', price: 20000 };

    if (dropzone && fileInput && lambdaSlider) {
        
        // 7.1 PAYMENT GATEWAY & PROMOTIONAL FLOW
        
        const getRegistrosApiUrl = () => {
            const savedSource = localStorage.getItem("aurea_admin_source_type") || "api";
            const savedUrl = localStorage.getItem("aurea_admin_api_url") || "https://aurea-backend-eq8d.onrender.com/api/feedback";
            
            let baseUrl = 'https://aurea-backend-eq8d.onrender.com/api';
            if (savedSource === "local") {
                baseUrl = 'http://localhost:8000/api';
            } else if (savedUrl) {
                try {
                    const urlObj = new URL(savedUrl);
                    urlObj.pathname = urlObj.pathname.replace('/feedback', '');
                    baseUrl = urlObj.toString();
                    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                } catch (e) {
                    baseUrl = 'https://aurea-backend-eq8d.onrender.com/api';
                }
            }
            return `${baseUrl}/registros`;
        };

        const submitRegistration = async (name, email, company, planName, accessKey = null) => {
            const url = getRegistrosApiUrl();
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        company: company,
                        plan: planName,
                        access_key: accessKey
                    })
                });
                
                if (!response.ok) {
                    let errMsg = `Error en el servidor: ${response.statusText}`;
                    try {
                        const errData = await response.json();
                        if (errData && errData.detail) {
                            errMsg = errData.detail;
                        }
                    } catch (e) {}
                    const httpError = new Error(errMsg);
                    httpError.isHttpError = true;
                    httpError.status = response.status;
                    throw httpError;
                }
                
                return await response.json();
            } catch (error) {
                if (error.isHttpError) {
                    throw error;
                }
                console.error("Error al registrar membresía en el backend:", error);
                throw new Error("No se pudo conectar con el servidor de registros de Áurea Systems. Verifique que el servidor esté activo e intente nuevamente.");
            }
        };

        // Promo spots remaining (localStorage persisted)
        let promoSpots = parseInt(localStorage.getItem('aurea_promo_spots'));
        if (isNaN(promoSpots)) {
            promoSpots = 33;
            localStorage.setItem('aurea_promo_spots', promoSpots);
        }

        const updatePromoSpotsUI = () => {
            const promoSpotsCard = document.getElementById('promo-spots-card');
            const promoBtnSpots = document.getElementById('promo-btn-spots');
            if (promoSpotsCard) promoSpotsCard.textContent = promoSpots;
            if (promoBtnSpots) promoBtnSpots.textContent = promoSpots;

            // If no spots remaining, disable the promo card and its button
            const planPromo = document.getElementById('plan-club33');
            const btnSubmitClub33 = document.getElementById('btn-submit-club33');
            if (promoSpots <= 0) {
                if (planPromo) {
                    planPromo.classList.add('disabled');
                    planPromo.style.pointerEvents = 'none';
                    planPromo.style.opacity = '0.5';
                    const badge = planPromo.querySelector('.plan-badge');
                    if (badge) {
                        badge.textContent = 'AGOTADO';
                        badge.style.background = '#6b7280';
                    }
                }
                if (btnSubmitClub33) {
                    btnSubmitClub33.disabled = true;
                    btnSubmitClub33.style.background = '#6b7280';
                    btnSubmitClub33.style.color = '#fff';
                    btnSubmitClub33.textContent = 'Registro Agotado';
                }
            }
        };

        const fetchPromoSpots = async () => {
            try {
                const baseUrl = getRegistrosApiUrl().replace('/registros', '');
                const response = await fetch(`${baseUrl}/registros/public-count`);
                if (response.ok) {
                    const data = await response.json();
                    promoSpots = data.remaining;
                    updatePromoSpotsUI();
                }
            } catch (e) {
                console.error("Error al obtener cupos de promoción del servidor:", e);
            }
        };

        // Initialize spots UI
        updatePromoSpotsUI();
        fetchPromoSpots();

        // Update Remaining Credits in Active License Banner
        const updateCreditsUI = () => {
            const lblLicRemaining = document.getElementById('lbl-lic-remaining');
            if (lblLicRemaining && window.SFA.license) {
                const count = window.SFA.license.remaining;
                lblLicRemaining.textContent = `Análisis Restantes: ${count > 1000 ? 'Ilimitados' : count}`;
            }
        };

        // Plan Selection
        planCards.forEach(card => {
            card.addEventListener('click', () => {
                if (card.classList.contains('disabled')) return;

                planCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                activePlan.name = card.getAttribute('data-name');
                activePlan.price = parseFloat(card.getAttribute('data-price'));
                
                const paypalContainer = document.getElementById('paypal-button-container');
                const btnSimulate = document.getElementById('btn-simulate-payment');
                const formClub33 = document.getElementById('club33-registration-form');

                // Reset all displays in checkout
                if (paypalContainer) paypalContainer.style.display = 'none';
                if (btnSimulate) btnSimulate.style.display = 'none';
                if (formClub33) formClub33.style.display = 'none';

                if (paypalContainer) paypalContainer.style.display = 'block';
                
                const urlParams = new URLSearchParams(window.location.search);
                if (btnSimulate && urlParams.get('sandbox') === 'true') {
                    btnSimulate.style.display = 'block';
                }
                renderPayPalButtons();
            });
        });

        // Banner Promo Action
        const btnPionerosAction = document.getElementById('btn-pioneros-action');
        const formClub33 = document.getElementById('club33-registration-form');
        
        if (btnPionerosAction && formClub33) {
            btnPionerosAction.addEventListener('click', () => {
                if (formClub33.style.display === 'none' || formClub33.style.display === '') {
                    formClub33.style.display = 'block';
                    formClub33.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    activePlan.name = 'Club de Pioneros 33';
                    activePlan.price = 0;
                    
                    planCards.forEach(c => c.classList.remove('active'));
                    
                    const paypalContainer = document.getElementById('paypal-button-container');
                    const btnSimulate = document.getElementById('btn-simulate-payment');
                    if (paypalContainer) paypalContainer.style.display = 'none';
                    if (btnSimulate) btnSimulate.style.display = 'none';
                } else {
                    formClub33.style.display = 'none';
                }
            });
        }

        // PayPal Buttons rendering
        const renderPayPalButtons = () => {
            if (!window.paypal) {
                console.warn("PayPal SDK no detectado.");
                return;
            }

            const btnContainer = document.getElementById('paypal-button-container');
            if (!btnContainer) return;
            
            // Clear existing buttons
            btnContainer.innerHTML = '';

            window.paypal.Buttons({
                style: {
                    layout: 'vertical',
                    color:  'gold',
                    shape:  'rect',
                    label:  'paypal'
                },
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            description: `Áurea Systems SFA - Diagnóstico de Maquinaria [Plan ${activePlan.name}]`,
                            amount: {
                                currency_code: 'USD',
                                value: activePlan.price.toString()
                            }
                        }]
                    });
                },
                onApprove: (data, actions) => {
                    return actions.order.capture().then(async (details) => {
                        const name = (details.payer.name.given_name || "Cliente") + " " + (details.payer.name.surname || "PayPal");
                        const email = details.payer.email_address || "paypal@aurea.com";
                        const company = "Cliente PayPal";
                        
                        try {
                            const regResult = await submitRegistration(name, email, company, activePlan.name);
                            unlockSFAWorkspace(activePlan.name, activePlan.price, regResult.license_key);
                        } catch (error) {
                            console.error("Failed to register paid account in backend:", error);
                            const txId = details.id || `TX-PAYPAL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                            unlockSFAWorkspace(activePlan.name, activePlan.price, txId);
                        }
                    });
                },
                onError: (err) => {
                    console.error("PayPal checkout error:", err);
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('sandbox') === 'true') {
                        alert("No se pudo completar el pago con PayPal. Intente con el Simulador Sandbox.");
                    } else {
                        alert("No se pudo completar el pago con PayPal. Por favor, intente de nuevo.");
                    }
                }
            }).render('#paypal-button-container');
        };

        // Check if sandbox dev mode is active via URL query param (?sandbox=true)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('sandbox') === 'true' && btnSimulatePayment) {
            btnSimulatePayment.style.display = 'block';
        }

        // Simulated payment trigger (Sandbox Bypass for development)
        if (btnSimulatePayment) {
            btnSimulatePayment.addEventListener('click', async () => {
                const name = prompt("Ingrese su nombre completo:") || "Cliente Simulado";
                const email = prompt("Ingrese su correo electrónico:") || "simulado@aurea.com";
                const company = prompt("Ingrese su empresa (opcional):") || "Particular";

                btnSimulatePayment.disabled = true;
                btnSimulatePayment.textContent = "⏳ Registrando...";

                try {
                    const regResult = await submitRegistration(name, email, company, activePlan.name);
                    unlockSFAWorkspace(activePlan.name, activePlan.price, regResult.license_key);
                } catch (error) {
                    alert("Error al simular el registro en el backend: " + error.message);
                } finally {
                    btnSimulatePayment.disabled = false;
                    btnSimulatePayment.textContent = "Simular Pago Rápido (Sandbox)";
                }
            });
        }



        // Evento para enviar registro de Club 33
        const btnSubmitClub33 = document.getElementById('btn-submit-club33');
        if (btnSubmitClub33) {
            btnSubmitClub33.addEventListener('click', async () => {
                const nameInput = document.getElementById('promo-reg-name');
                const emailInput = document.getElementById('promo-reg-email');
                const companyInput = document.getElementById('promo-reg-company');
                const keyInput = document.getElementById('promo-reg-key');
                
                if (!nameInput || !emailInput || !companyInput || !keyInput) return;
                
                const nameVal = nameInput.value.trim();
                const emailVal = emailInput.value.trim();
                const companyVal = companyInput.value.trim();
                const keyVal = keyInput.value.trim();
                
                if (!nameVal || !emailVal || !companyVal || !keyVal) {
                    alert("Por favor rellene todos los campos para registrarse, incluyendo la clave de acceso.");
                    return;
                }
                
                if (promoSpots <= 0) {
                    alert("Lo sentimos, los cupos para la promoción Club 33 se han agotado.");
                    return;
                }

                btnSubmitClub33.disabled = true;
                btnSubmitClub33.textContent = "⏳ Registrando...";

                let regResult;
                try {
                    // Registrar en API
                    regResult = await submitRegistration(nameVal, emailVal, companyVal, "Club de Pioneros 33", keyVal);
                } catch (error) {
                    btnSubmitClub33.disabled = false;
                    btnSubmitClub33.innerHTML = `⚡ Registrarse y Activar 3 Meses Gratis (Cupo: <span id="promo-btn-spots">${promoSpots}</span>/33)`;
                    alert(error.message || "Error al realizar el registro. Inténtelo de nuevo.");
                    return;
                }

                // Descontar cupo (solo si el registro es exitoso)
                promoSpots--;
                localStorage.setItem('aurea_promo_spots', promoSpots);
                updatePromoSpotsUI();
                fetchPromoSpots();

                btnSubmitClub33.disabled = false;
                btnSubmitClub33.innerHTML = `⚡ Registrarse y Activar 3 Meses Gratis (Cupo: <span id="promo-btn-spots">${promoSpots}</span>/33)`;

                // Guardar datos del registro en localStorage para fines de trazabilidad local
                const regData = {
                    name: nameVal,
                    email: emailVal,
                    company: companyVal,
                    licenseKey: regResult.license_key,
                    registeredAt: regResult.timestamp || new Date().toISOString()
                };
                localStorage.setItem('aurea_promo_club33_reg', JSON.stringify(regData));

                // Crear y mostrar modal dinámico con diseño cyberpunk oro y negro
                const modalOverlay = document.createElement('div');
                modalOverlay.className = 'aurea-modal-overlay';
                modalOverlay.id = 'club33-success-modal';
                modalOverlay.innerHTML = `
                    <div class="aurea-modal-container">
                        <div class="aurea-modal-header">
                            <span class="aurea-modal-icon">⚡</span>
                            <h3>¡Registro Exitoso!</h3>
                        </div>
                        <div class="aurea-modal-body">
                            <p>Tu clave de licencia es: <strong style="color: var(--color-primary-gold); font-family: monospace; font-size: 1.1rem; letter-spacing: 0.05em;">${regResult.license_key}</strong></p>
                            <p>Te hemos enviado la información a tu correo: <strong>${emailVal}</strong>.</p>
                            <p class="aurea-modal-subtext">Tu acceso premium de Club de Pioneros 33 ha sido activado. Ya puedes empezar a utilizar tus <strong>3 meses de uso gratis</strong> sin limitaciones.</p>
                        </div>
                        <div class="aurea-modal-footer">
                            <button class="aurea-modal-btn" id="btn-modal-close-club33">Empezar Diagnóstico</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modalOverlay);

                // Forzar reflow y activar animación de entrada
                setTimeout(() => {
                    modalOverlay.classList.add('active');
                }, 50);

                const btnCloseModal = modalOverlay.querySelector('#btn-modal-close-club33');
                if (btnCloseModal) {
                    btnCloseModal.addEventListener('click', () => {
                        // Cerrar modal con transición
                        modalOverlay.classList.remove('active');
                        setTimeout(() => {
                            modalOverlay.remove();
                        }, 300);

                        // Activar espacio de trabajo con la clave de licencia retornada
                        unlockSFAWorkspace("Club de Pioneros 33", 0, regResult.license_key);

                        // Ocultar formulario de registro
                        const formClub33 = document.getElementById('club33-registration-form');
                        if (formClub33) formClub33.style.display = 'none';

                        // Scroll suave al área de carga
                        const workspaceWrapper = document.getElementById('sfa-workspace-wrapper');
                        if (workspaceWrapper) {
                            workspaceWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });
                }
            });
        }

        // Workspace lock function
        const lockSFAWorkspace = (messageText) => {
            // Limpiar licencia guardada al bloquear
            localStorage.removeItem('aurea_sfa_license');

            // Add lock classes back
            const workspaceWrapper = document.getElementById('sfa-workspace-wrapper');
            if (workspaceWrapper) workspaceWrapper.classList.add('locked');

            // Show payment block smoothly
            const paymentBarrier = document.getElementById('sfa-payment-barrier');
            if (paymentBarrier) {
                paymentBarrier.style.transition = 'opacity 0.4s ease, max-height 0.4s ease, margin-bottom 0.4s ease';
                paymentBarrier.style.display = 'block';
                // Force layout reflow
                paymentBarrier.offsetHeight;
                paymentBarrier.style.opacity = '1';
                paymentBarrier.style.maxHeight = '2000px';
                paymentBarrier.style.overflow = 'visible';
                paymentBarrier.style.marginBottom = '2.5rem';
                paymentBarrier.style.padding = '2.5rem';
                paymentBarrier.style.border = '1px solid rgba(197, 168, 128, 0.15)';
            }

            // Disable file input and controls
            fileInput.disabled = true;
            mockButtons.forEach(btn => btn.disabled = true);
            lambdaSlider.disabled = true;
            if (referenceSlider) referenceSlider.disabled = true;

            // Hide active license banner
            const licenseBanner = document.getElementById('sfa-license-banner');
            if (licenseBanner) licenseBanner.style.display = 'none';

            if (messageText) {
                alert(messageText);
            }
        };

        // Workspace unlock function
        const unlockSFAWorkspace = (planName, price, txId, bypassAnimation = false) => {
            // Save license info in SFA engine
            let remainingCredits = 1;
            let expiresAt = null;

            if (planName.includes("Club 33") || planName.includes("3 Meses Gratis") || planName.includes("Promocional") || planName.includes("Pioneros")) {
                remainingCredits = 9999; // Acceso ilimitado por 3 meses
                const d = new Date();
                d.setMonth(d.getMonth() + 3);
                expiresAt = d.getTime();
            } else if (planName.includes("Gerente") || planName.includes("Planta Completa")) {
                remainingCredits = 9999; // Ilimitado
            } else if (planName.includes("Consultor") || planName.includes("Senior")) {
                remainingCredits = 20;
            } else if (planName.includes("Junior") || planName.includes("Técnico")) {
                remainingCredits = 3;
            } else {
                remainingCredits = 1; // Planes estándar de un solo uso
            }

            window.SFA.license = {
                plan: planName,
                price: price,
                txId: txId,
                remaining: remainingCredits,
                expiresAt: expiresAt
            };

            // Guardar en localStorage
            localStorage.setItem('aurea_sfa_license', JSON.stringify(window.SFA.license));

            // Remove lock classes
            const workspaceWrapper = document.getElementById('sfa-workspace-wrapper');
            if (workspaceWrapper) workspaceWrapper.classList.remove('locked');

            // Hide payment block smoothly
            const paymentBarrier = document.getElementById('sfa-payment-barrier');
            if (paymentBarrier) {
                if (bypassAnimation) {
                    paymentBarrier.style.display = 'none';
                    paymentBarrier.style.opacity = '0';
                    paymentBarrier.style.maxHeight = '0px';
                    paymentBarrier.style.overflow = 'hidden';
                    paymentBarrier.style.marginBottom = '0px';
                    paymentBarrier.style.padding = '0px';
                    paymentBarrier.style.border = 'none';
                } else {
                    paymentBarrier.style.transition = 'opacity 0.4s ease, max-height 0.4s ease, margin-bottom 0.4s ease';
                    paymentBarrier.style.opacity = '0';
                    paymentBarrier.style.maxHeight = '0px';
                    paymentBarrier.style.overflow = 'hidden';
                    paymentBarrier.style.marginBottom = '0px';
                    paymentBarrier.style.padding = '0px';
                    paymentBarrier.style.border = 'none';
                }
            }

            // Enable file input and controls
            fileInput.disabled = false;
            mockButtons.forEach(btn => btn.disabled = false);
            lambdaSlider.disabled = false;
            if (referenceSlider) referenceSlider.disabled = false;

            // Show active license banner
            const licenseBanner = document.getElementById('sfa-license-banner');
            const lblLicPlan = document.getElementById('lbl-lic-plan');
            const lblLicAmount = document.getElementById('lbl-lic-amount');
            const lblLicRef = document.getElementById('lbl-lic-ref');

            if (lblLicPlan) lblLicPlan.textContent = planName;
            if (lblLicAmount) lblLicAmount.textContent = price;
            if (lblLicRef) lblLicRef.textContent = txId;
            const lblLicCurrency = document.getElementById('lbl-lic-currency');
            if (lblLicCurrency) {
                if (planName.includes("Club 33") || planName.includes("Pioneros")) {
                    lblLicCurrency.textContent = "USD";
                } else {
                    lblLicCurrency.textContent = "MXN";
                }
            }
            if (licenseBanner) licenseBanner.style.display = 'flex';

            updateCreditsUI();

            // Set data attributes for media print layout
            if (resultsPanel) {
                resultsPanel.setAttribute('data-plan', planName);
                resultsPanel.setAttribute('data-price', price);
                resultsPanel.setAttribute('data-txid', txId);
            }

            // Re-analyze existing data if present
            if (window.currentRawCSVText) {
                const offsetVal = referenceSlider ? parseFloat(referenceSlider.value) : 0.0;
                const translatorProfileVal = document.getElementById('sfa-translator-profile') ? document.getElementById('sfa-translator-profile').value : 'auto';
                window.SFA.processSfaOnServer(window.currentRawCSVText, lambdaSlider.value, offsetVal, translatorProfileVal)
                    .then(results => {
                        updateDashboard(results, window.currentDataSourceName || "Datos Cargados");
                    })
                    .catch(err => {
                        console.error("Re-analysis failed after unlock:", err);
                        checkMachineLimitError(err);
                    });
            }
        };

        // Render PayPal buttons on initial load
        renderPayPalButtons();

        // 1. Verificar si ya hay una licencia guardada en localStorage
        const storedLicense = localStorage.getItem('aurea_sfa_license');
        let hasActiveLicense = false;
        
        if (storedLicense) {
            try {
                const license = JSON.parse(storedLicense);
                let isValid = true;
                const now = new Date().getTime();
                if (license.expiresAt) {
                    if (now > license.expiresAt) isValid = false;
                }
                
                if (isValid) {
                    hasActiveLicense = true;
                    // Desbloquear workspace directamente
                    unlockSFAWorkspace(license.plan, license.price, license.txId, true);
                } else {
                    localStorage.removeItem('aurea_sfa_license');
                }
            } catch (e) {
                console.error("Error al cargar la licencia guardada:", e);
            }
        }

        // 2. Seleccionar el plan por defecto en el arranque
        if (!hasActiveLicense) {
            const planConsultor = document.getElementById('plan-consultor');
            if (planConsultor) planConsultor.click();
        }

        // 7.2 FILE UPLOAD & ANALYZER CONTROL FLOW

        // Check and consume license credits
        const checkAndConsumeCredit = () => {
            if (!window.SFA.license) {
                lockSFAWorkspace("Licencia no válida. Adquiera una para continuar.");
                return false;
            }

            // Check temporal expiration
            if (window.SFA.license.expiresAt) {
                const now = new Date().getTime();
                if (now > window.SFA.license.expiresAt) {
                    lockSFAWorkspace("Su licencia temporal/promocional ha expirado. Por favor adquiera un plan para continuar.");
                    return false;
                }
            }

            if (typeof window.SFA.license.remaining === 'undefined' || window.SFA.license.remaining <= 0) {
                lockSFAWorkspace("Su licencia ha caducado por límite de análisis. Adquiera un nuevo plan para continuar.");
                return false;
            }

            // Si la licencia tiene análisis ilimitados, no decrementar
            if (window.SFA.license.remaining < 9000) {
                window.SFA.license.remaining--;
                // Actualizar en localStorage
                localStorage.setItem('aurea_sfa_license', JSON.stringify(window.SFA.license));
            }
            updateCreditsUI();
            return true;
        };

        // Drag & Drop events
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!fileInput.disabled) dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            if (fileInput.disabled) return;
            const dt = e.dataTransfer;
            const file = dt.files[0];
            if (file) handleFile(file);
        });

        // Click to explore
        dropzone.addEventListener('click', () => {
            if (!fileInput.disabled) fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });

        // File Handler
        const handleFile = (file) => {
            if (!checkAndConsumeCredit()) return;

            // Remove active state from mock buttons
            mockButtons.forEach(btn => btn.classList.remove('active'));

            const fileNameLower = file.name.toLowerCase();
            const fileExtension = fileNameLower.split('.').pop();

            // 1. Validar extensión de archivo estrictamente (.csv)
            if (fileExtension !== 'csv') {
                showSecurityAlert(
                    "Extensión de Archivo No Permitida",
                    `El cargador SFA está configurado en modo estricto y solo acepta archivos de datos CSV (.csv). Se detectó el tipo: <strong>.${fileExtension}</strong>. El archivo ha sido bloqueado preventivamente por seguridad.`
                );
                return;
            }

            // 2. Validar tamaño estricto de archivo (límite de 5 MB)
            if (file.size > 5 * 1024 * 1024) {
                showSecurityAlert(
                    "Límite de Peso Excedido",
                    `El archivo seleccionado tiene un tamaño de ${(file.size / (1024 * 1024)).toFixed(2)} MB, el cual supera el límite estricto de <strong>5.0 MB</strong> configurado en el backend de Áurea Systems para prevenir inyección de código masivo y denegación de servicio.`
                );
                return;
            }

            // 3. Validar tipo MIME (MIME-Type Validation)
            // Tipos MIME comunes y válidos para CSV (algunos navegadores Windows asignan application/vnd.ms-excel o text/plain a CSV)
            const allowedMimes = [
                'text/csv',
                'text/plain',
                'application/vnd.ms-excel',
                'application/octet-stream',
                'text/comma-separated-values',
                'application/csv',
                'application/x-csv',
                'text/x-csv'
            ];
            if (file.type && !allowedMimes.includes(file.type)) {
                showSecurityAlert(
                    "Firma de Tipo MIME Sospechosa",
                    `El sistema ha interceptado y rechazado el archivo porque su tipo MIME (<strong>${file.type}</strong>) no corresponde a un documento CSV estructurado. Esto previene que scripts ejecutables (.exe, .php, .js) se disfracen con extensión .csv.`
                );
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target.result;
                try {
                    // Sanitización de caracteres peligrosos en el contenido raw antes de pasarlo al motor de análisis
                    // Remueve etiquetas HTML y caracteres de control que puedan usarse para inyecciones XSS en el dashboard
                    const sanitizedText = text
                        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
                        .replace(/<\/?[^>]+(>|$)/g, "");

                    window.currentRawCSVText = sanitizedText;

                    const translatorProfileVal = document.getElementById('sfa-translator-profile') ? document.getElementById('sfa-translator-profile').value : 'auto';
                    const offsetVal = referenceSlider ? parseFloat(referenceSlider.value) : 0.0;

                    // Trigger Step 2 Transition Animation
                    showStep(2);

                    let results;
                    try {
                        results = await window.SFA.processSfaOnServer(sanitizedText, lambdaSlider.value, offsetVal, translatorProfileVal);
                    } catch (serverErr) {
                        showStep(1);
                        throw serverErr;
                    }

                    // Update processing subtitle with the actual frequency
                    const processingSubtitle = document.getElementById('sfa-processing-subtitle');
                    if (processingSubtitle && results && results.targetFreq) {
                        processingSubtitle.innerHTML = `Atenuando ruido fractal mediante filtro espectral SFA (f<sub>base</sub> = ${results.targetFreq.toFixed(2)} Hz)`;
                    }

                    runPurificationAnimation(() => {
                        updateDashboard(results, file.name);
                        showStep(3);

                        // Run the virtual telemetry console logger after animation finishes
                        runTelemetryLogs(
                            file.name,
                            file.size,
                            results.detectedProfileName || "Sin Traductor (Cabeceras Estándar)",
                            window.SFA.data.length,
                            results.stats.avgCurrentRaw,
                            results.healthScore
                        );

                        // Update translator status UI
                        const statusIndicator = document.getElementById('translator-status-indicator');
                        const statusText = document.getElementById('translator-status-text');
                        if (statusIndicator && statusText) {
                            statusText.textContent = `Traductor: ${results.detectedProfileName || "Sin Traductor (Cabeceras Estándar)"}`;
                            statusIndicator.style.display = 'flex';
                        }
                    });
                } catch (err) {
                    if (!checkMachineLimitError(err)) {
                        showError(err.message);
                    }
                }
            };
            reader.readAsText(file);
        };

        // Mock simulation buttons
        mockButtons.forEach(button => {
            button.addEventListener('click', async () => {
                if (!checkAndConsumeCredit()) return;

                mockButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Reset translator UI for mock data
                const statusIndicator = document.getElementById('translator-status-indicator');
                if (statusIndicator) statusIndicator.style.display = 'none';
                
                const type = button.getAttribute('data-type');
                
                // Trigger Step 2 Transition Animation
                showStep(2);
                
                try {
                    const simulation = await window.SFA.generateMockData(type);
                    
                    // Align slider to simulation lambda
                    lambdaSlider.value = window.SFA.lambda;
                    lambdaDisplay.textContent = window.SFA.lambda.toFixed(3);
                    
                    // Reset reference slider for mock simulation
                    if (referenceSlider) {
                        referenceSlider.value = "0.00";
                        if (referenceDisplay) referenceDisplay.textContent = "0.00 mm/s";
                    }
                    
                    // Update processing subtitle with the actual frequency
                    const processingSubtitle = document.getElementById('sfa-processing-subtitle');
                    if (processingSubtitle && simulation && simulation.results && simulation.results.targetFreq) {
                        processingSubtitle.innerHTML = `Atenuando ruido fractal mediante filtro espectral SFA (f<sub>base</sub> = ${simulation.results.targetFreq.toFixed(2)} Hz)`;
                    }

                    runPurificationAnimation(() => {
                        updateDashboard(simulation.results, `Simulación: ${button.textContent.trim()}`);
                        showStep(3);

                        // Run virtual telemetry console logger for mock data after animation
                        runSimulationLogs(
                            button.textContent.trim(),
                            simulation.data.length,
                            simulation.results.stats.avgCurrentRaw,
                            simulation.results.healthScore
                        );
                    });
                } catch (err) {
                    showStep(1);
                    if (!checkMachineLimitError(err)) {
                        showError(err.message);
                    }
                }
            });
        });

        // Slider events
        lambdaSlider.addEventListener('input', () => {
            lambdaDisplay.textContent = parseFloat(lambdaSlider.value).toFixed(3);
        });

        lambdaSlider.addEventListener('change', async () => {
            if (window.currentRawCSVText) {
                const offsetVal = referenceSlider ? parseFloat(referenceSlider.value) : 0.0;
                const translatorProfileVal = document.getElementById('sfa-translator-profile') ? document.getElementById('sfa-translator-profile').value : 'auto';
                try {
                    const results = await window.SFA.processSfaOnServer(window.currentRawCSVText, lambdaSlider.value, offsetVal, translatorProfileVal);
                    updateDashboard(results, window.currentDataSourceName || "Datos Cargados");
                } catch (err) {
                    if (!checkMachineLimitError(err)) {
                        alert(err.message);
                    }
                }
            }
        });

        if (referenceSlider) {
            referenceSlider.addEventListener('input', () => {
                const val = parseFloat(referenceSlider.value);
                if (referenceDisplay) {
                    referenceDisplay.textContent = (val > 0 ? '+' : '') + val.toFixed(2) + ' mm/s';
                }
            });

            referenceSlider.addEventListener('change', async () => {
                if (window.currentRawCSVText) {
                    const offsetVal = parseFloat(referenceSlider.value);
                    const translatorProfileVal = document.getElementById('sfa-translator-profile') ? document.getElementById('sfa-translator-profile').value : 'auto';
                    try {
                        const results = await window.SFA.processSfaOnServer(window.currentRawCSVText, lambdaSlider.value, offsetVal, translatorProfileVal);
                        updateDashboard(results, window.currentDataSourceName || "Datos Cargados");
                    } catch (err) {
                        if (!checkMachineLimitError(err)) {
                            alert(err.message);
                        }
                    }
                }
            });
        }

        // Report actions
        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                window.SFA.downloadReport();
            });
        }
        if (btnPrint) {
            btnPrint.addEventListener('click', (e) => {
                if (window.currentAnalysisIsStandard) {
                    e.preventDefault();
                    alert("Función Bloqueada: El Plan Electromecánico Base ($300 USD) no incluye la generación de informes PDF certificados. Por favor, adquiera el Plan Total ($750 USD) o Planta Pro para habilitar esta función.");
                    const pricingSection = document.getElementById('servicios') || document.getElementById('ecosistema');
                    if (pricingSection) pricingSection.scrollIntoView({ behavior: 'smooth' });
                    return;
                }
                window.print();
            });
        }

        // Feedback Card interactive logic
        const btnAccuracyYes = document.getElementById('btn-accuracy-yes');
        const btnAccuracyNo = document.getElementById('btn-accuracy-no');
        const feedbackStars = document.querySelectorAll('#feedback-stars .star');
        const btnSubmitFeedback = document.getElementById('btn-submit-feedback');
        const feedbackComments = document.getElementById('feedback-comments');
        const feedbackSuccess = document.getElementById('feedback-success-message');

        let selectedAccuracy = 'si';
        let selectedRating = 5; // Default 5 stars

        if (btnAccuracyYes && btnAccuracyNo) {
            btnAccuracyYes.addEventListener('click', () => {
                btnAccuracyYes.classList.add('active');
                btnAccuracyNo.classList.remove('active');
                selectedAccuracy = 'si';
            });
            btnAccuracyNo.addEventListener('click', () => {
                btnAccuracyNo.classList.add('active');
                btnAccuracyYes.classList.remove('active');
                selectedAccuracy = 'no';
            });
        }

        feedbackStars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.getAttribute('data-rating')) || 5;
                updateStarsUI(selectedRating);
            });

            star.addEventListener('mouseover', () => {
                const hoverRating = parseInt(star.getAttribute('data-rating')) || 5;
                feedbackStars.forEach(s => {
                    const rating = parseInt(s.getAttribute('data-rating'));
                    if (rating <= hoverRating) {
                        s.classList.add('hovered');
                    } else {
                        s.classList.remove('hovered');
                    }
                });
            });

            star.addEventListener('mouseout', () => {
                feedbackStars.forEach(s => s.classList.remove('hovered'));
            });
        });

        const updateStarsUI = (ratingVal) => {
            feedbackStars.forEach(s => {
                const rating = parseInt(s.getAttribute('data-rating'));
                if (rating <= ratingVal) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        };

        if (btnSubmitFeedback) {
            btnSubmitFeedback.addEventListener('click', () => {
                const commentText = feedbackComments ? feedbackComments.value.trim() : '';
                
                // Formulate feedback payload
                const feedbackData = {
                    accuracy: selectedAccuracy,
                    rating: selectedRating,
                    comment: commentText,
                    timestamp: new Date().toISOString()
                };

                // Save to localStorage history
                let feedbackHistory = [];
                try {
                    feedbackHistory = JSON.parse(localStorage.getItem('aurea_feedback_history')) || [];
                } catch (e) {
                    feedbackHistory = [];
                }
                feedbackHistory.push(feedbackData);
                localStorage.setItem('aurea_feedback_history', JSON.stringify(feedbackHistory));

                // Log to virtual telemetry console
                if (typeof logToConsole === 'function') {
                    logToConsole(`[RETROALIMENTACIÓN] Calificación: ${selectedRating} estrellas. ¿Acertado?: ${selectedAccuracy.toUpperCase()}.`, 'text-gold');
                    if (commentText) {
                        logToConsole(`[OBSERVACIÓN] "${commentText}"`, 'text-blue');
                    }
                    logToConsole(`[CONEXIÓN] Calibración de núcleo SFA optimizada con datos de retroalimentación.`, 'text-gold');
                }

                // Send to Server / Database if configured
                const savedSource = localStorage.getItem("aurea_admin_source_type") || "api";
                const savedUrl = localStorage.getItem("aurea_admin_api_url") || "https://aurea-backend-eq8d.onrender.com/api/feedback";
                const savedToken = localStorage.getItem("aurea_admin_api_token") || "";

                if (savedSource !== "local") {
                    const headers = { 'Content-Type': 'application/json' };
                    if (savedToken) {
                        headers['Authorization'] = `Bearer ${savedToken}`;
                    }
                    
                    fetch(savedUrl, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(feedbackData)
                    }).then(response => {
                        if (response.ok) {
                            console.log("[OK] Feedback enviado exitosamente al servidor configurado.");
                        } else {
                            console.warn("[WARN] El servidor respondió con error al guardar el feedback.");
                        }
                    }).catch(err => {
                        console.warn("[WARN] No se pudo enviar el feedback a la API remota:", err);
                    });
                } else {
                    // Fallback to local python backend if running (silent failure if not)
                    fetch('http://localhost:8000/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(feedbackData)
                    }).catch(() => {});
                }

                // Show success toast
                if (feedbackSuccess) {
                    feedbackSuccess.style.display = 'flex';
                    setTimeout(() => {
                        feedbackSuccess.style.display = 'none';
                    }, 5000);
                }

                // Reset comments text area
                if (feedbackComments) {
                    feedbackComments.value = '';
                }
            });
        }

        // Show machine limit warning modal (PLG Flow)
        const showMachineLimitModal = (message) => {
            const existingModal = document.getElementById('machine-limit-modal');
            if (existingModal) existingModal.remove();

            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'aurea-modal-overlay';
            modalOverlay.id = 'machine-limit-modal';
            modalOverlay.innerHTML = `
                <div class="aurea-modal-container" style="border: 2px solid var(--color-primary-gold); box-shadow: 0 0 25px rgba(226, 193, 149, 0.4);">
                    <div class="aurea-modal-header">
                        <span class="aurea-modal-icon">🔐</span>
                        <h3>Límite de Slots Excedido</h3>
                    </div>
                    <div class="aurea-modal-body">
                        <p style="font-weight: bold; color: #fff; font-size: 1.1rem; margin-bottom: 0.75rem;">
                            Límite de Slots de Máquinas Excedido
                        </p>
                        <p class="aurea-modal-subtext" style="font-size: 0.9rem; line-height: 1.5; color: var(--color-text-light); margin-bottom: 1rem;">
                            Has analizado tus máquinas asignadas para este plan. Para conectar nuevos equipos y expandir tu monitoreo industrial, actualiza tu membresía y desbloquea más slots.
                        </p>
                        <p style="font-size: 0.82rem; color: var(--color-primary-gold); font-family: monospace; background: rgba(226, 193, 149, 0.05); padding: 0.6rem; border-radius: 4px; border: 1px dashed rgba(226, 193, 149, 0.25); margin: 0;">
                            ${message.replace("LÍMITE_MÁQUINAS_EXCEDIDO: ", "")}
                        </p>
                    </div>
                    <div class="aurea-modal-footer">
                        <button class="aurea-modal-btn" id="btn-modal-upgrade-consultor" style="background: linear-gradient(135deg, var(--color-primary-gold), #b3925c); color: #000; width: 100%;">
                            Desbloquear más slots ➔ Cambiar a Plan Consultor
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modalOverlay);

            // Force reflow and activate transition
            setTimeout(() => {
                modalOverlay.classList.add('active');
            }, 50);

            const btnUpgrade = modalOverlay.querySelector('#btn-modal-upgrade-consultor');
            if (btnUpgrade) {
                btnUpgrade.addEventListener('click', () => {
                    modalOverlay.classList.remove('active');
                    setTimeout(() => {
                        modalOverlay.remove();
                    }, 300);

                    // Scroll suave directo hacia el Grid comercial de planes de pago
                    const paymentBarrier = document.getElementById('sfa-payment-barrier');
                    if (paymentBarrier) {
                        paymentBarrier.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }

                    // Destacar visualmente la tarjeta del Plan Consultor (efecto de parpadeo neón o glow aumentado)
                    const planConsultor = document.getElementById('plan-consultor');
                    if (planConsultor) {
                        planConsultor.classList.add('highlight-upgrade-glow');
                        setTimeout(() => {
                            planConsultor.classList.remove('highlight-upgrade-glow');
                        }, 4000);
                    }
                });
            }
        };

        const checkMachineLimitError = (err) => {
            if (err && err.message && err.message.includes("LÍMITE_MÁQUINAS_EXCEDIDO")) {
                showStep(1);
                showMachineLimitModal(err.message);
                return true;
            }
            return false;
        };

        // Show error message
        const showError = (message) => {
            statusPanel.style.display = 'flex';
            resultsPanel.style.display = 'none';
            statusPanel.innerHTML = `
                <div class="empty-state-message" style="max-width: 400px; color: #ef4444;">
                    <div class="empty-icon-wrapper" style="border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
                        <svg viewBox="0 0 24 24" style="width: 32px; height: 32px; fill: #ef4444;">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                    </div>
                    <h4 style="color: #ef4444;">Error al Procesar Archivo</h4>
                    <p style="color: var(--color-text-light);">${message}</p>
                    <button class="btn btn-outline" id="btn-error-reset" style="margin-top: 1rem; border-color: rgba(239,68,68,0.5); color: #ef4444;">Intentar de nuevo</button>
                </div>
            `;
            
            document.getElementById('btn-error-reset').addEventListener('click', () => {
                resetWorkspace();
            });
        };

        // Show security alert message
        const showSecurityAlert = (title, message) => {
            statusPanel.style.display = 'flex';
            resultsPanel.style.display = 'none';
            statusPanel.innerHTML = `
                <div class="empty-state-message" style="max-width: 460px; color: #ef4444; border: 2px dashed rgba(239, 68, 68, 0.4); padding: 2.2rem; border-radius: 12px; background: rgba(239, 68, 68, 0.04);">
                    <div class="empty-icon-wrapper" style="border-color: rgba(239, 68, 68, 0.6); background: rgba(239, 68, 68, 0.15); margin: 0 auto 1.5rem; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                        <svg viewBox="0 0 24 24" style="width: 38px; height: 38px; fill: #ef4444;">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm1 10h-2v-4h2v4z"/>
                        </svg>
                    </div>
                    <h4 style="color: #ef4444; font-family: var(--font-accent); font-weight: bold; letter-spacing: 0.05em; font-size: 1.25rem; margin-bottom: 0.5rem;">⚠️ ALERTA DE SEGURIDAD</h4>
                    <p style="color: #fca5a5; font-weight: bold; font-size: 0.95rem; margin-bottom: 0.75rem;">${title}</p>
                    <p style="color: var(--color-text-light); font-size: 0.85rem; line-height: 1.6; margin-bottom: 1.5rem;">${message}</p>
                    <button class="btn btn-outline" id="btn-error-reset" style="border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.05); cursor: pointer; transition: all 0.3s ease;">Entendido / Restablecer</button>
                </div>
            `;
            
            document.getElementById('btn-error-reset').addEventListener('click', () => {
                resetWorkspace();
            });
        };
        const resetWorkspace = () => {
            const statusIndicator = document.getElementById('translator-status-indicator');
            if (statusIndicator) statusIndicator.style.display = 'none';

            statusPanel.style.display = 'flex';
            resultsPanel.style.display = 'none';
            statusPanel.innerHTML = `
                <div class="upload-guide-container">
                    <div class="guide-header">
                        <svg viewBox="0 0 24 24" class="guide-icon" style="width: 24px; height: 24px; fill: var(--color-primary-gold); margin-bottom: 0.5rem;">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                        <h4>Guía de Carga Rápida</h4>
                    </div>
                    <p class="guide-desc">Para ejecutar el Motor SFA de forma correcta, el traductor inteligente de telemetría mapeará las variables buscando nombres clave en la cabecera (compatible con Siemens, Allen Bradley y SCADA genérico) o, en su defecto, por su posición secuencial (Columna 1: Tiempo, Columna 2: Vibración, Columna 3: Temperatura, Columna 4: Presión, Columna 5: Corriente). Si el archivo contiene una columna de datos adicional sin cabecera al final (como en lecturas desalineadas de corriente), la quinta columna se asociará automáticamente a la Corriente.</p>
                    
                    <div class="guide-variables-list">
                        <div class="guide-var-item">
                            <span class="var-badge badge-time">Tiempo (t)</span>
                            <span class="var-desc">Columnas como: <code>timestamp</code>, <code>tiempo</code>, <code>time</code> o <code>t</code>. Soporta formato en segundos o <code>hh:mm:ss</code>.</span>
                        </div>
                        <div class="guide-var-item">
                            <span class="var-badge badge-vib">Vibración (G)</span>
                            <span class="var-desc">Columnas como: <code>vibration</code>, <code>vibracion</code>, <code>rms</code> o <code>vib</code>. (Aceleración de rodamientos).</span>
                        </div>
                        <div class="guide-var-item">
                            <span class="var-badge badge-temp">Temperatura (°C)</span>
                            <span class="var-desc">Columnas como: <code>temperature</code>, <code>temperatura</code>, <code>temp</code> o <code>stator_winding</code>.</span>
                        </div>
                        <div class="guide-var-item">
                            <span class="var-badge badge-pres">Presión (Bar / PSI)</span>
                            <span class="var-desc">Columnas como: <code>pressure</code>, <code>presion</code> o <code>bar</code>. Se convierte automáticamente a Bar.</span>
                        </div>
                        <div class="guide-var-item">
                            <span class="var-badge badge-current">Corriente (Amperaje)</span>
                            <span class="var-desc">Columnas como: <code>current</code>, <code>corriente</code>, <code>amp</code> o <code>amps</code>. Requerido para el cálculo del sub-índice de corriente.</span>
                        </div>
                    </div>
                    
                    <div class="guide-preview-box">
                        <span class="preview-title">Ejemplo de Estructura CSV:</span>
                        <pre class="preview-code"><code>tiempo, vibracion_g, temp_c, presion_bar, corriente_a
0.00,  0.115,       42.5,   6.10,        11.4
0.01,  0.124,       42.5,   6.08,        11.5
0.02,  0.108,       42.6,   6.12,        11.3</code></pre>
                    </div>
                </div>
            `;

            // Reset sliders and displays to defaults
            if (lambdaSlider) {
                lambdaSlider.value = "1.618";
                if (lambdaDisplay) lambdaDisplay.textContent = "1.618";
            }
            if (referenceSlider) {
                referenceSlider.value = "0.00";
                if (referenceDisplay) referenceDisplay.textContent = "0.00 G";
            }

            // Reset chart tabs to spectral active
            if (tabBtnSpectral && tabBtnDegradation && canvas && degradationCanvas) {
                tabBtnSpectral.classList.add('active');
                tabBtnDegradation.classList.remove('active');
                
                tabBtnSpectral.style.background = 'rgba(197, 168, 128, 0.1)';
                tabBtnSpectral.style.border = '1px solid var(--color-primary-gold)';
                tabBtnSpectral.style.color = 'var(--color-primary-gold)';
                
                tabBtnDegradation.style.background = 'transparent';
                tabBtnDegradation.style.border = '1px solid transparent';
                tabBtnDegradation.style.color = 'var(--color-text-gray)';
                
                canvas.style.display = 'block';
                degradationCanvas.style.display = 'none';
            }
        };
        // Update Dashboard UI with results
        const updateDashboard = (results, sourceName) => {
            window.currentDataSourceName = sourceName;
            
            // Toggle panels
            statusPanel.style.display = 'none';
            resultsPanel.style.display = 'block';

            // Meta info
            const dateStr = new Date(results.dateAnalyzed).toLocaleString();
            document.getElementById('sfa-analysis-meta').textContent = `${sourceName} | Analizado: ${dateStr}`;

            // Auto-detect if pressure data is present in the results
            const hasPressure = results.hasPressure;
            const isSfaPlan = hasPressure;
            let reportPlan = '';
            let reportPrice = '';

            if (isSfaPlan) {
                reportPlan = 'Diagnóstico Predictivo Total (SFA)';
                reportPrice = '750';
                
                // Unlock print PDF button
                window.currentAnalysisIsStandard = false;
                if (btnPrint) {
                    btnPrint.classList.remove('restricted');
                    btnPrint.title = 'Imprimir Reporte Técnico / PDF';
                    btnPrint.style.opacity = '1';
                    btnPrint.style.cursor = 'pointer';
                }
            } else {
                reportPlan = 'Auditoría Electromecánica Base';
                reportPrice = '300';
                
                // Restrict print PDF button
                window.currentAnalysisIsStandard = true;
                if (btnPrint) {
                    btnPrint.classList.add('restricted');
                    btnPrint.title = 'Función no disponible en el Plan de $300';
                    btnPrint.style.opacity = '0.6';
                    btnPrint.style.cursor = 'not-allowed';
                }
            }

            // Keep Planta Pro subscription name/price if bought
            if (window.SFA.license && (window.SFA.license.plan.includes("Planta Pro") || window.SFA.license.plan.includes("Anual"))) {
                reportPlan = window.SFA.license.plan;
                reportPrice = window.SFA.license.price.toString();
                
                // Planta Pro always has print unlocked
                window.currentAnalysisIsStandard = false;
                if (btnPrint) {
                    btnPrint.classList.remove('restricted');
                    btnPrint.title = 'Imprimir Reporte Técnico / PDF';
                    btnPrint.style.opacity = '1';
                    btnPrint.style.cursor = 'pointer';
                }
            }

            const txIdToShow = window.SFA.license ? window.SFA.license.txId : `TX-EVAL-33-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            
            // Sync SFA Engine license for downloadable text reports
            if (window.SFA.license) {
                if (!window.SFA.license.plan.includes("Planta Pro") && !window.SFA.license.plan.includes("Anual")) {
                    window.SFA.license.plan = reportPlan;
                    window.SFA.license.price = parseFloat(reportPrice);
                }
            } else {
                window.SFA.license = {
                    plan: reportPlan,
                    price: parseFloat(reportPrice),
                    txId: txIdToShow,
                    remaining: 0
                };
            }

            // Populate print-only traceability metadata
            document.getElementById('print-meta-asset').textContent = sourceName;
            document.getElementById('print-meta-plan').textContent = `${reportPlan.toUpperCase()} ($${reportPrice} USD)`;
            document.getElementById('print-meta-txid').textContent = txIdToShow;
            document.getElementById('print-meta-date').textContent = dateStr;

            // Health badge severity class
            const badgeContainer = document.getElementById('sfa-health-badge-container');
            const resultsClassContainer = document.getElementById('sfa-dashboard-results');
            
            badgeContainer.className = 'sfa-health-badge-wrapper';
            resultsClassContainer.className = 'sfa-dashboard-results';
            
            badgeContainer.classList.add(results.severityClass);
            resultsClassContainer.classList.add(results.severityClass);

            // Display health percentage
            document.getElementById('sfa-health-display').textContent = `${results.healthScore}%`;

            // Update maintenance planning bar
            const maintenanceFill = document.getElementById('sfa-maintenance-fill');
            const maintenanceContainer = document.getElementById('sfa-maintenance-bar-container');
            if (maintenanceFill) {
                maintenanceFill.style.width = `${results.healthScore}%`;
                
                // Color gradient and box shadow based on healthScore
                if (results.healthScore >= 90) {
                    maintenanceFill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
                    maintenanceFill.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.6)';
                } else if (results.healthScore >= 80) {
                    maintenanceFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
                    maintenanceFill.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.6)';
                } else if (results.healthScore >= 60) {
                    maintenanceFill.style.background = 'linear-gradient(90deg, #f97316, #ea580c)';
                    maintenanceFill.style.boxShadow = '0 0 8px rgba(249, 115, 22, 0.6)';
                } else {
                    maintenanceFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                    maintenanceFill.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
                }
            }
            if (maintenanceContainer) {
                let severityText = '';
                if (results.healthScore >= 90) {
                    severityText = 'Nivel de severidad: Óptimo. Tiempo estimado de intervención: No requiere.';
                } else if (results.healthScore >= 80) {
                    severityText = 'Nivel de severidad: Preventivo. Tiempo estimado de intervención: 72 horas.';
                } else if (results.healthScore >= 60) {
                    severityText = 'Nivel de severidad: Falla. Tiempo estimado de intervención: 24 horas.';
                } else {
                    severityText = 'Nivel de severidad: Crítico. Tiempo estimado de intervención: 8 horas (Urgente).';
                }
                maintenanceContainer.setAttribute('data-tooltip-text', severityText);
            }

            // Variables presence configuration
            const varsPresent = results.variables_present || {
                vibration: true,
                temperature: true,
                pressure: hasPressure,
                current: true,
                rpm: false,
                torque: false,
                tool_wear: false,
                flow: false,
                level: false,
                voltage: false
            };

            // Stats values
            document.getElementById('stat-freq').textContent = `${results.targetFreq.toFixed(2)} Hz`;
            
            if (varsPresent.vibration) {
                document.getElementById('stat-vib').textContent = `${results.stats.rmsVib.toFixed(3)} mm/s`;
            }
            if (varsPresent.temperature) {
                document.getElementById('stat-temp').textContent = `${results.stats.maxTempRaw.toFixed(1)} ${results.tempUnit || '°C'}`;
            }
            
            // Standardize display: convert to bar if it was psi and show both
            const presDiffVal = results.stats.maxPres - results.stats.minPres;
            if (varsPresent.pressure) {
                if (results.pressureUnit && results.pressureUnit.toLowerCase() !== 'bar') {
                    const rawDiff = results.stats.maxPresRaw - results.stats.minPresRaw;
                    document.getElementById('stat-pres').textContent = `${presDiffVal.toFixed(2)} bar (${rawDiff.toFixed(2)} ${results.pressureUnit})`;
                } else {
                    document.getElementById('stat-pres').textContent = `${presDiffVal.toFixed(2)} bar`;
                }
            }

            if (varsPresent.current) {
                document.getElementById('stat-current').textContent = `${results.stats.maxCurrentRaw.toFixed(1)} A`;
            }

            // Update new variables values if present
            if (varsPresent.rpm) {
                document.getElementById('stat-rpm').textContent = `${results.stats.maxRpm.toFixed(0)} RPM`;
            }
            if (varsPresent.torque) {
                document.getElementById('stat-torque').textContent = `${results.stats.maxTorque.toFixed(1)} Nm`;
            }
            if (varsPresent.tool_wear) {
                document.getElementById('stat-wear').textContent = `${results.stats.maxWear.toFixed(1)} min`;
            }
            if (varsPresent.flow) {
                document.getElementById('stat-flow').textContent = `${results.stats.maxFlow.toFixed(1)} LPM`;
            }
            if (varsPresent.level) {
                document.getElementById('stat-level').textContent = `${results.stats.maxLevel.toFixed(1)} %`;
            }
            if (varsPresent.voltage) {
                document.getElementById('stat-voltage').textContent = `${results.stats.maxVoltage.toFixed(1)} V`;
            }

            // Reset colors
            const cardValIds = ['stat-vib', 'stat-temp', 'stat-pres', 'stat-current', 'stat-rpm', 'stat-torque', 'stat-flow', 'stat-level', 'stat-voltage', 'stat-wear'];
            cardValIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.className = 'stat-value';
            });

            // Get limits from results if available, else use legacy defaults
            const limits = results.limits || {};
            const limitWarningVib = limits.warningVib !== undefined ? limits.warningVib : 4.5;
            const limitDangerVib = limits.dangerVib !== undefined ? limits.dangerVib : 7.1;
            const limitWarningTemp = limits.warningTemp !== undefined ? limits.warningTemp : 75.0;
            const limitDangerTemp = limits.dangerTemp !== undefined ? limits.dangerTemp : 105.0;
            const limitWarningCurrent = limits.warningCurrent !== undefined ? limits.warningCurrent : 35.0;
            const limitDangerCurrent = limits.dangerCurrent !== undefined ? limits.dangerCurrent : 50.0;

            const limitWarningRpm = limits.warningRpm !== undefined ? limits.warningRpm : 1000.0;
            const limitDangerRpm = limits.dangerRpm !== undefined ? limits.dangerRpm : 1500.0;
            const limitWarningTorque = limits.warningTorque !== undefined ? limits.warningTorque : 30.0;
            const limitDangerTorque = limits.dangerTorque !== undefined ? limits.dangerTorque : 50.0;
            const limitWarningWear = limits.warningWear !== undefined ? limits.warningWear : 100.0;
            const limitDangerWear = limits.dangerWear !== undefined ? limits.dangerWear : 200.0;
            const limitWarningFlow = limits.warningFlow !== undefined ? limits.warningFlow : 50.0;
            const limitDangerFlow = limits.dangerFlow !== undefined ? limits.dangerFlow : 80.0;
            const limitWarningLevel = limits.warningLevel !== undefined ? limits.warningLevel : 80.0;
            const limitDangerLevel = limits.dangerLevel !== undefined ? limits.dangerLevel : 95.0;
            const limitWarningVoltage = limits.warningVoltage !== undefined ? limits.warningVoltage : 240.0;
            const limitDangerVoltage = limits.dangerVoltage !== undefined ? limits.dangerVoltage : 480.0;

            // Update card label texts dynamically
            const isFahrenheit = (results.tempUnit || '°C').includes('F');
            const displayWarningTemp = isFahrenheit ? (limitWarningTemp * 1.8 + 32.0) : limitWarningTemp;

            const lblVib = document.getElementById('stat-lbl-vib');
            if (lblVib) lblVib.textContent = `Umbral: < ${limitWarningVib.toFixed(2)} mm/s`;
            
            const lblTemp = document.getElementById('stat-lbl-temp');
            if (lblTemp) lblTemp.textContent = `Límite: ${displayWarningTemp.toFixed(1)} ${results.tempUnit || '°C'}`;
            
            const lblCurrent = document.getElementById('stat-lbl-current');
            if (lblCurrent) lblCurrent.textContent = `Límite: ${limitWarningCurrent.toFixed(1)} A`;

            const lblRpm = document.getElementById('stat-lbl-rpm');
            if (lblRpm) lblRpm.textContent = `Límite: ${limitWarningRpm.toFixed(0)} RPM`;

            const lblTorque = document.getElementById('stat-lbl-torque');
            if (lblTorque) lblTorque.textContent = `Límite: ${limitWarningTorque.toFixed(1)} Nm`;

            const lblWear = document.getElementById('stat-lbl-wear');
            if (lblWear) lblWear.textContent = `Límite: ${limitWarningWear.toFixed(1)} min`;

            const lblFlow = document.getElementById('stat-lbl-flow');
            if (lblFlow) lblFlow.textContent = `Límite: ${limitWarningFlow.toFixed(1)} LPM`;

            const lblLevel = document.getElementById('stat-lbl-level');
            if (lblLevel) lblLevel.textContent = `Límite: ${limitWarningLevel.toFixed(1)} %`;

            const lblVoltage = document.getElementById('stat-lbl-voltage');
            if (lblVoltage) lblVoltage.textContent = `Límite: ${limitWarningVoltage.toFixed(1)} V`;

            // Check vibration threshold
            if (results.stats.rmsVib > limitDangerVib) {
                document.getElementById('stat-vib').classList.add('text-red');
            } else if (results.stats.rmsVib > limitWarningVib) {
                document.getElementById('stat-vib').classList.add('text-orange');
            } else {
                document.getElementById('stat-vib').classList.add('text-blue');
            }

            // Check temperature threshold
            if (results.stats.maxTemp > limitDangerTemp) {
                document.getElementById('stat-temp').classList.add('text-red');
            } else if (results.stats.maxTemp > limitWarningTemp) {
                document.getElementById('stat-temp').classList.add('text-orange');
            } else {
                document.getElementById('stat-temp').classList.add('text-blue');
            }

            // Check pressure threshold (warn at 1.5 bar)
            if (presDiffVal > 1.5) {
                document.getElementById('stat-pres').classList.add('text-red');
            } else {
                document.getElementById('stat-pres').classList.add('text-blue');
            }

            // Check current threshold
            if (results.stats.maxCurrentRaw > limitDangerCurrent) {
                document.getElementById('stat-current').classList.add('text-red');
            } else if (results.stats.maxCurrentRaw > limitWarningCurrent) {
                document.getElementById('stat-current').classList.add('text-orange');
            } else {
                document.getElementById('stat-current').classList.add('text-blue');
            }

            // Check RPM threshold
            if (results.stats.maxRpm > limitDangerRpm) {
                document.getElementById('stat-rpm').classList.add('text-red');
            } else if (results.stats.maxRpm > limitWarningRpm) {
                document.getElementById('stat-rpm').classList.add('text-orange');
            } else {
                document.getElementById('stat-rpm').classList.add('text-blue');
            }

            // Check Torque threshold
            if (results.stats.maxTorque > limitDangerTorque) {
                document.getElementById('stat-torque').classList.add('text-red');
            } else if (results.stats.maxTorque > limitWarningTorque) {
                document.getElementById('stat-torque').classList.add('text-orange');
            } else {
                document.getElementById('stat-torque').classList.add('text-blue');
            }

            // Check Wear threshold
            if (results.stats.maxWear > limitDangerWear) {
                document.getElementById('stat-wear').classList.add('text-red');
            } else if (results.stats.maxWear > limitWarningWear) {
                document.getElementById('stat-wear').classList.add('text-orange');
            } else {
                document.getElementById('stat-wear').classList.add('text-blue');
            }

            // Check Flow threshold
            if (results.stats.maxFlow > limitDangerFlow) {
                document.getElementById('stat-flow').classList.add('text-red');
            } else if (results.stats.maxFlow > limitWarningFlow) {
                document.getElementById('stat-flow').classList.add('text-orange');
            } else {
                document.getElementById('stat-flow').classList.add('text-blue');
            }

            // Check Level threshold
            if (results.stats.maxLevel > limitDangerLevel) {
                document.getElementById('stat-level').classList.add('text-red');
            } else if (results.stats.maxLevel > limitWarningLevel) {
                document.getElementById('stat-level').classList.add('text-orange');
            } else {
                document.getElementById('stat-level').classList.add('text-blue');
            }

            // Check Voltage threshold
            if (results.stats.maxVoltage > limitDangerVoltage) {
                document.getElementById('stat-voltage').classList.add('text-red');
            } else if (results.stats.maxVoltage > limitWarningVoltage) {
                document.getElementById('stat-voltage').classList.add('text-orange');
            } else {
                document.getElementById('stat-voltage').classList.add('text-blue');
            }

            // Recalculate stats grid columns & show/hide cards
            const statsGrid = document.querySelector('.sfa-stats-grid');
            if (statsGrid) {
                const cardsConfig = [
                    { id: 'card-freq', show: true },
                    { id: 'card-vib', show: varsPresent.vibration },
                    { id: 'card-temp', show: varsPresent.temperature },
                    { id: 'card-pres', show: varsPresent.pressure },
                    { id: 'card-current', show: varsPresent.current },
                    { id: 'card-rpm', show: varsPresent.rpm },
                    { id: 'card-torque', show: varsPresent.torque },
                    { id: 'card-flow', show: varsPresent.flow },
                    { id: 'card-level', show: varsPresent.level },
                    { id: 'card-voltage', show: varsPresent.voltage },
                    { id: 'card-wear', show: varsPresent.tool_wear }
                ];
                
                let visibleCount = 0;
                cardsConfig.forEach(c => {
                    const el = document.getElementById(c.id);
                    if (el) {
                        if (c.show) {
                            el.style.display = 'block';
                            visibleCount++;
                        } else {
                            el.style.display = 'none';
                        }
                    }
                });

                const adjustGridColumns = () => {
                    if (window.innerWidth > 1024) {
                        if (visibleCount <= 5) {
                            statsGrid.style.gridTemplateColumns = `repeat(${visibleCount}, 1fr)`;
                        } else {
                            statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
                        }
                    } else {
                        statsGrid.style.gridTemplateColumns = '';
                    }
                };
                adjustGridColumns();
                
                if (!window.sfaGridResizeBound) {
                    window.addEventListener('resize', adjustGridColumns);
                    window.sfaGridResizeBound = true;
                }
            }

            // Control dynamic current alert box
            const currentAlertBox = document.getElementById('sfa-current-alert-box');
            const currentAlertText = document.getElementById('sfa-current-alert-text');
            const currentAlertDot = document.getElementById('sfa-current-alert-dot');
            const avgCurrentRawVal = results.stats.avgCurrentRaw;

            if (currentAlertBox && currentAlertText && currentAlertDot) {
                if (avgCurrentRawVal > limitWarningCurrent) {
                    currentAlertBox.style.display = 'flex';
                    if (results.healthScore < 60) {
                        currentAlertBox.className = 'current-alert-box danger';
                        currentAlertDot.className = 'alert-icon-dot pulsing-red';
                        currentAlertText.innerHTML = `Alerta Crítica: El consumo de corriente elevado (<strong>${avgCurrentRawVal.toFixed(1)} A</strong>) sugiere fricción mecánica severa o sobrecarga. Inspeccionar lubricación de rodamientos de inmediato.`;
                    } else {
                        currentAlertBox.className = 'current-alert-box';
                        currentAlertDot.className = 'alert-icon-dot pulsing-orange';
                        currentAlertText.innerHTML = `Alerta: El consumo de corriente elevado (<strong>${avgCurrentRawVal.toFixed(1)} A</strong>) sugiere fricción mecánica. Inspeccionar lubricación de rodamientos.`;
                    }
                } else {
                    currentAlertBox.style.display = 'none';
                }
            }

            // Draw active chart on canvas
            if (canvas && canvas.style.display !== 'none') {
                window.SFA.drawChart(canvas);
            } else if (degradationCanvas && degradationCanvas.style.display !== 'none') {
                window.SFA.drawDegradationChart(degradationCanvas);
            }

            // Degradation Projection Alert Box
            const degradationAlertBox = document.getElementById('degradation-projection-alert');
            const degradationAlertText = document.getElementById('degradation-alert-text');
            if (degradationAlertBox && degradationAlertText) {
                if (results.healthScore < 98) {
                    degradationAlertBox.style.display = 'flex';
                    
                    let days = 0;
                    if (results.healthScore > 60) {
                        const divisor = (98 - results.healthScore) / 15;
                        days = divisor > 0 ? Math.round((results.healthScore - 60) / divisor) : 30;
                        degradationAlertText.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-right: 0.5rem;"></i> Se estima que la salud mecánica descenderá al umbral crítico del 60% en <strong>${days} días</strong> si continúa la tendencia actual.`;
                    } else {
                        degradationAlertText.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444; margin-right: 0.5rem;"></i> Alerta Crítica: La máquina ha superado el umbral de salud crítico (60%). Se requiere intervención de mantenimiento inmediata.`;
                    }
                } else {
                    degradationAlertBox.style.display = 'none';
                }
            }

            // Set diagnosis text
            document.getElementById('sfa-diagnosis-text').textContent = results.diagnosis;

            // Update recommendations list
            const recList = document.getElementById('sfa-recommendations-list');
            recList.innerHTML = '';
            results.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recList.appendChild(li);
            });

            // Apply chromatic severity class to recommendations card
            const recCard = document.getElementById('sfa-recommendations-card');
            if (recCard) {
                recCard.className = 'recommendations-card'; // Reset classes
                if (results.healthScore < 80) {
                    recCard.classList.add('severity-red');
                } else if (results.healthScore < 90) {
                    recCard.classList.add('severity-yellow');
                } else {
                    recCard.classList.add('severity-green');
                }
            }
            
            // Resize handler to redraw active chart on window resize
            if (!window.sfaResizeHandlerBound) {
                window.addEventListener('resize', () => {
                    if (resultsPanel.style.display === 'block') {
                        if (canvas && canvas.style.display !== 'none') {
                            window.SFA.drawChart(canvas);
                        } else if (degradationCanvas && degradationCanvas.style.display !== 'none') {
                            window.SFA.drawDegradationChart(degradationCanvas);
                        }
                    }
                });
                window.sfaResizeHandlerBound = true;
            }
        };

        // Tab click event listeners for switching charts
        if (tabBtnSpectral && tabBtnDegradation && canvas && degradationCanvas) {
            tabBtnSpectral.addEventListener('click', () => {
                tabBtnSpectral.classList.add('active');
                tabBtnDegradation.classList.remove('active');
                
                // Style updates (inline since styles.css has no custom definitions for active)
                tabBtnSpectral.style.background = 'rgba(197, 168, 128, 0.1)';
                tabBtnSpectral.style.border = '1px solid var(--color-primary-gold)';
                tabBtnSpectral.style.color = 'var(--color-primary-gold)';
                
                tabBtnDegradation.style.background = 'transparent';
                tabBtnDegradation.style.border = '1px solid transparent';
                tabBtnDegradation.style.color = 'var(--color-text-gray)';
                
                canvas.style.display = 'block';
                degradationCanvas.style.display = 'none';
                
                if (window.SFA.results) {
                    window.SFA.drawChart(canvas);
                }
            });
            
            tabBtnDegradation.addEventListener('click', () => {
                tabBtnDegradation.classList.add('active');
                tabBtnSpectral.classList.remove('active');
                
                // Style updates (inline since styles.css has no custom definitions for active)
                tabBtnDegradation.style.background = 'rgba(197, 168, 128, 0.1)';
                tabBtnDegradation.style.border = '1px solid var(--color-primary-gold)';
                tabBtnDegradation.style.color = 'var(--color-primary-gold)';
                
                tabBtnSpectral.style.background = 'transparent';
                tabBtnSpectral.style.border = '1px solid transparent';
                tabBtnSpectral.style.color = 'var(--color-text-gray)';
                
                canvas.style.display = 'none';
                degradationCanvas.style.display = 'block';
                
                if (window.SFA.results) {
                    window.SFA.drawDegradationChart(degradationCanvas);
                }
            });
        }

        // Return button from Paso 3 to Paso 1
        const btnBackToUpload = document.getElementById('btn-back-to-upload');
        if (btnBackToUpload) {
            btnBackToUpload.addEventListener('click', () => {
                showStep(1);
                resetWorkspace();
            });
        }

        // Action PDF button within Recommendations Card
        const btnPdfAction = document.getElementById('btn-pdf-action');
        if (btnPdfAction) {
            btnPdfAction.addEventListener('click', (e) => {
                if (window.currentAnalysisIsStandard) {
                    e.preventDefault();
                    alert("Función Bloqueada: El Plan Electromecánico Base ($300 USD) no incluye la generación de informes PDF certificados. Por favor, adquiera el Plan Total ($750 USD) o Planta Pro para habilitar esta función.");
                    const pricingSection = document.getElementById('servicios') || document.getElementById('ecosistema');
                    if (pricingSection) pricingSection.scrollIntoView({ behavior: 'smooth' });
                    return;
                }
                
                // Add print-action-only to body for compact output
                document.body.classList.add('print-action-only');
                
                // Trigger print dialog
                window.print();
                
                // Remove print-action-only class after dialog closes
                setTimeout(() => {
                    document.body.classList.remove('print-action-only');
                }, 1000);
            });
        }
        // Print lifecycle listeners to redraw canvas in print-friendly colors
        window.addEventListener('beforeprint', () => {
            window.SFA.isPrinting = true;
            if (resultsPanel && resultsPanel.style.display === 'block') {
                if (canvas && canvas.style.display !== 'none') {
                    window.SFA.drawChart(canvas);
                }
                if (degradationCanvas && degradationCanvas.style.display !== 'none') {
                    window.SFA.drawDegradationChart(degradationCanvas);
                }
            }
        });

        window.addEventListener('afterprint', () => {
            window.SFA.isPrinting = false;
            if (resultsPanel && resultsPanel.style.display === 'block') {
                if (canvas && canvas.style.display !== 'none') {
                    window.SFA.drawChart(canvas);
                }
                if (degradationCanvas && degradationCanvas.style.display !== 'none') {
                    window.SFA.drawDegradationChart(degradationCanvas);
                }
            }
        });
    }
});
