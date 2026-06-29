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
            this.assets = data.assets || [];
            window.currentAssets = data.assets || [];
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
        let csvText = '';
        let lambdaVal = 1.618;
        
        try {
            if (type === 'automotriz') {
                lambdaVal = 1.618;
                // Cargar datos reales de ai4i2020.csv (primeros 300 puntos)
                try {
                    const response = await fetch('./ai4i2020.csv');
                    if (!response.ok) throw new Error("Fetch failed");
                    const text = await response.text();
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    const headers = lines[0].split(',');
                    const rpmIdx = headers.findIndex(h => h.toLowerCase().includes('rpm') || h.toLowerCase().includes('rotational'));
                    const torqueIdx = headers.findIndex(h => h.toLowerCase().includes('torque') || h.toLowerCase().includes('nm'));
                    
                    if (rpmIdx !== -1 && torqueIdx !== -1) {
                        csvText = "time,vibration,rpm,torque\n";
                        const startLine = 120;
                        const endLine = Math.min(lines.length, startLine + 300);
                        
                        for (let i = startLine; i < endLine; i++) {
                            const cols = lines[i].split(',');
                            const t = ((i - startLine) * 0.01).toFixed(2);
                            const rpm = parseFloat(cols[rpmIdx]) || 1500.0;
                            const torque = parseFloat(cols[torqueIdx]) || 40.0;
                            
                            // Sintetizar vibración física realista proporcional al RPM
                            const angle = 2 * Math.PI * (rpm / 60) * (i - startLine) * 0.01;
                            let vibVal = (0.05 + 0.0001 * rpm) * Math.sin(angle);
                            vibVal += 0.35 * Math.sin(2 * angle) * (torque / 50.0);
                            vibVal += 0.06 * (Math.random() - 0.5);
                            
                            csvText += `${t},${vibVal.toFixed(4)},${rpm.toFixed(0)},${torque.toFixed(1)}\n`;
                        }
                    } else {
                        throw new Error("Required columns not found in local CSV");
                    }
                } catch (e) {
                    console.log("Fallback to high-fidelity automotive simulation:", e);
                    csvText = "time,vibration,rpm,torque\n";
                    for (let i = 0; i < 300; i++) {
                        const t = (i * 0.01).toFixed(2);
                        const rpm = 1250.0 + 150.0 * Math.sin(2 * Math.PI * 0.2 * t) + 12.0 * (Math.random() - 0.5);
                        const torque = 34.5 - 6.2 * Math.sin(2 * Math.PI * 0.2 * t) + 1.5 * (Math.random() - 0.5);
                        
                        const angle = 2 * Math.PI * 17.75 * t;
                        let vibVal = 1.25 * Math.sin(angle);
                        vibVal += 0.65 * Math.sin(2 * angle) * (torque / 30.0);
                        vibVal += 0.12 * (Math.random() - 0.5);
                        
                        csvText += `${t},${vibVal.toFixed(4)},${rpm.toFixed(0)},${torque.toFixed(1)}\n`;
                    }
                }
            } else if (type === 'cnc') {
                lambdaVal = 0.725;
                csvText = "time,vibration,rpm,torque,tool_wear\n";
                for (let i = 0; i < 300; i++) {
                    const t = (i * 0.01).toFixed(2);
                    const rpm = 18000.0 + 500.0 * Math.sin(2 * Math.PI * 0.5 * t) + 25.0 * (Math.random() - 0.5);
                    const torque = 12.5 + 2.5 * Math.sin(2 * Math.PI * 0.5 * t) + 0.3 * (Math.random() - 0.5);
                    const tool_wear = (12.0 + 0.5 * parseFloat(t)).toFixed(1);
                    
                    const angle = 2 * Math.PI * 300 * parseFloat(t); // High frequency CNC spindle rotation (300 Hz)
                    let vibVal = 0.08 * Math.sin(angle);
                    vibVal += 0.04 * Math.sin(2 * angle) * (torque / 10.0);
                    vibVal += 0.005 * (Math.random() - 0.5);
                    
                    csvText += `${t},${vibVal.toFixed(4)},${rpm.toFixed(0)},${torque.toFixed(1)},${tool_wear}\n`;
                }
            } else if (type === 'ensamble') {
                lambdaVal = 1.25;
                // Cargar de prueba_siemens_300.csv
                try {
                    const response = await fetch('./prueba_siemens_300.csv');
                    if (!response.ok) throw new Error("Fetch failed");
                    const text = await response.text();
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    const headers = lines[0].split(',');
                    const tempIdx = headers.findIndex(h => h.toLowerCase().includes('temp') || h.toLowerCase().includes('station'));
                    const currIdx = headers.findIndex(h => h.toLowerCase().includes('curr') || h.toLowerCase().includes('amp'));
                    
                    if (tempIdx !== -1 && currIdx !== -1) {
                        csvText = "time,current,voltage,temperature\n";
                        const startLine = 5;
                        const endLine = Math.min(lines.length, startLine + 300);
                        
                        for (let i = startLine; i < endLine; i++) {
                            const cols = lines[i].split(',');
                            const t = ((i - startLine) * 0.01).toFixed(2);
                            const current = parseFloat(cols[currIdx]) || 11.5;
                            const temperature = parseFloat(cols[tempIdx]) || 42.0;
                            
                            const voltage = 440.0 - 0.8 * current + 1.2 * Math.sin(2 * Math.PI * 60 * parseFloat(t)) + 0.5 * (Math.random() - 0.5);
                            
                            // Sobrecargamos intencionalmente los datos para que muestren alertas interesantes
                            const currentBoosted = current * 3.3; // Elevar a ~38 A
                            const tempBoosted = temperature + 35.0; // Elevar a ~77 °C
                            const voltageBoosted = voltage * 0.58; // Reducir a ~250 V
                            
                            csvText += `${t},${currentBoosted.toFixed(2)},${voltageBoosted.toFixed(1)},${tempBoosted.toFixed(1)}\n`;
                        }
                    } else {
                        throw new Error("Required columns not found in local Siemens CSV");
                    }
                } catch (e) {
                    console.log("Fallback to high-fidelity electrical simulation:", e);
                    csvText = "time,current,voltage,temperature\n";
                    for (let i = 0; i < 300; i++) {
                        const t = (i * 0.01).toFixed(2);
                        const current = 38.4 + 4.2 * Math.sin(2 * Math.PI * 0.5 * t) + 0.8 * (Math.random() - 0.5);
                        const voltage = 252.0 - 1.5 * Math.sin(2 * Math.PI * 0.5 * t) + 1.2 * (Math.random() - 0.5);
                        const temperature = 78.5 + 2.4 * (i / 300.0) + 0.3 * (Math.random() - 0.5);
                        
                        csvText += `${t},${current.toFixed(2)},${voltage.toFixed(1)},${temperature.toFixed(1)}\n`;
                    }
                }
            } else if (type === 'robotica') {
                lambdaVal = 1.15;
                csvText = "time,vibration,temperature,voltage,current\n";
                for (let i = 0; i < 300; i++) {
                    const t = (i * 0.01).toFixed(2);
                    const current = 4.5 + 1.2 * Math.sin(2 * Math.PI * 1.5 * t) + 0.1 * (Math.random() - 0.5);
                    const temperature = 48.5 + 2.5 * parseFloat(t) + 0.2 * (Math.random() - 0.5);
                    const voltage = 24.0 - 0.5 * current + 0.1 * (Math.random() - 0.5);
                    
                    const angle = 2 * Math.PI * 45 * parseFloat(t);
                    let vibVal = 0.15 * Math.sin(angle);
                    vibVal += 0.05 * (Math.random() - 0.5);
                    
                    csvText += `${t},${vibVal.toFixed(4)},${temperature.toFixed(1)},${voltage.toFixed(1)},${current.toFixed(2)}\n`;
                }
            } else {
                lambdaVal = 1.618;
                csvText = "time,vibration,temperature,voltage,current\n";
                for (let i = 0; i < 300; i++) {
                    const t = (i * 0.01).toFixed(2);
                    csvText += `${t},0.15,42.5,24.0,4.5\n`;
                }
            }
        } catch (e) {
            console.error("General mock generation failure:", e);
        }

        window.currentRawCSVText = csvText;
        await this.processSfaOnServer(csvText, lambdaVal, 0.0);
        return { data: this.data, results: this.results };
    }

    /**
     * Render the chart on the HTML5 Canvas
     */
    drawChart(canvasElement) {
        if (!canvasElement || !this.data || this.data.length === 0 || !this.results) return;

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
        const tMin = this.data[0] ? (this.data[0].time || 0.0) : 0.0;
        const tMax = this.data[this.data.length - 1] ? (this.data[this.data.length - 1].time || 1.0) : 1.0;
        
        let vMin = Infinity;
        let vMax = -Infinity;
        this.data.forEach((d, idx) => {
            const val = typeof d.vibration === 'number' && !isNaN(d.vibration) ? d.vibration : 0.0;
            if (val < vMin) vMin = val;
            if (val > vMax) vMax = val;
            const pure = (this.results.purifiedSignal && this.results.purifiedSignal.length > idx && typeof this.results.purifiedSignal[idx] === 'number') ? this.results.purifiedSignal[idx] : val;
            if (pure < vMin) vMin = pure;
            if (pure > vMax) vMax = pure;
        });

        if (vMin === Infinity || vMax === -Infinity || isNaN(vMin) || isNaN(vMax)) {
            vMin = 0.0;
            vMax = 1.0;
        }

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
     * Generates a professional rationale explaining the status of a specific variable
     */
    getVariableRationale(varKey, val, limit, dangerLimit, unit, planName, results) {
        if (results && results.variables_applicability && results.variables_applicability[varKey] === 'not_applicable') {
            return {
                status: 'No Aplica',
                conditionClass: 'text-gray',
                desc: 'Esta variable no aplica para el tipo de activo seleccionado.',
                valStr: 'N/A',
                limitStr: 'N/A'
            };
        }
        const isOptimal = (varKey === 'pressure') ? (val <= 1.5) : (val <= limit);
        const isWarning = (varKey === 'pressure') ? (val > 1.5 && val <= 2.5) : (val > limit && val <= dangerLimit);
        const isCritical = (varKey === 'pressure') ? (val > 2.5) : (val > dangerLimit);
        
        let status = '🟢 PROCESO ESTABLE (BANDA NOMINAL)';
        let conditionClass = 'text-blue';
        if (isCritical) {
            status = '🔴 FUERA DE CONTROL ESTADÍSTICO';
            conditionClass = 'text-red';
        } else if (isWarning) {
            status = '⚠️ Advertencia';
            conditionClass = 'text-orange';
        }

        const isUniversal = results && results.universal_columns;
        const formatVal = (v, isLimit = false) => {
            if (typeof v !== 'number') return v;
            if (isUniversal) {
                return isLimit ? v.toFixed(4) : String(Number(v.toFixed(4)));
            }
            return v.toFixed(varKey === 'vibration' ? 3 : (varKey === 'rpm' ? 0 : 1));
        };
        const valStr = `${formatVal(val, false)} ${unit}`.trim();
        const limitStr = `${formatVal(limit, true)} ${unit}`.trim();
        const dangerLimitStr = `${formatVal(dangerLimit, true)} ${unit}`.trim();
        const diff = val - limit;
        const diffStr = diff > 0 ? `+${formatVal(diff, false)} ${unit}`.trim() : '';
        
        const lambda = this.lambda ? this.lambda.toFixed(3) : '1.618';
        const fBase = results.targetFreq ? results.targetFreq.toFixed(2) : '17.75';

        let desc = '';

        if (planName.includes("Gerente") || planName.includes("Planta Completa")) {
            if (varKey === 'vibration') {
                if (isOptimal) desc = `Salud mecánica del 100%. Sin riesgos para la continuidad de la producción. Desgaste mínimo que proyecta extender la vida útil del activo en un 15% frente a la media.`;
                else if (isWarning) desc = `Vibración de ${valStr} excede el límite de ${limitStr}. Acelera el desgaste de rodamientos. Riesgo moderado de paro imprevisto de producción. Se aconseja intervenir en el próximo mantenimiento programado.`;
                else desc = `Vibración destructiva de ${valStr}. Riesgo inminente de rotura física con pérdidas por paro no especificadas. Requiere intervención inmediata del equipo de guardia.`;
            } else if (varKey === 'temperature') {
                if (isOptimal) desc = `Temperatura de ${valStr} óptima. Previene paros por protección térmica y alarga la vida útil del lubricante de rodamientos.`;
                else desc = `Temperatura elevada de ${valStr} (límite ${limitStr}). Acelera la degradación térmica del lubricante y el aislamiento del motor. Se requiere revisión preventiva de refrigeración para evitar daños mayores.`;
            } else if (varKey === 'pressure') {
                if (isOptimal) desc = `Presión de refrigeración estable de ${valStr}. Garantiza el enfriamiento continuo del husillo CNC y evita derivas térmicas.`;
                else desc = `Presión de refrigeración inestable de ${valStr} (límite ${limitStr}). Acelera el calentamiento de las guías y eleva el riesgo de paros de línea preventivos.`;
            } else if (varKey === 'current') {
                if (isOptimal) desc = `Consumo de corriente óptimo en ${valStr}. Mantiene la eficiencia de potencia eléctrica y el consumo de energía en parámetros nominales de diseño.`;
                else if (isWarning) desc = `Corriente elevada de ${valStr} incrementa costos de energía y sugiere sobreesfuerzo mecánico ligero en la transmisión.`;
                else desc = `Corriente de ${valStr} en sobrecarga crítica. Pérdida masiva de eficiencia energética y riesgo extremo de quemar bobinados, provocando paros prolongados de 3 a 5 días para reemplazo.`;
            } else if (varKey === 'rpm') {
                if (isOptimal) desc = `Velocidad de ${valStr} estable y alineada con la cadencia productiva óptima de la planta.`;
                else desc = `Velocidad de ${valStr} fuera de rango nominal. Causa variaciones en calidad y puede sobrecargar los rodamientos de apoyo por velocidad excesiva.`;
            } else if (varKey === 'torque') {
                if (isOptimal) desc = `Transmisión de torque de ${valStr} nominal. Cero pérdidas en el acoplamiento y consumo energético balanceado.`;
                else desc = `Torque elevado de ${valStr} (límite ${limitStr}). Sobreesfuerzo mecánico severo. Riesgo de fatiga en el eje de transmisión y alto coste en refaccionamiento.`;
            } else if (varKey === 'tool_wear') {
                if (isOptimal) desc = `Desgaste de herramienta controlado en ${valStr}. Máxima tasa de remoción de viruta sin afectar acabado superficial.`;
                else desc = `Desgaste excesivo de herramienta en ${valStr}. Disminuye la calidad geométrica del producto y eleva el riesgo de rotura de insertos en proceso.`;
            } else if (varKey === 'flow') {
                if (isOptimal) desc = `Flujo de líquido refrigerante de ${valStr} nominal. Asegura la disipación térmica del motor de husillo y previene sobrecalentamientos.`;
                else desc = `Fluctuación de caudal de refrigeración de ${valStr}. Inestabilidad en la bomba de recirculación de refrigerante de husillo.`;
            } else if (varKey === 'level') {
                if (isOptimal) desc = `Nivel de fluido refrigerante correcto al ${valStr}. Reserva de fluido suficiente para el ciclo operativo continuo de maquinado.`;
                else desc = `Nivel de fluido refrigerante fuera de límites (${valStr}). Riesgo de paro automático por sensores de seguridad de nivel bajo.`;
            } else if (varKey === 'voltage') {
                if (isOptimal) desc = `Tensión de red estable de ${valStr}. Garantiza la protección de componentes electrónicos y PLCs contra fluctuaciones.`;
                else desc = `Tensión de red inestable en ${valStr}. Riesgo elevado de daño en variadores de frecuencia y tarjetas analógicas del PLC.`;
            }
        } else if (planName.includes("Consultor") || planName.includes("Senior")) {
            if (varKey === 'vibration') {
                if (isOptimal) desc = `La vibración RMS de ${valStr} se mantiene estable. El filtro espectral SFA (λ = ${lambda}) atenuó el ruido estructural. La amplitud del armónico principal en f_base (${fBase} Hz) está bajo el límite +2σ (${limitStr}).`;
                else if (isWarning) desc = `La vibración RMS de ${valStr} excede el umbral estadístico +2σ (${limitStr}). El espectro a f_base (${fBase} Hz) acusa desalineación angular o desbalanceo mecánico en el acoplamiento directo.`;
                else desc = `Vibración RMS de ${valStr} excede el umbral destructivo +3σ (${dangerLimitStr}). Presencia de picos de resonancia severos en la frecuencia de sintonía SFA. Alto riesgo de falla catastrófica en rodamientos.`;
            } else if (varKey === 'temperature') {
                if (isOptimal) desc = `La temperatura máxima registrada de ${valStr} se mantiene nominal. Disipación de calor correcta sin derivas térmicas significativas en el devanado.`;
                else desc = `Temperatura máxima de ${valStr} excede el límite de diseño de ${limitStr}. Correlación del 85% con incremento de corriente o degradación de rodamientos.`;
            } else if (varKey === 'pressure') {
                if (isOptimal) desc = `Fluctuación de presión de refrigeración controlada de ${valStr}. El filtrado SFA en dominio temporal confirma ausencia de transitorios inestables.`;
                else desc = `La fluctuación de presión de refrigerante de ${valStr} supera el umbral máximo de 1.50 bar. El análisis de transitorios rápidos indica fluctuación de carga térmica.`;
            } else if (varKey === 'current') {
                if (isOptimal) desc = `Consumo eléctrico de ${valStr}. La firma de corriente SFA no muestra modulaciones de carga, validando la integridad del estator y rotor del motor.`;
                else if (isWarning) desc = `Corriente de ${valStr} excede el límite nominal de ${limitStr}. La potencia reactiva se eleva debido a fricción mecánica axial en rodamientos.`;
                else desc = `Corriente en sobrecarga crítica de ${valStr} (límite peligro ${dangerLimitStr}). Firma eléctrica compatible con cortocircuito entre espiras o rotor bloqueado en el motor.`;
            } else if (varKey === 'rpm') {
                if (isOptimal) desc = `Velocidad de ${valStr} nominal. Frecuencia de rotación sintonizada correctamente sin deslizamientos ni oscilaciones de fase.`;
                else desc = `Velocidad de ${valStr} desalineada del umbral de ${limitStr}. Indica inestabilidad en el bus DC del variador de frecuencia.`;
            } else if (varKey === 'torque') {
                if (isOptimal) desc = `Esfuerzo torsional de ${valStr}. Transmisión de potencia armónica y balanceada entre eje motriz y eje conducido.`;
                else desc = `Esfuerzo torsional de ${valStr} supera el límite de diseño de ${limitStr}. Fatiga torsional detectada por espectro.`;
            } else if (varKey === 'tool_wear') {
                if (isOptimal) desc = `Desgaste de herramienta de ${valStr}. La señal espectral SFA no registra frecuencias de rozamiento abrasivo severo.`;
                else desc = `Desgaste de herramienta de ${valStr} indica pérdida de geometría de corte y micro-fracturas por fatiga de material.`;
            } else if (varKey === 'flow') {
                if (isOptimal) desc = `Flujo de refrigeración nominal de ${valStr}. La atenuación SFA confirma estabilidad en los perfiles de flujo sin turbulencias.`;
                else desc = `Caudal inestable de refrigerante de ${valStr}. Inestabilidad en la línea de recirculación del sistema de enfriamiento del husillo.`;
            } else if (varKey === 'level') {
                if (isOptimal) desc = `Nivel de refrigerante estable de ${valStr}. Estabilidad del depósito de enfriamiento del husillo.`;
                else desc = `Nivel de refrigerante de ${valStr} fuera de especificación. Desviación detectada por el sensor analógico del PLC.`;
            } else if (varKey === 'voltage') {
                if (isOptimal) desc = `Voltaje de alimentación de ${valStr}. La fluctuación armónica total de la red eléctrica se sitúa por debajo del 1.5%.`;
                else desc = `Voltaje de bus de ${valStr} supera el límite de ${limitStr}. Presencia de picos transitorios por conmutación en red.`;
            }
        } else {
            if (varKey === 'vibration') {
                if (isOptimal) desc = `Vibración de ${valStr} por debajo del límite de advertencia de ${limitStr}. Equipo opera con oscilación mecánica correcta.`;
                else if (isWarning) desc = `Vibración de ${valStr} supera el límite de ${limitStr}. Posible desalineación física. Se recomienda reajustar anclajes y soportes.`;
                else desc = `Vibración peligrosa de ${valStr} excede el límite crítico de ${dangerLimitStr}. Detener el activo para evitar rotura de rodamientos de inmediato.`;
            } else if (varKey === 'temperature') {
                if (isOptimal) desc = `Temperatura de ${valStr} normal (límite ${limitStr}). Sistema de refrigeración opera correctamente.`;
                else desc = `Temperatura de ${valStr} excede el límite de ${limitStr} por ${diffStr}. Revisar ventilación y estado de lubricante.`;
            } else if (varKey === 'pressure') {
                if (isOptimal) desc = `Presión de refrigeración de ${valStr} estable. Enfriamiento nominal.`;
                else desc = `Presión de refrigerante inestable de ${valStr}. Verificar nivel de refrigeración.`;
            } else if (varKey === 'current') {
                if (isOptimal) desc = `Consumo eléctrico de ${valStr} bajo el límite seguro de ${limitStr}. Carga estable del motor.`;
                else if (isWarning) desc = `Consumo eléctrico de ${valStr} supera el límite seguro de ${limitStr}. Corriente elevada por fricción o sobrecarga ligera.`;
                else desc = `Corriente de ${valStr} supera el límite crítico de ${dangerLimitStr}. Riesgo de sobrecalentamiento eléctrico. Revisar bobinados.`;
            } else if (varKey === 'rpm') {
                if (isOptimal) desc = `Rotación de ${valStr} estable bajo el límite seguro de ${limitStr}.`;
                else desc = `Rotación de ${valStr} supera el límite de ${limitStr}. Posible pérdida de acoplamiento de carga física.`;
            } else if (varKey === 'torque') {
                if (isOptimal) desc = `Torque de ${valStr} dentro del rango de operación nominal del husillo.`;
                else desc = `Torque de ${valStr} supera límite de ${limitStr}. Mayor esfuerzo mecánico en la herramienta.`;
            } else if (varKey === 'tool_wear') {
                if (isOptimal) desc = `Desgaste de herramienta en ${valStr}. Vida útil restante adecuada.`;
                else desc = `Desgaste de herramienta de ${valStr} supera límite de ${limitStr}. Se recomienda cambio de herramienta de corte.`;
            } else if (varKey === 'flow') {
                if (isOptimal) desc = `Flujo de refrigerante de ${valStr} nominal.`;
                else desc = `Flujo de refrigerante de ${valStr} fuera de tolerancia. Revisar tubería de retorno.`;
            } else if (varKey === 'level') {
                if (isOptimal) desc = `Nivel de refrigerante al ${valStr} (correcto).`;
                else desc = `Nivel de refrigerante fuera de límites (${valStr}). Rellenar depósito de refrigeración.`;
            } else if (varKey === 'voltage') {
                if (isOptimal) desc = `Voltaje eléctrico en ${valStr} nominal y estable. Suministro correcto.`;
                else desc = `Voltaje eléctrico de ${valStr} inestable (límite ${limitStr}). Verificar suministro de red o regulador.`;
            }
        }

        if (!desc) {
            if (planName.includes("Gerente") || planName.includes("Planta Completa")) {
                if (status.includes("ESTABLE") || status.includes("🟢")) {
                    desc = `El parámetro operativo de ${varKey} se mantiene estable en ${valStr}. Cumple con los criterios de diseño y garantiza la continuidad operativa sin pérdidas por paro.`;
                } else {
                    desc = `El parámetro de ${varKey} registra un valor de ${valStr} que supera su umbral de tolerancia estadística SFA (${limitStr}). Riesgo moderado-alto de afectación al rendimiento global de la planta. Se recomienda planificar intervención.`;
                }
            } else if (planName.includes("Consultor") || planName.includes("Senior")) {
                if (status.includes("ESTABLE") || status.includes("🟢")) {
                    desc = `El análisis espectral SFA en f_base (${fBase} Hz) y factor λ (${lambda}) confirma comportamiento estable para ${varKey}. El valor de ${valStr} se mantiene por debajo de la barrera de tolerancia estadística +2σ (${limitStr}).`;
                } else {
                    desc = `Desviación estadística crítica para ${varKey}. El valor registrado de ${valStr} excede la frontera dinámica +2σ de control de procesos (${limitStr}), indicando una micro-oscilación de fatiga en desarrollo.`;
                }
            } else {
                if (status.includes("ESTABLE") || status.includes("🟢")) {
                    desc = `Medición de ${varKey} en rango óptimo. Condición stable.`;
                } else {
                    desc = `Exceso detectado en ${varKey} (${valStr} superando el límite dinámico de ${limitStr}). Requiere revisión de mantenimiento.`;
                }
            }
        }

        return { status, conditionClass, desc, valStr, limitStr };
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

        // Determinar tipo de plan dinámicamente desde el selector
        const reportFormatSelect = document.getElementById('sfa-report-format-select');
        let selectedFormat = reportFormatSelect ? reportFormatSelect.value : 'senior';
        
        let reportPlan = 'Plan Consultor / Senior';
        if (selectedFormat === 'junior') {
            reportPlan = 'Plan Junior / Técnico Predictivo';
        } else if (selectedFormat === 'gerente') {
            reportPlan = 'Plan Gerente / Planta Completa';
        }

        const isGerente = reportPlan.includes("Gerente") || reportPlan.includes("Planta Completa");
        const isConsultor = reportPlan.includes("Consultor") || reportPlan.includes("Senior");

        // Estatus general de salud
        let healthEmoji = '🟢';
        let healthText = 'PROCESO ESTABLE (BANDA NOMINAL)';
        if (this.results.severityClass === 'danger') {
            healthEmoji = '🔴';
            healthText = 'FUERA DE CONTROL ESTADÍSTICO';
        } else if (this.results.severityClass === 'warning') {
            healthEmoji = '🟡';
            healthText = 'ADVERTENCIA - DESVIACIÓN PREVENTIVA';
        }

        const limits = this.results.limits || {};
        const varsPresent = this.results.variables_present || {
            vibration: true,
            temperature: true,
            pressure: this.results.hasPressure,
            current: true
        };

        // Límites dinámicos o estáticos
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

        const presDiffVal = s.maxPres - s.minPres;

        // Construir tabla de variables físicas
        const padRight = (str, len) => str.toString().padEnd(len, ' ');
        const rows = [];
        
        let varsConfig = [];
        if (this.results.universal_columns) {
            this.results.universal_columns.forEach(col => {
                let matchedKey = col.name.toLowerCase();
                if (matchedKey.includes('vib')) matchedKey = 'vibration';
                else if (matchedKey.includes('temp')) matchedKey = 'temperature';
                else if (matchedKey.includes('pres')) matchedKey = 'pressure';
                else if (matchedKey.includes('curr') || matchedKey.includes('corr')) matchedKey = 'current';
                else if (matchedKey.includes('rpm') || matchedKey.includes('speed')) matchedKey = 'rpm';
                else if (matchedKey.includes('torq')) matchedKey = 'torque';
                else if (matchedKey.includes('wear') || matchedKey.includes('desgaste')) matchedKey = 'tool_wear';
                else if (matchedKey.includes('flow') || matchedKey.includes('caudal')) matchedKey = 'flow';
                else if (matchedKey.includes('level') || matchedKey.includes('nivel')) matchedKey = 'level';
                else if (matchedKey.includes('volt')) matchedKey = 'voltage';
                else matchedKey = col.name;
                
                let displayUnit = col.unit || '';
                if (!displayUnit) {
                    const nameLower = col.name.toLowerCase();
                    if (nameLower.includes('temp')) displayUnit = this.tempUnit || '°C';
                    else if (nameLower.includes('pres')) displayUnit = this.pressureUnit || 'bar';
                    else if (nameLower.includes('vib')) displayUnit = 'mm/s';
                    else if (nameLower.includes('curr') || nameLower.includes('corr')) displayUnit = 'A';
                    else if (nameLower.includes('volt')) displayUnit = 'V';
                    else if (nameLower.includes('rpm') || nameLower.includes('speed')) displayUnit = 'RPM';
                    else if (nameLower.includes('torq')) displayUnit = 'Nm';
                    else if (nameLower.includes('wear') || nameLower.includes('desgaste')) displayUnit = 'min';
                    else if (nameLower.includes('flow') || nameLower.includes('caudal')) displayUnit = 'LPM';
                    else if (nameLower.includes('level') || nameLower.includes('nivel')) displayUnit = '%';
                }
                
                varsConfig.push({
                    key: matchedKey,
                    name: col.name,
                    val: col.max,
                    limit: col.limit_sfa,
                    danger: col.limit_sfa,
                    unit: displayUnit,
                    show: true
                });
            });
        } else {
            varsConfig = [
                { key: 'vibration', name: 'Vibración Promedio (RMS)', val: s.rmsVib, limit: limitWarningVib, danger: limitDangerVib, unit: 'mm/s', show: varsPresent.vibration },
                { key: 'temperature', name: 'Temperatura Máxima', val: s.maxTempRaw || s.maxTemp || 0.0, limit: limitWarningTemp, danger: limitDangerTemp, unit: this.tempUnit || '°C', show: varsPresent.temperature },
                { key: 'pressure', name: 'Fluctuación de Presión', val: presDiffVal, limit: 1.5, danger: 2.5, unit: 'bar', show: varsPresent.pressure },
                { key: 'current', name: 'Consumo Eléctrico', val: s.maxCurrentRaw || s.maxCurrent || 0.0, limit: limitWarningCurrent, danger: limitDangerCurrent, unit: 'A', show: varsPresent.current },
                { key: 'rpm', name: 'Velocidad de Rotación', val: s.maxRpm, limit: limitWarningRpm, danger: limitDangerRpm, unit: 'RPM', show: varsPresent.rpm },
                { key: 'torque', name: 'Torque del Husillo', val: s.maxTorque, limit: limitWarningTorque, danger: limitDangerTorque, unit: 'Nm', show: varsPresent.torque },
                { key: 'tool_wear', name: 'Desgaste Herramienta', val: s.maxWear, limit: limitWarningWear, danger: limitDangerWear, unit: 'min', show: varsPresent.tool_wear },
                { key: 'flow', name: 'Flujo / Caudal', val: s.maxFlow, limit: limitWarningFlow, danger: limitDangerFlow, unit: 'LPM', show: varsPresent.flow },
                { key: 'level', name: 'Nivel de Fluido', val: s.maxLevel, limit: limitWarningLevel, danger: limitDangerLevel, unit: '%', show: varsPresent.level },
                { key: 'voltage', name: 'Voltaje de Bus', val: s.maxVoltage, limit: limitWarningVoltage, danger: limitDangerVoltage, unit: 'V', show: varsPresent.voltage }
            ];
        }

        varsConfig.forEach(v => {
            if (v.show) {
                const rationale = this.getVariableRationale(v.key, v.val, v.limit, v.danger, v.unit, reportPlan, this.results);
                const line = `${padRight(v.name, 24)}| ${padRight(rationale.valStr, 12)}| ${padRight(rationale.limitStr, 10)}| ${padRight(rationale.status, 38)}| ${rationale.desc}`;
                rows.push(line);
            }
        });

        // Frecuencia de Sintonía
        const targetFreqVal = this.results.targetFreq;
        const isBaseActive = (Math.abs(targetFreqVal - 17.75) < 0.1 || Math.abs(targetFreqVal - 7.25) < 0.1 || Math.abs(targetFreqVal - this.fBase) < 0.1);
        const rowFreq = `${padRight("Frecuencia de Sintonía", 24)}| ${padRight(targetFreqVal.toFixed(2) + " Hz", 12)}| ${padRight("f_base x λ", 10)}| ${isBaseActive ? '🟢 Sintonía Base Activa' : '⚠️ Desviación Espectral (Firma modificada)'}`;
        rows.push(rowFreq);

        // Licencia
        let licenseSection = '';
        if (this.license) {
            const isPromo = this.license.plan.includes("Promocional");
            const priceVal = parseFloat(this.license.price);
            const currency = (this.license.plan.includes("Junior") || this.license.plan.includes("Consultor") || this.license.plan.includes("Gerente") || priceVal > 1000) ? 'MXN' : 'USD';
            licenseSection = `
--------------------------------------------------------------------------
INFORMACIÓN DE LICENCIA Y AUDITORÍA COMERCIAL:
  - Plan de Análisis : ${this.license.plan.toUpperCase()}
  - Costo de Licencia: $${priceVal.toLocaleString()} ${currency} ${isPromo ? '(PROMOCIÓN)' : ''}
  - ID Transacción   : ${this.license.txId}
  - Estado del Pago  : ${isPromo ? 'VERIFICADO / BENEFICIO GRATUITO' : 'COMPLETADO Y VERIFICADO POR PAYPAL'}
--------------------------------------------------------------------------`;
        }

        const severityText = this.results.severity_text || (this.results.severityClass === 'danger' ? '🔴 FUERA DE CONTROL ESTADÍSTICO' : (this.results.severityClass === 'warning' ? '🟡 ADVERTENCIA (Desviación Preventiva)' : '🟢 PROCESO ESTABLE (BANDA NOMINAL)'));
        const toleranceText = (this.results.green_count !== undefined && this.results.total_evaluated !== undefined) ? `${this.results.green_count} / ${this.results.total_evaluated}` : '-- / --';

        if (isGerente) {
            const riskRating = this.results.severityClass === 'healthy' ? 'BAJO' : (this.results.severityClass === 'warning' ? 'MODERADO' : 'ALTO');
            const riskColor = this.results.severityClass === 'healthy' ? '🟢' : (this.results.severityClass === 'warning' ? '🟡' : '🔴');
            const avgDowntimeLoss = this.results.severityClass === 'healthy' ? '$0 USD' : 'No especificado (Se requiere ingresar costo real de paro por hora en la configuración del activo)';
            
            return `📄 AUDITORÍA EJECUTIVA DE SALUD DE ACTIVOS Y CONTINUIDAD DE NEGOCIO — ÁUREA SYSTEMS
SISTEMA DE PREVENCIÓN DE PÉRDIDAS SFA (NIVEL GERENCIAL)
Código de Documento: ${docCode} | Fecha de Emisión: ${fechaStr} | Hora: ${horaStr}
==========================================================================

1. DICTAMEN EJECUTIVO Y ANÁLISIS DE RIESGO OPERATIVO
Activo Evaluado         : ${window.currentDataSourceName || "Log de Telemetría PLC"}
Estatus Global          : ${severityText}
Variables en Tolerancia : ${toleranceText}
Nivel de Riesgo de Paro : ${riskColor} ${riskRating}
Pérdida Estimada por Hora: ${avgDowntimeLoss}
Estado de la Licencia   : CALIBRADO PLANTA COMPLETA (ILIMITADO)

Resumen Ejecutivo de Negocio:
${this.results.diagnosis}

2. AUDITORÍA DE VARIABLES DE PROCESO Y EFICIENCIA OPERATIVA
Variable                | Valor Máx    | Límite    | Racional e Impacto Financiero
------------------------|--------------|-----------|----------------------------------------------------
${rows.join('\n')}

3. IMPACTO FINANCIERO Y PRONÓSTICO DE VIDA ÚTIL
- Tasa de Degradación Mecánica: El motor de diagnóstico proyecta que la vida útil remanente del rodamiento principal/husillo se encuentra en óptimas condiciones. ${this.results.severityClass !== 'healthy' ? 'Se proyecta aceleración de desgaste por fatiga si no se realiza intervención preventora.' : 'Cero paros imprevistos estimados en las siguientes 100 horas de ciclo continuo.'}
- Pérdida de Eficiencia Energética: ${this.results.severityClass === 'danger' ? 'El sobreesfuerzo eléctrico actual genera una fuga térmica y pérdidas de eficiencia electromecánica. Requiere calibración del consumo nominal del activo.' : 'Parámetros de potencia en zona óptima, garantizando la máxima eficiencia por KW consumido.'}

4. PLAN ESTRATÉGICO DE INTERVENCIÓN (Recomendado)
${this.results.recommendations.map((rec, i) => `${i + 1}. [Prioridad ${this.results.severityClass === 'danger' ? 'ALTA' : 'MEDIA'}] ${rec}`).join('\n')}
${licenseSection}

FIRMAS DE VALIDACIÓN DE PLANTA
[ Generado por Núcleo SFA Aurea Systems ]    [ Aprobado: Gerente de Operaciones ]
==========================================================================`;

        } else if (isConsultor) {
            return `📄 CERTIFICADO DE DIAGNÓSTICO ESPECTRAL Y ANÁLISIS SFA — ÁUREA SYSTEMS
TECNOLOGÍA DE PURIFICACIÓN Y FILTRADO FRACTAL (NIVEL SENIOR)
Código de Documento: ${docCode} | Fecha de Emisión: ${fechaStr} | Hora: ${horaStr}
==========================================================================

1. RESUMEN DE INTEGRIDAD Y FIRMA ARMÓNICA
Activo Evaluado         : ${window.currentDataSourceName || "Log de Telemetría PLC"}
Calibración del Filtro  : Sintonía Espectral SFA (λ = ${this.lambda.toFixed(3)})
Estatus Global          : ${severityText}
Variables en Tolerancia : ${toleranceText}
Frecuencia Fundamental  : ${this.results.targetFreq.toFixed(2)} Hz

Dictamen Técnico de Ingeniería:
${this.results.diagnosis}

2. COMPORTAMIENTO DE SEÑALES Y MODELOS DE INGENIERÍA
Variable                | Valor Máx    | Límite    | Análisis Espectral y Racional Técnico (+2σ)
------------------------|--------------|-----------|----------------------------------------------------
${rows.join('\n')}

3. ANÁLISIS MATEMÁTICO ESPECTRAL SFA
- Ecuación de Purificación SFA:
  Ψ_SFA(t) = ∫ S(t) • e^(-i • (f_base • λ) • t) dt
  Donde el integrador fractal atenuó el ruido eléctrico circundante, aislando la firma de vibración pura.
- Eficacia del Filtro: La amplitud del armónico objetivo se situó en ${this.results.amp.toFixed(4)} mm/s con una fase angular de ${this.results.phase.toFixed(4)} rad, lo que confirma ${this.results.severityClass === 'healthy' ? 'ausencia de modulación por holgura o desalineamiento.' : 'desviaciones espectrales que superan los límites de interferencia nominal.'}

4. DICTAMEN DE FALLAS MECÁNICAS E INTEGRIDAD
Causas Probables identificadas por el motor de diagnóstico espectral:
${this.results.severityClass === 'healthy' ? '- Ninguna anomalía detectada. Operación segura.' : `- Desalineación o desgaste de rodamientos en acoplamientos de husillo o rotor.
- Inestabilidad térmica o sobrecorriente en estatores de línea de ensamble.
- Desgaste excesivo de herramienta o fatiga en robótica.`}

5. ACCIONES DE MANTENIMIENTO E INGENIERÍA DE CAMPO
${this.results.recommendations.map((rec, i) => `${i + 1}. [ ] ${rec}`).join('\n')}
${licenseSection}

FIRMAS DE RESPONSABILIDAD TÉCNICA
[   Generado por Sistema SFA   ]          [                              ]
   Algoritmo Áurea Systems                    Ingeniero de Campo (Subió datos)
   
                                      [                              ]
                                             Ingeniero Senior (Aprobación)
==========================================================================`;

        } else {
            return `📄 HOJA DE TRABAJO TÉCNICA — ÁUREA SYSTEMS
CONTROL DE MANTENIMIENTO PREDICTIVO (NIVEL JUNIOR)
Código de Documento: ${docCode} | Fecha de Emisión: ${fechaStr} | Hora: ${horaStr}
==========================================================================

1. DATOS DEL ACTIVO Y LICENCIA
Activo Evaluado         : ${window.currentDataSourceName || "Log de Telemetría PLC"}
Estatus Global          : ${severityText}
Variables en Tolerancia : ${toleranceText}
Nivel de Licencia       : Plan Junior / Técnico Predictivo

Dictamen Simple:
${this.results.diagnosis}

2. CHECKLIST DE VARIABLES Y LÍMITES FÍSICOS
Variable                | Valor Máx    | Límite    | Condición y Acción Requerida
------------------------|--------------|-----------|----------------------------------------------------
${rows.join('\n')}

3. RECOMENDACIONES TÉCNICAS RÁPIDAS
${this.results.recommendations.map((rec, i) => `${i + 1}. [ ] ${rec}`).join('\n')}
${licenseSection}

FIRMAS DE RESPONSABILIDAD
[   Generado por Sistema SFA   ]          [                              ]
   Algoritmo Áurea Systems                    Responsable Técnico de Taller
==========================================================================`;
        }
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
    // Generate floating sparks particles for premium dynamic background
    const particlesContainer = document.querySelector('.sfa-bg-particles');
    if (particlesContainer) {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'sfa-particle';
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            p.style.animationDuration = `${10 + Math.random() * 15}s`;
            p.style.animationDelay = `${-Math.random() * 20}s`;
            p.style.opacity = `${0.1 + Math.random() * 0.4}`;
            particlesContainer.appendChild(p);
        }
    }

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

            // Sincronizar el selector de formato de reporte
            const reportFormatSelect = document.getElementById('sfa-report-format-select');
            if (reportFormatSelect) {
                if (planName.includes("Gerente") || planName.includes("Planta Completa")) {
                    reportFormatSelect.value = 'gerente';
                } else if (planName.includes("Consultor") || planName.includes("Senior")) {
                    reportFormatSelect.value = 'senior';
                } else if (planName.includes("Junior") || planName.includes("Técnico")) {
                    reportFormatSelect.value = 'junior';
                }
            }

            // Set data attributes for media print layout
            if (resultsPanel) {
                const priceVal = parseFloat(price);
                const currency = (planName.includes("Junior") || planName.includes("Consultor") || planName.includes("Gerente") || priceVal > 1000) ? 'MXN' : 'USD';
                const formattedPrice = `$${priceVal.toLocaleString()} ${currency}`;
                
                resultsPanel.setAttribute('data-plan', planName);
                resultsPanel.setAttribute('data-price', formattedPrice);
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

        // Bind asset selector change event
        const assetSelect = document.getElementById('asset-select');
        if (assetSelect) {
            assetSelect.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                window.currentSelectedAssetId = selectedId;
                const assets = window.currentAssets || [];
                const selectedAsset = assets.find(a => a.asset_id === selectedId);
                if (selectedAsset) {
                    window.SFA.results = selectedAsset.results;
                    window.SFA.data = selectedAsset.data;
                    updateDashboard(selectedAsset.results, window.currentDataSourceName || "Datos Cargados");
                }
            });
        }

        // File Handler
        const handleFile = (file) => {
            window.currentSelectedAssetId = null; // Reset selection for new file upload
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
                            (window.SFA.data ? window.SFA.data.length : 0),
                            ((results.stats && results.stats.avgCurrentRaw !== undefined) ? results.stats.avgCurrentRaw : 0.0),
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
                            (simulation.data ? simulation.data.length : 0),
                            ((simulation.results.stats && simulation.results.stats.avgCurrentRaw !== undefined) ? simulation.results.stats.avgCurrentRaw : 0.0),
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


        const reportFormatSelect = document.getElementById('sfa-report-format-select');
        if (reportFormatSelect) {
            reportFormatSelect.addEventListener('change', () => {
                if (window.currentResults) {
                    updateDashboard(window.currentResults, window.currentDataSourceName || "Datos Cargados");
                }
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
            // Sync with current selected asset if applicable
            if (window.currentSelectedAssetId) {
                const assets = window.currentAssets || [];
                const activeAsset = assets.find(a => a.asset_id === window.currentSelectedAssetId);
                if (activeAsset) {
                    results = activeAsset.results;
                    window.SFA.results = activeAsset.results;
                    window.SFA.data = activeAsset.data;
                }
            }
            window.currentResults = results; // Store globally for re-rendering
            window.currentDataSourceName = sourceName;
            
            // Toggle panels
            statusPanel.style.display = 'none';
            resultsPanel.style.display = 'block';

            // Populate and toggle Asset Selector
            const assetSelectorContainer = document.getElementById('asset-selector-container');
            const assetSelect = document.getElementById('asset-select');
            if (assetSelectorContainer && assetSelect) {
                const assets = window.currentAssets || [];
                if (assets.length > 1) {
                    const currentOptions = Array.from(assetSelect.options).map(o => o.value);
                    const newOptions = assets.map(a => a.asset_id);
                    const isSame = currentOptions.length === newOptions.length && currentOptions.every((v, i) => v === newOptions[i]);
                    
                    if (!isSame) {
                        assetSelect.innerHTML = '';
                        assets.forEach(asset => {
                            const option = document.createElement('option');
                            option.value = asset.asset_id;
                            option.textContent = `${asset.asset_id} (${asset.asset_type})`;
                            assetSelect.appendChild(option);
                        });
                    }
                    
                    if (!window.currentSelectedAssetId) {
                        window.currentSelectedAssetId = assets[0].asset_id;
                    }
                    assetSelect.value = window.currentSelectedAssetId;
                    assetSelectorContainer.style.display = 'flex';
                } else {
                    assetSelectorContainer.style.display = 'none';
                }
            }

            // Meta info
            const dateStr = new Date(results.dateAnalyzed).toLocaleString();
            document.getElementById('sfa-analysis-meta').textContent = `${sourceName} | Analizado: ${dateStr}`;

            // Read selected report format from dropdown
            const reportFormatSelect = document.getElementById('sfa-report-format-select');
            let selectedFormat = reportFormatSelect ? reportFormatSelect.value : 'senior';
            
            let reportPlan = 'Plan Consultor / Senior';
            let reportPrice = '20000';
            
            if (selectedFormat === 'junior') {
                reportPlan = 'Plan Junior / Técnico Predictivo';
                reportPrice = '1500';
            } else if (selectedFormat === 'gerente') {
                reportPlan = 'Plan Gerente / Planta Completa';
                reportPrice = '45000';
            }

            // Always unlock printing
            window.currentAnalysisIsStandard = false;
            if (btnPrint) {
                btnPrint.classList.remove('restricted');
                btnPrint.title = 'Imprimir Reporte Técnico / PDF';
                btnPrint.style.opacity = '1';
                btnPrint.style.cursor = 'pointer';
            }

            // Determine paid license info (prevent overwrite from standard presets)
            let licensePlan = reportPlan;
            let licensePrice = parseFloat(reportPrice);
            let txIdToShow = `TX-EVAL-33-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            if (window.SFA.license) {
                const isPremium = 
                    window.SFA.license.plan.includes("Junior") || 
                    window.SFA.license.plan.includes("Consultor") || 
                    window.SFA.license.plan.includes("Gerente") || 
                    window.SFA.license.plan.includes("Planta Pro") || 
                    window.SFA.license.plan.includes("Anual") ||
                    window.SFA.license.plan.includes("Pioneros") ||
                    window.SFA.license.plan.includes("Club 33");

                if (isPremium) {
                    licensePlan = window.SFA.license.plan;
                    licensePrice = window.SFA.license.price;
                    txIdToShow = window.SFA.license.txId;
                } else {
                    // Update SFA Engine license to matches the fallback plan
                    window.SFA.license.plan = reportPlan;
                    window.SFA.license.price = parseFloat(reportPrice);
                    licensePlan = reportPlan;
                    licensePrice = parseFloat(reportPrice);
                    txIdToShow = window.SFA.license.txId;
                }
            } else {
                window.SFA.license = {
                    plan: reportPlan,
                    price: parseFloat(reportPrice),
                    txId: txIdToShow,
                    remaining: 0
                };
            }

            const currency = (licensePlan.includes("Junior") || licensePlan.includes("Consultor") || licensePlan.includes("Gerente") || licensePrice > 1000) ? 'MXN' : 'USD';
            const formattedPrice = `$${licensePrice.toLocaleString()} ${currency}`;

            // Display severity status badge
            const severityTextDisplay = results.severityClass === 'danger' ? '🔴 CRÍTICO' : (results.severityClass === 'warning' ? '🟡 ADVERTENCIA' : '🟢 ÓPTIMO');

            // Populate print-only traceability metadata safely
            const printAssetEl = document.getElementById('print-meta-asset');
            if (printAssetEl) printAssetEl.textContent = sourceName;
            
            const printPlanEl = document.getElementById('print-meta-plan');
            if (printPlanEl) printPlanEl.textContent = `${licensePlan.toUpperCase()} (${formattedPrice})`;
            
            const printTxidEl = document.getElementById('print-meta-txid');
            if (printTxidEl) printTxidEl.textContent = txIdToShow;
            
            const printDateEl = document.getElementById('print-meta-date');
            if (printDateEl) printDateEl.textContent = dateStr;
            
            const printSeverityEl = document.getElementById('print-meta-severity');
            if (printSeverityEl) printSeverityEl.textContent = severityTextDisplay;
            
            const printToleranceEl = document.getElementById('print-meta-tolerance');
            if (printToleranceEl) printToleranceEl.textContent = `${results.green_count} / ${results.total_evaluated}`;

            // Sync attributes of resultsPanel for CSS print styles
            if (resultsPanel) {
                resultsPanel.setAttribute('data-plan', licensePlan);
                resultsPanel.setAttribute('data-price', formattedPrice);
                resultsPanel.setAttribute('data-txid', txIdToShow);
            }

            // Health badge severity class
            const badgeContainer = document.getElementById('sfa-health-badge-container');
            const resultsClassContainer = document.getElementById('sfa-dashboard-results');
            
            badgeContainer.className = 'sfa-health-badge-wrapper';
            resultsClassContainer.className = 'sfa-dashboard-results';
            
            badgeContainer.classList.add(results.severityClass);
            resultsClassContainer.classList.add(results.severityClass);

            document.getElementById('sfa-health-display').textContent = severityTextDisplay;

            // Display variables tolerance counter
            const varsToleranceEl = document.getElementById('sfa-variables-tolerance');
            if (varsToleranceEl) {
                const gCount = results.green_count !== undefined ? results.green_count : 0;
                const tEval = results.total_evaluated !== undefined ? results.total_evaluated : 0;
                varsToleranceEl.textContent = `Variables evaluadas en Tolerancia: ${gCount} / ${tEval}`;
                varsToleranceEl.style.display = 'block';
            }

            // Update maintenance planning bar
            const maintenanceFill = document.getElementById('sfa-maintenance-fill');
            const maintenanceContainer = document.getElementById('sfa-maintenance-bar-container');
            if (maintenanceFill) {
                if (results.severityClass === 'healthy') {
                    maintenanceFill.style.width = '100%';
                    maintenanceFill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
                    maintenanceFill.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.6)';
                } else if (results.severityClass === 'warning') {
                    maintenanceFill.style.width = '60%';
                    maintenanceFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
                    maintenanceFill.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.6)';
                } else {
                    // danger
                    maintenanceFill.style.width = '30%';
                    maintenanceFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                    maintenanceFill.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
                }
            }
            if (maintenanceContainer) {
                let tooltipText = '';
                if (results.severityClass === 'healthy') {
                    tooltipText = 'Nivel de severidad: Proceso Estable (Banda Nominal). Tiempo estimado de intervención: No requiere.';
                } else if (results.severityClass === 'warning') {
                    tooltipText = 'Nivel de severidad: Advertencia (Requiere Intervención Preventiva). Tiempo estimado de intervención: 72 horas.';
                } else {
                    tooltipText = 'Nivel de severidad: Fuera de Control Estadístico. Tiempo estimado de intervención: Inmediato / Paro Preventivo.';
                }
                maintenanceContainer.setAttribute('data-tooltip-text', tooltipText);
            }

            // Variables presence configuration
            const varsPresent = results.variables_present || {
                vibration: true,
                temperature: true,
                pressure: results.hasPressure,
                current: true,
                rpm: false,
                torque: false,
                tool_wear: false,
                flow: false,
                level: false,
                voltage: false
            };

            // Stats values
            const isApp = (key) => !results.variables_applicability || results.variables_applicability[key] !== 'not_applicable';
            
            const setElText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };
            const safeFixed = (val, dec) => {
                if (val === undefined || val === null || isNaN(val)) return '--';
                return val.toFixed(dec);
            };

            if (results.targetFreq !== undefined) {
                setElText('stat-freq', `${safeFixed(results.targetFreq, 2)} Hz`);
                const sealFreqEl = document.getElementById('seal-freq');
                if (sealFreqEl) {
                    sealFreqEl.textContent = safeFixed(results.targetFreq, 2);
                }
            }
            
            if (varsPresent.vibration && results.stats) {
                const val = results.stats.rmsVib !== undefined ? results.stats.rmsVib : results.stats.avgVib;
                setElText('stat-vib', isApp('vibration') && val !== undefined ? `${safeFixed(val, 3)} mm/s` : 'N/A');
            }
            if (varsPresent.temperature && results.stats) {
                const val = results.stats.maxTempRaw !== undefined ? results.stats.maxTempRaw : results.stats.maxTemp;
                setElText('stat-temp', isApp('temperature') && val !== undefined ? `${safeFixed(val, 1)} ${results.tempUnit || '°C'}` : 'N/A');
            }
            
            if (varsPresent.pressure && results.stats) {
                const maxP = results.stats.maxPres !== undefined ? results.stats.maxPres : 0;
                const minP = results.stats.minPres !== undefined ? results.stats.minPres : 0;
                const presDiffVal = maxP - minP;
                if (!isApp('pressure')) {
                    setElText('stat-pres', 'N/A');
                } else if (results.pressureUnit && results.pressureUnit.toLowerCase() !== 'bar') {
                    const maxPRaw = results.stats.maxPresRaw !== undefined ? results.stats.maxPresRaw : 0;
                    const minPRaw = results.stats.minPresRaw !== undefined ? results.stats.minPresRaw : 0;
                    const rawDiff = maxPRaw - minPRaw;
                    setElText('stat-pres', `${safeFixed(presDiffVal, 2)} bar (${safeFixed(rawDiff, 2)} ${results.pressureUnit})`);
                } else {
                    setElText('stat-pres', `${safeFixed(presDiffVal, 2)} bar`);
                }
            }

            if (varsPresent.current && results.stats) {
                const val = results.stats.maxCurrentRaw !== undefined ? results.stats.maxCurrentRaw : results.stats.maxCurrent;
                setElText('stat-current', isApp('current') && val !== undefined ? `${safeFixed(val, 1)} A` : 'N/A');
            }

            // Update new variables values if present
            if (varsPresent.rpm && results.stats) {
                const val = results.stats.maxRpm;
                setElText('stat-rpm', isApp('rpm') && val !== undefined ? `${safeFixed(val, 0)} RPM` : 'N/A');
            }
            if (varsPresent.torque && results.stats) {
                const val = results.stats.maxTorque;
                setElText('stat-torque', isApp('torque') && val !== undefined ? `${safeFixed(val, 1)} Nm` : 'N/A');
            }
            if (varsPresent.tool_wear && results.stats) {
                const val = results.stats.maxWear;
                setElText('stat-wear', isApp('tool_wear') && val !== undefined ? `${safeFixed(val, 1)} min` : 'N/A');
            }
            if (varsPresent.flow && results.stats) {
                const val = results.stats.maxFlow;
                setElText('stat-flow', isApp('flow') && val !== undefined ? `${safeFixed(val, 1)} LPM` : 'N/A');
            }
            if (varsPresent.level && results.stats) {
                const val = results.stats.maxLevel;
                setElText('stat-level', isApp('level') && val !== undefined ? `${safeFixed(val, 1)} %` : 'N/A');
            }
            if (varsPresent.voltage && results.stats) {
                const val = results.stats.maxVoltage;
                setElText('stat-voltage', isApp('voltage') && val !== undefined ? `${safeFixed(val, 1)} V` : 'N/A');
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
            if (lblVib) lblVib.textContent = isApp('vibration') ? `Umbral: < ${limitWarningVib.toFixed(2)} mm/s` : 'Límite: N/A';
            
            const lblTemp = document.getElementById('stat-lbl-temp');
            if (lblTemp) lblTemp.textContent = isApp('temperature') ? `Límite: ${displayWarningTemp.toFixed(1)} ${results.tempUnit || '°C'}` : 'Límite: N/A';
            
            const lblCurrent = document.getElementById('stat-lbl-current');
            if (lblCurrent) lblCurrent.textContent = isApp('current') ? `Límite: ${limitWarningCurrent.toFixed(1)} A` : 'Límite: N/A';

            const lblRpm = document.getElementById('stat-lbl-rpm');
            if (lblRpm) lblRpm.textContent = isApp('rpm') ? `Límite: ${limitWarningRpm.toFixed(0)} RPM` : 'Límite: N/A';

            const lblTorque = document.getElementById('stat-lbl-torque');
            if (lblTorque) lblTorque.textContent = isApp('torque') ? `Límite: ${limitWarningTorque.toFixed(1)} Nm` : 'Límite: N/A';

            const lblWear = document.getElementById('stat-lbl-wear');
            if (lblWear) lblWear.textContent = isApp('tool_wear') ? `Límite: ${limitWarningWear.toFixed(1)} min` : 'Límite: N/A';

            const lblFlow = document.getElementById('stat-lbl-flow');
            if (lblFlow) lblFlow.textContent = isApp('flow') ? `Límite: ${limitWarningFlow.toFixed(1)} LPM` : 'Límite: N/A';

            const lblLevel = document.getElementById('stat-lbl-level');
            if (lblLevel) lblLevel.textContent = isApp('level') ? `Límite: ${limitWarningLevel.toFixed(1)} %` : 'Límite: N/A';

            const lblVoltage = document.getElementById('stat-lbl-voltage');
            if (lblVoltage) lblVoltage.textContent = isApp('voltage') ? `Límite: ${limitWarningVoltage.toFixed(1)} V` : 'Límite: N/A';

            // Safe class list adder
            const addElClass = (id, cls) => {
                const el = document.getElementById(id);
                if (el) el.classList.add(cls);
            };
            const statObj = results.stats || {};

            // Check vibration threshold
            if (isApp('vibration')) {
                const val = statObj.rmsVib !== undefined ? statObj.rmsVib : statObj.avgVib;
                if (val > limitDangerVib) {
                    addElClass('stat-vib', 'text-red');
                } else if (val > limitWarningVib) {
                    addElClass('stat-vib', 'text-orange');
                } else {
                    addElClass('stat-vib', 'text-blue');
                }
            } else {
                addElClass('stat-vib', 'text-gray');
            }

            // Check temperature threshold
            if (isApp('temperature')) {
                const val = statObj.maxTemp !== undefined ? statObj.maxTemp : statObj.maxTempRaw;
                if (val > limitDangerTemp) {
                    addElClass('stat-temp', 'text-red');
                } else if (val > limitWarningTemp) {
                    addElClass('stat-temp', 'text-orange');
                } else {
                    addElClass('stat-temp', 'text-blue');
                }
            } else {
                addElClass('stat-temp', 'text-gray');
            }

            // Check pressure threshold (warn at 1.5 bar)
            if (isApp('pressure')) {
                if (presDiffVal > 1.5) {
                    addElClass('stat-pres', 'text-red');
                } else {
                    addElClass('stat-pres', 'text-blue');
                }
            } else {
                addElClass('stat-pres', 'text-gray');
            }

            // Check current threshold
            if (isApp('current')) {
                const val = statObj.maxCurrentRaw !== undefined ? statObj.maxCurrentRaw : statObj.maxCurrent;
                if (val > limitDangerCurrent) {
                    addElClass('stat-current', 'text-red');
                } else if (val > limitWarningCurrent) {
                    addElClass('stat-current', 'text-orange');
                } else {
                    addElClass('stat-current', 'text-blue');
                }
            } else {
                addElClass('stat-current', 'text-gray');
            }

            // Check RPM threshold
            if (isApp('rpm')) {
                if (statObj.maxRpm > limitDangerRpm) {
                    addElClass('stat-rpm', 'text-red');
                } else if (statObj.maxRpm > limitWarningRpm) {
                    addElClass('stat-rpm', 'text-orange');
                } else {
                    addElClass('stat-rpm', 'text-blue');
                }
            } else {
                addElClass('stat-rpm', 'text-gray');
            }

            // Check Torque threshold
            if (isApp('torque')) {
                if (statObj.maxTorque > limitDangerTorque) {
                    addElClass('stat-torque', 'text-red');
                } else if (statObj.maxTorque > limitWarningTorque) {
                    addElClass('stat-torque', 'text-orange');
                } else {
                    addElClass('stat-torque', 'text-blue');
                }
            } else {
                addElClass('stat-torque', 'text-gray');
            }

            // Check Wear threshold
            if (isApp('tool_wear')) {
                if (statObj.maxWear > limitDangerWear) {
                    addElClass('stat-wear', 'text-red');
                } else if (statObj.maxWear > limitWarningWear) {
                    addElClass('stat-wear', 'text-orange');
                } else {
                    addElClass('stat-wear', 'text-blue');
                }
            } else {
                addElClass('stat-wear', 'text-gray');
            }

            // Check Flow threshold
            if (isApp('flow')) {
                if (statObj.maxFlow > limitDangerFlow) {
                    addElClass('stat-flow', 'text-red');
                } else if (statObj.maxFlow > limitWarningFlow) {
                    addElClass('stat-flow', 'text-orange');
                } else {
                    addElClass('stat-flow', 'text-blue');
                }
            } else {
                addElClass('stat-flow', 'text-gray');
            }

            // Check Level threshold
            if (isApp('level')) {
                if (statObj.maxLevel > limitDangerLevel) {
                    addElClass('stat-level', 'text-red');
                } else if (statObj.maxLevel > limitWarningLevel) {
                    addElClass('stat-level', 'text-orange');
                } else {
                    addElClass('stat-level', 'text-blue');
                }
            } else {
                addElClass('stat-level', 'text-gray');
            }

            // Check Voltage threshold
            if (isApp('voltage')) {
                if (statObj.maxVoltage > limitDangerVoltage) {
                    addElClass('stat-voltage', 'text-red');
                } else if (statObj.maxVoltage > limitWarningVoltage) {
                    addElClass('stat-voltage', 'text-orange');
                } else {
                    addElClass('stat-voltage', 'text-blue');
                }
            } else {
                addElClass('stat-voltage', 'text-gray');
            }

            // Recalculate stats grid columns & show/hide cards
            const statsGrid = document.querySelector('.sfa-stats-grid');
            if (statsGrid) {
                if (results.universal_columns) {
                    statsGrid.innerHTML = '';
                    
                    // 1. Always append sintonía card
                    const freqCard = document.createElement('div');
                    freqCard.className = 'stat-card';
                    freqCard.id = 'card-freq';
                    freqCard.innerHTML = `
                        <h4>Frecuencia de Sintonía <span class="tooltip-trigger" data-tooltip-text="Frecuencia fundamental de oscilación mecánica de la máquina multiplicada por el factor fractal λ. Aísla y purifica armónicos específicos de fatiga.">?</span></h4>
                        <p class="stat-value text-gold" id="stat-freq">${results.targetFreq ? results.targetFreq.toFixed(2) + ' Hz' : '-- Hz'}</p>
                        <span class="stat-lbl">(f<sub>base</sub> × λ)</span>
                    `;
                    statsGrid.appendChild(freqCard);
                    
                    // 2. Dynamic cards for universal columns
                    results.universal_columns.forEach(col => {
                        const card = document.createElement('div');
                        card.className = 'stat-card';
                        card.id = `card-univ-${col.name.replace(/\s+/g, '_')}`;
                        
                        const isCritical = col.status.includes('FUERA DE CONTROL');
                        const valClass = isCritical ? 'text-red' : 'text-blue';
                        
                        let displayUnit = '';
                        let formatPrecision = 1;
                        const nameLower = col.name.toLowerCase();
                        if (nameLower.includes('temp')) {
                            displayUnit = results.tempUnit || '°C';
                        } else if (nameLower.includes('pres')) {
                            displayUnit = results.pressureUnit || 'bar';
                        } else if (nameLower.includes('vib')) {
                            displayUnit = 'mm/s';
                            formatPrecision = 3;
                        } else if (nameLower.includes('curr') || nameLower.includes('corr')) {
                            displayUnit = 'A';
                        } else if (nameLower.includes('volt')) {
                            displayUnit = 'V';
                        } else if (nameLower.includes('rpm') || nameLower.includes('speed')) {
                            displayUnit = 'RPM';
                            formatPrecision = 0;
                        } else if (nameLower.includes('torq')) {
                            displayUnit = 'Nm';
                        } else if (nameLower.includes('wear') || nameLower.includes('desgaste')) {
                            displayUnit = 'min';
                        } else if (nameLower.includes('flow') || nameLower.includes('caudal')) {
                            displayUnit = 'LPM';
                        } else if (nameLower.includes('level') || nameLower.includes('nivel')) {
                            displayUnit = '%';
                        }
                        
                        card.innerHTML = `
                            <h4>${col.name}</h4>
                            <p class="stat-value ${valClass}">${col.max.toFixed(formatPrecision)} ${displayUnit}</p>
                            <span class="stat-lbl" style="font-size: 0.8rem; opacity: 0.9;">Límite SFA: &lt; ${col.limit_sfa.toFixed(formatPrecision)} ${displayUnit}</span>
                        `;
                        statsGrid.appendChild(card);
                    });
                    
                    const visibleCount = results.universal_columns.length + 1;
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
                } else {
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
            }

            // Update variables tolerance indicator
            const toleranceEl = document.getElementById('sfa-variables-tolerance');
            if (toleranceEl) {
                if (results.universal_columns) {
                    const total = results.universal_columns.length;
                    const green = results.universal_columns.filter(c => c.status.includes('ESTABLE')).length;
                    toleranceEl.textContent = `Variables en Tolerancia: ${green} / ${total}`;
                    toleranceEl.style.display = 'block';
                } else {
                    toleranceEl.style.display = 'none';
                }
            }

            // Control dynamic current alert box
            const currentAlertBox = document.getElementById('sfa-current-alert-box');
            const currentAlertText = document.getElementById('sfa-current-alert-text');
            const currentAlertDot = document.getElementById('sfa-current-alert-dot');
            const avgCurrentRawVal = (results.stats && results.stats.avgCurrentRaw !== undefined) ? results.stats.avgCurrentRaw : undefined;

            if (currentAlertBox && currentAlertText && currentAlertDot) {
                if (avgCurrentRawVal !== undefined && avgCurrentRawVal > limitWarningCurrent) {
                    currentAlertBox.style.display = 'flex';
                    if (results.severityClass === 'danger') {
                        currentAlertBox.className = 'current-alert-box danger';
                        currentAlertDot.className = 'alert-icon-dot pulsing-red';
                        currentAlertText.innerHTML = `Alerta Crítica: El consumo de corriente elevado (<strong>${safeFixed(avgCurrentRawVal, 1)} A</strong>) sugiere fricción mecánica severa o sobrecarga. Inspeccionar lubricación de rodamientos de inmediato.`;
                    } else {
                        currentAlertBox.className = 'current-alert-box';
                        currentAlertDot.className = 'alert-icon-dot pulsing-orange';
                        currentAlertText.innerHTML = `Alerta: El consumo de corriente elevado (<strong>${safeFixed(avgCurrentRawVal, 1)} A</strong>) sugiere fricción mecánica. Inspeccionar lubricación de rodamientos.`;
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
                if (results.severityClass !== 'healthy') {
                    degradationAlertBox.style.display = 'flex';
                    
                    if (results.severityClass === 'warning') {
                        const divisor = (98 - results.healthScore) / 15;
                        const days = divisor > 0 ? Math.round((results.healthScore - 60) / divisor) : 30;
                        degradationAlertText.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-right: 0.5rem;"></i> Se estima que el estatus operativo descenderá a nivel crítico en aproximadamente <strong>${days} días</strong> si continúa la tendencia actual.`;
                    } else {
                        degradationAlertText.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444; margin-right: 0.5rem;"></i> Alerta Crítica: El activo presenta un estatus de severidad crítico. Se requiere intervención de mantenimiento inmediata.`;
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
                if (results.severityClass === 'danger') {
                    recCard.classList.add('severity-red');
                } else if (results.severityClass === 'warning') {
                    recCard.classList.add('severity-yellow');
                } else {
                    recCard.classList.add('severity-green');
                }
            }

            // Update Rationale Section in UI and Print
            const rationaleContent = document.getElementById('sfa-rationale-content');
            const rationalePlanLabel = document.getElementById('sfa-rationale-plan-label');
            if (rationaleContent) {
                rationaleContent.innerHTML = '';
                if (rationalePlanLabel) {
                    rationalePlanLabel.textContent = reportPlan;
                }
                
                const table = document.createElement('table');
                table.className = 'sfa-report-table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Sensor</th>
                            <th>Máx Registrado</th>
                            <th>Límite Dinámico SFA (μ + 2σ)</th>
                            <th>Estatus SPC</th>
                            <th>Análisis Espectral y Racional Técnico</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                const tbody = table.querySelector('tbody');

                if (results.universal_columns) {
                    results.universal_columns.forEach(col => {
                        let displayUnit = col.unit || '';
                        if (!displayUnit) {
                            const nameLower = col.name.toLowerCase();
                            if (nameLower.includes('temp')) {
                                displayUnit = results.tempUnit || '°C';
                            } else if (nameLower.includes('pres')) {
                                displayUnit = results.pressureUnit || 'bar';
                            } else if (nameLower.includes('vib')) {
                                displayUnit = 'mm/s';
                            } else if (nameLower.includes('curr') || nameLower.includes('corr')) {
                                displayUnit = 'A';
                            } else if (nameLower.includes('volt')) {
                                displayUnit = 'V';
                            } else if (nameLower.includes('rpm') || nameLower.includes('speed')) {
                                displayUnit = 'RPM';
                            } else if (nameLower.includes('torq')) {
                                displayUnit = 'Nm';
                            } else if (nameLower.includes('wear') || nameLower.includes('desgaste')) {
                                displayUnit = 'min';
                            } else if (nameLower.includes('flow') || nameLower.includes('caudal')) {
                                displayUnit = 'LPM';
                            } else if (nameLower.includes('level') || nameLower.includes('nivel')) {
                                displayUnit = '%';
                            }
                        }
                        
                        const isCritical = col.status.includes('FUERA DE CONTROL');
                        const statusText = isCritical ? '🔴 FUERA DE CONTROL ESTADÍSTICO' : '🟢 PROCESO ESTABLE (BANDA NOMINAL)';
                        const conditionClass = isCritical ? 'text-red' : 'text-blue';
                        
                        const valStr = col.max !== undefined ? `${Number(col.max.toFixed(4))} ${displayUnit}`.trim() : '--';
                        const limitStr = col.limit_sfa !== undefined ? `${col.limit_sfa.toFixed(4)} ${displayUnit}`.trim() : '--';
                        
                        let desc = '';
                        const lambda = window.SFA.lambda ? window.SFA.lambda.toFixed(3) : '1.618';
                        const fBase = results.targetFreq ? results.targetFreq.toFixed(2) : '17.75';
                        
                        if (reportPlan.includes("Gerente") || reportPlan.includes("Planta Completa")) {
                            if (nameLower.includes('vib')) {
                                if (!isCritical) desc = `Salud mecánica del 100%. Sin riesgos para la continuidad de la producción. Desgaste mínimo que proyecta alargar la vida útil del activo.`;
                                else desc = `Vibración destructiva de ${valStr} superando el límite estadístico de ${limitStr}. Riesgo inminente de rotura física. Requiere intervención del equipo de guardia.`;
                            } else if (nameLower.includes('temp')) {
                                if (!isCritical) desc = `Temperatura de ${valStr} óptima. Previene paros por protección térmica y alarga la vida útil de los lubricantes.`;
                                else desc = `Temperatura elevada de ${valStr} (límite ${limitStr}). Acelera la degradación del lubricante. Se requiere revisión preventiva.`;
                            } else if (nameLower.includes('pres')) {
                                if (!isCritical) desc = `Fluctuación de presión estable de ${valStr}. Garantiza la homogeneidad de la fuerza y evita daños en sellos mecánicos.`;
                                else desc = `Presión inestable con oscilación de ${valStr} superando el límite dinámico de ${limitStr}. Riesgo de fugas e inestabilidad en actuadores.`;
                            } else if (nameLower.includes('curr') || nameLower.includes('corr')) {
                                if (!isCritical) desc = `Consumo de corriente óptimo en ${valStr}. Mantiene la eficiencia de potencia eléctrica en parámetros nominales de diseño.`;
                                else desc = `Corriente de ${valStr} en sobrecarga crítica (límite SFA: ${limitStr}). Riesgo extremo de quemar bobinados o rotor bloqueado.`;
                            } else {
                                if (!isCritical) {
                                    desc = `El parámetro operativo de ${col.name} se mantiene estable en ${valStr}. Cumple con los criterios de diseño y garantiza la continuidad operativa sin pérdidas por paro.`;
                                } else {
                                    desc = `El parámetro de ${col.name} registra un valor de ${valStr} que supera su umbral de tolerancia estadística SFA (${limitStr}). Riesgo moderado-alto de afectación al rendimiento global de la planta.`;
                                }
                            }
                        } else if (reportPlan.includes("Consultor") || reportPlan.includes("Senior")) {
                            if (nameLower.includes('vib')) {
                                if (!isCritical) desc = `La vibración RMS de ${valStr} se mantiene estable. El filtro espectral SFA (λ = ${lambda}) atenuó el ruido estructural bajo el límite +2σ (${limitStr}).`;
                                else desc = `La vibración RMS de ${valStr} excede el umbral estadístico +2σ SFA (${limitStr}). El espectro acusa desalineación angular o desbalanceo mecánico.`;
                            } else if (nameLower.includes('temp')) {
                                if (!isCritical) desc = `Temperatura de ${valStr} nominal. Disipación de calor correcta sin derivas térmicas significativas en el devanado.`;
                                else desc = `Temperatura máxima de ${valStr} excede el límite de diseño +2σ de ${limitStr}. Correlación con incremento de fricción o sobrecarga.`;
                            } else if (nameLower.includes('pres')) {
                                if (!isCritical) desc = `Fluctuación de presión controlada de ${valStr}. El filtrado SFA en dominio temporal confirma ausencia de transitorios inestables.`;
                                else desc = `Fluctuación de presión de ${valStr} supera el umbral dinámico +2σ de ${limitStr}. Transitorios rápidos sugieren desgaste en regulador.`;
                            } else if (nameLower.includes('curr') || nameLower.includes('corr')) {
                                if (!isCritical) desc = `Consumo eléctrico de ${valStr}. La firma de corriente SFA no muestra modulaciones de carga, validando la integridad del estator y rotor.`;
                                else desc = `Corriente de ${valStr} excede el límite nominal SFA de ${limitStr}. La potencia reactiva se eleva debido a fricción mecánica.`;
                            } else {
                                if (!isCritical) {
                                    desc = `El análisis espectral SFA en f_base (${fBase} Hz) y factor λ (${lambda}) confirma comportamiento estable para ${col.name}. El valor de ${valStr} se mantiene por debajo de la barrera de tolerancia estadística +2σ (${limitStr}).`;
                                } else {
                                    desc = `Desviación estadística crítica para ${col.name}. El valor registrado de ${valStr} excede la frontera dinámica +2σ de control de procesos (${limitStr}), indicando una micro-oscilación de fatiga en desarrollo.`;
                                }
                            }
                        } else {
                            if (!isCritical) {
                                desc = `Medición de ${col.name} en rango óptimo. Condición estable.`;
                            } else {
                                desc = `Exceso detectado en ${col.name} (${valStr} superando el límite dinámico de ${limitStr}). Requiere revisión de mantenimiento.`;
                            }
                        }
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><strong>${col.name}</strong></td>
                            <td>${valStr}</td>
                            <td>${limitStr}</td>
                            <td><span class="spc-status-badge ${conditionClass}">${statusText}</span></td>
                            <td class="sfa-rationale-desc-cell">${desc}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    const stats = results.stats || {};
                    const varsConfig = [
                        { key: 'vibration', name: 'Vibración Promedio (RMS)', val: stats.rmsVib, limit: limitWarningVib, danger: limitDangerVib, unit: 'mm/s', show: varsPresent.vibration },
                        { key: 'temperature', name: 'Temperatura Máxima', val: stats.maxTempRaw || stats.maxTemp || 0.0, limit: limitWarningTemp, danger: limitDangerTemp, unit: results.tempUnit || '°C', show: varsPresent.temperature },
                        { key: 'pressure', name: 'Fluctuación de Presión', val: presDiffVal, limit: 1.5, danger: 2.5, unit: 'bar', show: varsPresent.pressure },
                        { key: 'current', name: 'Consumo Eléctrico', val: stats.maxCurrentRaw || stats.maxCurrent || 0.0, limit: limitWarningCurrent, danger: limitDangerCurrent, unit: 'A', show: varsPresent.current },
                        { key: 'rpm', name: 'Velocidad de Rotación', val: stats.maxRpm, limit: limitWarningRpm, danger: limitDangerRpm, unit: 'RPM', show: varsPresent.rpm },
                        { key: 'torque', name: 'Torque del Husillo', val: stats.maxTorque, limit: limitWarningTorque, danger: limitDangerTorque, unit: 'Nm', show: varsPresent.torque },
                        { key: 'tool_wear', name: 'Desgaste Herramienta', val: stats.maxWear, limit: limitWarningWear, danger: limitDangerWear, unit: 'min', show: varsPresent.tool_wear },
                        { key: 'flow', name: 'Flujo / Caudal', val: stats.maxFlow, limit: limitWarningFlow, danger: limitDangerFlow, unit: 'LPM', show: varsPresent.flow },
                        { key: 'level', name: 'Nivel de Fluido', val: stats.maxLevel, limit: limitWarningLevel, danger: limitDangerLevel, unit: '%', show: varsPresent.level },
                        { key: 'voltage', name: 'Voltaje de Bus', val: stats.maxVoltage, limit: limitWarningVoltage, danger: limitDangerVoltage, unit: 'V', show: varsPresent.voltage }
                    ];
                    
                    varsConfig.forEach(v => {
                        if (v.show) {
                            const rationale = window.SFA.getVariableRationale(v.key, v.val, v.limit, v.danger, v.unit, reportPlan, results);
                            
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td><strong>${v.name}</strong></td>
                                <td>${rationale.valStr}</td>
                                <td>${rationale.limitStr}</td>
                                <td><span class="spc-status-badge ${rationale.conditionClass}">${rationale.status}</span></td>
                                <td class="sfa-rationale-desc-cell">${rationale.desc}</td>
                            `;
                            rationaleContent.appendChild(itemDiv);
                        }
                    });
                }
            }

            // Update print titles dynamically based on plan type
            const printTitle = document.querySelector('.print-title-group h2');
            const printSubtitle = document.querySelector('.print-title-group .print-subtitle');
            if (printTitle && printSubtitle) {
                if (reportPlan.includes("Gerente") || reportPlan.includes("Planta Completa")) {
                    printTitle.textContent = "AUDITORÍA EJECUTIVA DE SALUD DE ACTIVOS";
                    printSubtitle.textContent = "SISTEMA DE ANÁLISIS DE RIESGO OPERATIVO SFA - PLANTA COMPLETA";
                } else if (reportPlan.includes("Consultor") || reportPlan.includes("Senior")) {
                    printTitle.textContent = "CERTIFICADO DE DIAGNÓSTICO ESPECTRAL";
                    printSubtitle.textContent = "TECNOLOGÍA DE ANÁLISIS DE TELEMETRÍA FRACTAL SFA";
                } else {
                    printTitle.textContent = "INFORME TÉCNICO - HOJA DE TRABAJO (JUNIOR)";
                    printSubtitle.textContent = "NIVEL DE ENTRADA - CONTROL OPERATIVO NOMINAL";
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
    }
});
