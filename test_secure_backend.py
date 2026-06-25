import os
os.environ.pop("DATABASE_URL", None)
import unittest
import time
from secure_backend import TelemetryRecord, check_rate_limiting, blocked_ips, request_history
from fastapi import HTTPException

class TestBackendSecurity(unittest.TestCase):
    def setUp(self):
        # Limpiar historiales antes de cada prueba
        blocked_ips.clear()
        request_history.clear()

    def test_pydantic_sensor_id_sanitization(self):
        """
        Prueba que el validador de Pydantic sanitice de forma segura las inyecciones SQL y XSS.
        """
        # 1. Caso nominal (ID normal de sensor)
        record = TelemetryRecord(
            timestamp=1700000000.0,
            vibration=0.25,
            temperature=45.2,
            pressure=6.1,
            current=12.5,
            sensor_id="sensor-motor_01"
        )
        self.assertEqual(record.sensor_id, "sensor-motor_01")

        # 2. Intento de Inyección SQL (con comillas y punto y coma)
        sql_injection_attempt = "sensor_01; DROP TABLE telemetry;--"
        record_sql = TelemetryRecord(
            timestamp=1700000000.0,
            vibration=0.25,
            temperature=45.2,
            pressure=6.1,
            current=12.5,
            sensor_id=sql_injection_attempt
        )
        # Debe sanitizar eliminando caracteres como ';', '--' y espacios
        self.assertEqual(record_sql.sensor_id, "sensor_01DROPTABLEtelemetry-")

        # 3. Intento de Inyección XSS (con etiquetas HTML/JavaScript)
        xss_attempt = "<script>alert('hack')</script>sensor_99"
        record_xss = TelemetryRecord(
            timestamp=1700000000.0,
            vibration=0.25,
            temperature=45.2,
            pressure=6.1,
            current=12.5,
            sensor_id=xss_attempt
        )
        # Las etiquetas HTML son escapadas y limpiadas
        self.assertNotIn("<script>", record_xss.sensor_id)
        self.assertEqual(record_xss.sensor_id, "ltscriptgtalert039hack039ltscriptgtsensor_99")


    def test_rate_limiting_blocking(self):
        """
        Prueba que el Rate Limiter bloquee una IP si realiza más de 5 peticiones por minuto.
        """
        test_ip = "192.168.1.50"

        # Simular 5 peticiones consecutivas (permitidas)
        for i in range(5):
            check_rate_limiting(test_ip)
        
        self.assertIn(test_ip, request_history)
        self.assertEqual(len(request_history[test_ip]), 5)
        self.assertNotIn(test_ip, blocked_ips)

        # La 6ta petición debe lanzar una excepción HTTP 429 y bloquear la IP
        with self.assertRaises(HTTPException) as context:
            check_rate_limiting(test_ip)
        
        self.assertEqual(context.exception.status_code, 429)
        self.assertIn(test_ip, blocked_ips)

        # Cualquier petición posterior mientras esté bloqueada debe seguir arrojando 429
        with self.assertRaises(HTTPException):
            check_rate_limiting(test_ip)

from fastapi.testclient import TestClient
from secure_backend import app, REGISTROS_FILE
import os
import json

class TestRegistros(unittest.TestCase):
    def setUp(self):
        if os.path.exists(REGISTROS_FILE):
            try:
                os.remove(REGISTROS_FILE)
            except Exception:
                pass
        self.client = TestClient(app)

    def tearDown(self):
        if os.path.exists(REGISTROS_FILE):
            try:
                os.remove(REGISTROS_FILE)
            except Exception:
                pass

    def test_create_and_get_registros(self):
        payload = {
            "name": "Roberto Member",
            "email": "mmrobeerto@gmail.com",
            "company": "Aurea Systems",
            "plan": "Plan Consultor"
        }
        response = self.client.post("/api/registros", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], payload["name"])
        self.assertEqual(data["email"], payload["email"])
        self.assertEqual(data["company"], payload["company"])
        self.assertEqual(data["plan"], payload["plan"])
        self.assertTrue(data["license_key"].startswith("SFA-MEM-"))
        self.assertIn("timestamp", data)
        
        self.assertTrue(os.path.exists(REGISTROS_FILE))
        with open(REGISTROS_FILE, "r", encoding="utf-8") as f:
            saved = json.load(f)
            self.assertEqual(len(saved), 1)
            self.assertEqual(saved[0]["license_key"], data["license_key"])

        response_get_unauthorized = self.client.get("/api/registros")
        self.assertEqual(response_get_unauthorized.status_code, 401)
        
        response_get_invalid = self.client.get("/api/registros?token=wrongtoken")
        self.assertEqual(response_get_invalid.status_code, 401)

        from secure_backend import ADMIN_TOKEN
        response_get_authorized = self.client.get(f"/api/registros?token={ADMIN_TOKEN}")
        self.assertEqual(response_get_authorized.status_code, 200)
        records = response_get_authorized.json()
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["license_key"], data["license_key"])

        response_delete = self.client.delete(f"/api/registros?token={ADMIN_TOKEN}")
        self.assertEqual(response_delete.status_code, 200)
        self.assertFalse(os.path.exists(REGISTROS_FILE))

    def test_club33_key_validation(self):
        # 1. Registro exitoso con clave exacta "aurea33"
        payload_ok = {
            "name": "Pionero A",
            "email": "pioneroa@gmail.com",
            "company": "Planta 1",
            "plan": "Club de Pioneros 33",
            "access_key": "aurea33"
        }
        response = self.client.post("/api/registros", json=payload_ok)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["license_key"].startswith("SFA-MEM-"))

        # 2. Registro exitoso con clave con espacios y mayúsculas "Aurea 33"
        payload_ok_spaces = {
            "name": "Pionero B",
            "email": "pionerob@gmail.com",
            "company": "Planta 2",
            "plan": "Club de Pioneros 33",
            "access_key": "Aurea 33"
        }
        response = self.client.post("/api/registros", json=payload_ok_spaces)
        self.assertEqual(response.status_code, 200)

        # 3. Registro fallido con clave incorrecta
        payload_fail = {
            "name": "Pionero C",
            "email": "pioneroc@gmail.com",
            "company": "Planta 3",
            "plan": "Club de Pioneros 33",
            "access_key": "wrong_key"
        }
        response = self.client.post("/api/registros", json=payload_fail)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Clave de invitación incorrecta", response.json()["detail"])

        # 4. Registro fallido con clave ausente
        payload_no_key = {
            "name": "Pionero D",
            "email": "pionerod@gmail.com",
            "company": "Planta 4",
            "plan": "Club de Pioneros 33"
        }
        response = self.client.post("/api/registros", json=payload_no_key)
        self.assertEqual(response.status_code, 400)

        # 5. Verificar endpoint public-count
        response = self.client.get("/api/registros/public-count")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["registered"], 2)  # Registramos "Pionero A" y "Pionero B"
        self.assertEqual(data["remaining"], 31)  # 33 - 2 = 31

