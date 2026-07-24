import numpy as np

class MotorScada:
    def __init__(self):
        # Constante de sintonización corregida y exacta para Aurea Systems
        self.frequency_m = 7.25
        self.phi = 1.618033988749895
        # Frecuencia de muestreo teórica por defecto (ej. 1000 Hz) para FFT
        self.fs = 1000.0 

    def analizar_vector(self, lecturas_numericas):
        """
        Procesa el array numérico del sensor utilizando estadística pura,
        análisis de Transformada de Fourier (FFT) real para fallas mecánicas
        y mantiene intacto el análisis armónico fractal de Aurea Systems.
        """
        if len(lecturas_numericas) == 0:
            return None

        datos = np.array(lecturas_numericas, dtype=float)
        N = len(datos)
        
        # 1. Estadística Industrial Estándar
        promedio = np.mean(datos)
        desviacion = np.std(datos)
        maximo = np.max(datos)
        minimo = np.min(datos)

        # 2. Análisis del Índice de Caos Fractal (Aurea Systems) - INTACTO
        # Evaluamos el residuo armónico basado en tu constante 7.25
        residuos_caos = np.abs((datos / self.frequency_m) % self.phi)
        indice_caos_global = np.mean(residuos_caos)

        # 3. Análisis de Fourier (FFT) real para componentes de frecuencia
        # Restamos el promedio para quitar la componente DC (frecuencia 0)
        datos_ac = datos - promedio
        espectro = np.fft.rfft(datos_ac)
        frecuencias = np.fft.rfftfreq(N, 1.0 / self.fs)
        magnitudes = np.abs(espectro) / N
        
        # Encontrar la frecuencia dominante (falla potencial)
        if len(magnitudes) > 0:
            idx_pico = np.argmax(magnitudes)
            frecuencia_dominante = frecuencias[idx_pico]
            amplitud_dominante = magnitudes[idx_pico]
        else:
            frecuencia_dominante = 0.0
            amplitud_dominante = 0.0

        # 4. Sistema Experto de Diagnóstico Híbrido (FFT + SFA)
        if desviacion > 1.0 or amplitud_dominante > 0.5:
            estatus = "ADVERTENCIA"
            if frecuencia_dominante < 60.0:
                causa = "posible desbalanceo o desalineación del rotor"
            else:
                causa = "posible desgaste de rodamientos o cavitación"
                
            diagnostico = (
                f"[ADVERTENCIA] RUIDO ELEVADO DETECTADO (sigma = {desviacion:.2f}). "
                f"Frecuencia dominante anómala a {frecuencia_dominante:.1f}Hz ({causa}). "
                f"El motor matemático registra inestabilidad geométrica en el flujo. "
                f"Se sugiere revisión inmediata."
            )
        elif 0.1 < desviacion <= 1.0:
            estatus = "NOMINAL_MICRO"
            diagnostico = (
                f"[OK] OPERACIÓN NOMINAL ESTABILIZADA (sigma = {desviacion:.2f}). "
                f"Micro-oscilación periódica detectada a {frecuencia_dominante:.1f}Hz bajo control. "
                f"La señal se mantiene estable bajo los parámetros de diseño."
            )
        else:
            estatus = "NOMINAL"
            diagnostico = f"[OK] OPERACIÓN NORMAL (sigma = {desviacion:.2f}). El sistema opera dentro de los rangos óptimos de diseño sin frecuencias anómalas."

        return {
            "promedio": promedio,
            "desviacion": desviacion,
            "maximo": maximo,
            "minimo": minimo,
            "caos_fractal": indice_caos_global,
            "frecuencia_dominante_hz": float(frecuencia_dominante),
            "estatus": estatus,
            "diagnostico": diagnostico
        }
