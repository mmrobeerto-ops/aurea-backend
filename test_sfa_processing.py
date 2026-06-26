import unittest
import os
import math
from fastapi.testclient import TestClient
from secure_backend import app, procesar_bloque_armonico

class TestSfaProcessing(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.csv_dir = r"C:\Users\52664\.gemini\antigravity\scratch\aurea-systems"
        self.siemens_path = os.path.join(self.csv_dir, "prueba_siemens_300.csv")
        self.ab_path = os.path.join(self.csv_dir, "prueba_ab_750.csv")
        self.api_key = "sfa_key_dev_725_1618_active_precision"

    def test_direct_calculations_siemens(self):
        """Test procesar_bloque_armonico directly with Siemens 300 CSV"""
        with open(self.siemens_path, "r", encoding="utf-8") as f:
            csv_text = f.read()
        
        result = procesar_bloque_armonico(
            csv_text=csv_text,
            lambda_val=1.0,
            offset_val=0.0,
            profile_key="auto"
        )
        self.assertIn("results", result)
        self.assertIn("data", result)
        results = result["results"]
        self.assertIn("healthScore", results)
        self.assertIn("severityClass", results)
        self.assertIn("diagnosis", results)
        self.assertIn("stats", results)
        self.assertEqual(results["detectedProfileKey"], "siemens")

    def test_direct_calculations_ab(self):
        """Test procesar_bloque_armonico directly with AB 750 CSV"""
        with open(self.ab_path, "r", encoding="utf-8") as f:
            csv_text = f.read()
        
        result = procesar_bloque_armonico(
            csv_text=csv_text,
            lambda_val=1.618,
            offset_val=0.1,
            profile_key="auto"
        )
        self.assertIn("results", result)
        self.assertIn("data", result)
        results = result["results"]
        self.assertEqual(results["detectedProfileKey"], "allen_bradley")
        self.assertGreater(results["stats"]["rmsVib"], 0.0)

    def test_api_endpoint_unauthorized(self):
        """Test the POST /api/procesar-sfa endpoint without key should return 401"""
        with open(self.siemens_path, "r", encoding="utf-8") as f:
            csv_text = f.read()

        payload = {
            "csv_text": csv_text,
            "lambda_val": 1.0,
            "offset_val": 0.0,
            "profile_key": "auto"
        }

        response = self.client.post("/api/procesar-sfa", json=payload)
        self.assertEqual(response.status_code, 401)

    def test_api_endpoint_authorized(self):
        """Test the POST /api/procesar-sfa endpoint with key should return 200"""
        with open(self.siemens_path, "r", encoding="utf-8") as f:
            csv_text = f.read()

        payload = {
            "csv_text": csv_text,
            "lambda_val": 1.0,
            "offset_val": 0.0,
            "profile_key": "auto"
        }

        headers = {
            "X-SFA-Key": self.api_key
        }

        response = self.client.post("/api/procesar-sfa", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("results", data)
        self.assertIn("data", data)
        self.assertEqual(data["results"]["detectedProfileKey"], "siemens")

    def test_sensor_abc_mapping(self):
        """Test that CSV files with headers SensorA, SensorB, SensorC map correctly"""
        csv_text = "time,SensorA,SensorB,SensorC\n0.0,1.2,34.5,5.6\n0.1,1.3,34.6,5.7\n"
        result = procesar_bloque_armonico(
            csv_text=csv_text,
            lambda_val=1.0,
            offset_val=0.0,
            profile_key="auto"
        )
        self.assertIn("results", result)
        results = result["results"]
        self.assertAlmostEqual(results["stats"]["avgTemp"], 34.55)
        self.assertAlmostEqual(results["stats"]["avgPres"], 5.65)
        self.assertNotEqual(results["stats"]["avgTemp"], 45.0)

    def test_optimal_state_score(self):
        """Test score calculation for an optimal healthy state"""
        csv_lines = ["time,vibration,temperature,pressure,current"]
        for i in range(100):
            t = i * 0.01
            csv_lines.append(f"{t:.2f},0.05,50.0,5.5,11.0")
        csv_text = "\n".join(csv_lines) + "\n"
        
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        results = result["results"]
        self.assertGreaterEqual(results["healthScore"], 95)
        self.assertEqual(results["severityClass"], "healthy")

    def test_warning_vibration_score(self):
        """Test score calculation for moderate vibration (warning)"""
        csv_lines = ["time,vibration,temperature,pressure,current"]
        for i in range(100):
            t = i * 0.01
            val = 18.0 * math.sin(2.0 * math.pi * 7.25 * t)
            csv_lines.append(f"{t:.2f},{val:.4f},50.0,5.5,11.0")
        csv_text = "\n".join(csv_lines) + "\n"
        
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        results = result["results"]
        self.assertTrue(60 <= results["healthScore"] < 85)
        self.assertEqual(results["severityClass"], "warning")
        self.assertIn("vibración moderada", results["diagnosis"].lower())

    def test_danger_vibration_score(self):
        """Test score calculation for critical vibration (danger)"""
        csv_lines = ["time,vibration,temperature,pressure,current"]
        for i in range(100):
            t = i * 0.01
            val = 22.0 * math.sin(2.0 * math.pi * 7.25 * t)
            csv_lines.append(f"{t:.2f},{val:.4f},50.0,5.5,11.0")
        csv_text = "\n".join(csv_lines) + "\n"
        
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        results = result["results"]
        self.assertLess(results["healthScore"], 60)
        self.assertEqual(results["severityClass"], "danger")
        self.assertIn("ruido elevado crítico", results["diagnosis"].lower())

    def test_compounded_degradation(self):
        """Test that multiple degraded variables result in a lower score than one alone"""
        csv_lines_1 = ["time,vibration,temperature,pressure,current"]
        for i in range(100):
            t = i * 0.01
            csv_lines_1.append(f"{t:.2f},0.05,90.0,5.5,11.0")
        res_1 = procesar_bloque_armonico(csv_text="\n".join(csv_lines_1), lambda_val=1.0, offset_val=0.0)
        score_1 = res_1["results"]["healthScore"]

        csv_lines_2 = ["time,vibration,temperature,pressure,current"]
        for i in range(100):
            t = i * 0.01
            csv_lines_2.append(f"{t:.2f},0.05,90.0,5.5,40.0")
        res_2 = procesar_bloque_armonico(csv_text="\n".join(csv_lines_2), lambda_val=1.0, offset_val=0.0)
        score_2 = res_2["results"]["healthScore"]

        self.assertLess(score_2, score_1)

    def test_critical_low_pressure_score(self):
        """Test score calculation for critical low pressure (<0.5 bar)"""
        csv_lines = ["time,vibration,temperature,pressure,current"]
        for i in range(100):
            t = i * 0.01
            csv_lines.append(f"{t:.2f},0.05,50.0,0.2,11.0")
        csv_text = "\n".join(csv_lines) + "\n"
        
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        results = result["results"]
        self.assertEqual(results["healthScore"], 34)
        self.assertEqual(results["severityClass"], "danger")
        self.assertIn("baja presión crítica", results["diagnosis"].lower())

    def test_mismatched_headers_fallback(self):
        """Test fallback when data rows have more columns than the header line"""
        csv_text = (
            "time,sensor_a,sensor_b,sensor_c\n"
            "20:10,0.080,70.0,5.0,22.8\n"
            "20:11,0.090,70.5,5.1,23.2\n"
            "20:12,0.085,71.0,5.0,23.5\n"
        )
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        results = result["results"]
        self.assertEqual(results["stats"]["maxTemp"], 71.0)
        self.assertEqual(results["stats"]["maxPres"], 5.1)
        self.assertAlmostEqual(results["stats"]["avgCurrent"], 23.166666666666668)

    def test_dynamic_thresholds(self):
        """Test that dynamic thresholds (+2σ and +3σ) are calculated and returned in results"""
        csv_text = (
            "time,vibration,temperature,pressure,current\n"
            "0.0,0.1,80.0,5.0,20.0\n"
            "1.0,0.2,85.0,5.0,22.0\n"
            "2.0,0.15,75.0,5.0,18.0\n"
        )
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        self.assertIn("limits", result["results"])
        limits = result["results"]["limits"]
        self.assertIn("warningVib", limits)
        self.assertIn("dangerVib", limits)
        self.assertIn("warningTemp", limits)
        self.assertIn("dangerTemp", limits)
        self.assertIn("warningCurrent", limits)
        self.assertIn("dangerCurrent", limits)
        
        # Verify that warning limits are at least the baseline values
        self.assertGreaterEqual(limits["warningVib"], 4.5)
        self.assertGreaterEqual(limits["warningTemp"], 75.0)
        self.assertGreaterEqual(limits["warningCurrent"], 35.0)

    def test_backend_adaptive_mode(self):
        """Test asset classification and synonyms based on f_base/dominant frequency"""
        # Case A: f_base >= 20.0 Hz -> Motor Eléctrico / Bomba Rotativa (FLUID_HYDRAULIC)
        csv_lines = ["time,vibration,temperature,pressure,current,flow,level,voltage"]
        for i in range(100):
            t = i * 0.01
            val = 1.0 * math.sin(2.0 * math.pi * 25.0 * t)
            csv_lines.append(f"{t:.2f},{val:.4f},50.0,5.5,11.0,60.0,85.0,240.0")
        csv_text = "\n".join(csv_lines) + "\n"
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        results = result["results"]
        self.assertEqual(results["detectedMode"], "FLUID_HYDRAULIC")
        self.assertEqual(results["assetTypeName"], "Motor Eléctrico / Bomba Rotativa")
        self.assertTrue(results["variables_present"]["flow"])
        self.assertTrue(results["variables_present"]["level"])
        self.assertTrue(results["variables_present"]["voltage"])
        self.assertIn("warningFlow", results["limits"])

        # Case B: f_base < 20.0 Hz -> Husillo CNC / Cortador (CNC_MOTOR)
        csv_lines = ["time,vibration,temperature,current,rpm,torque,tool_wear"]
        for i in range(100):
            t = i * 0.01
            val = 1.0 * math.sin(2.0 * math.pi * 7.25 * t)
            csv_lines.append(f"{t:.2f},{val:.4f},50.0,11.0,1500.0,40.0,50.0")
        csv_text = "\n".join(csv_lines) + "\n"
        result = procesar_bloque_armonico(csv_text=csv_text, lambda_val=1.0, offset_val=0.0)
        results = result["results"]
        self.assertEqual(results["detectedMode"], "CNC_MOTOR")
        self.assertEqual(results["assetTypeName"], "Husillo CNC / Cortador")
        self.assertTrue(results["variables_present"]["rpm"])
        self.assertTrue(results["variables_present"]["torque"])
        self.assertTrue(results["variables_present"]["tool_wear"])
        self.assertFalse(results["variables_present"]["pressure"])
        self.assertIn("warningRpm", results["limits"])

if __name__ == "__main__":
    unittest.main()