class TestMachineSlotLimiting(unittest.TestCase):
    def setUp(self):
        from secure_backend import REGISTROS_FILE, DEVICES_FILE
        for f in [REGISTROS_FILE, DEVICES_FILE]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass
        self.client = TestClient(app)

    def tearDown(self):
        from secure_backend import REGISTROS_FILE, DEVICES_FILE
        for f in [REGISTROS_FILE, DEVICES_FILE]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

    def test_machine_slot_limiting(self):
        # 1. Crear usuario con Plan Junior (límite 3)
        payload_junior = {
            "name": "Junior User",
            "email": "junior@gmail.com",
            "company": "Company A",
            "plan": "Plan Junior / Técnico Predictivo"
        }
        res = self.client.post("/api/registros", json=payload_junior)
        self.assertEqual(res.status_code, 200)
        junior_key = res.json()["license_key"]

        # 2. Subir 3 sensores distintos en plan Junior - deben tener éxito
        for i in range(1, 4):
            csv_content = f"timestamp,vibration,temperature,pressure,current,sensor_id\n0,0.1,40,5,10,sensor-{i}\n1,0.2,42,5.1,10.5,sensor-{i}"
            res = self.client.post(
                "/api/v1/upload-csv",
                headers={"X-SFA-Key": junior_key},
                files={"file": ("test.csv", csv_content, "text/csv")}
            )
            self.assertEqual(res.status_code, 200)

        # 3. Subir el 4to sensor distinto en plan Junior - debe fallar con 403
        csv_content_4 = "timestamp,vibration,temperature,pressure,current,sensor_id\n0,0.1,40,5,10,sensor-4\n1,0.2,42,5.1,10.5,sensor-4"
        res = self.client.post(
            "/api/v1/upload-csv",
            headers={"X-SFA-Key": junior_key},
            files={"file": ("test.csv", csv_content_4, "text/csv")}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("LÍMITE_MÁQUINAS_EXCEDIDO", res.json()["detail"])

        # 4. Crear usuario con Plan Consultor (límite 20)
        payload_consultor = {
            "name": "Consultor User",
            "email": "consultor@gmail.com",
            "company": "Company B",
            "plan": "Plan Consultor / Senior"
        }
        res = self.client.post("/api/registros", json=payload_consultor)
        self.assertEqual(res.status_code, 200)
        consultor_key = res.json()["license_key"]

        # 5. Subir 20 sensores distintos en plan Consultor - deben tener éxito
        for i in range(1, 21):
            csv_content = f"timestamp,vibration,temperature,pressure,current,sensor_id\n0,0.1,40,5,10,sensor-{i}\n1,0.2,42,5.1,10.5,sensor-{i}"
            res = self.client.post(
                "/api/v1/upload-csv",
                headers={"X-SFA-Key": consultor_key},
                files={"file": ("test.csv", csv_content, "text/csv")}
            )
            self.assertEqual(res.status_code, 200)

        # 6. Subir el 21er sensor distinto en plan Consultor - debe fallar con 403
        csv_content_21 = "timestamp,vibration,temperature,pressure,current,sensor_id\n0,0.1,40,5,10,sensor-21\n1,0.2,42,5.1,10.5,sensor-21"
        res = self.client.post(
            "/api/v1/upload-csv",
            headers={"X-SFA-Key": consultor_key},
            files={"file": ("test.csv", csv_content_21, "text/csv")}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("LÍMITE_MÁQUINAS_EXCEDIDO", res.json()["detail"])

if __name__ == "__main__":
    unittest.main()
