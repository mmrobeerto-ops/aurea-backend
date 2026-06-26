import math
import random
import os
import shutil

def generate_siemens_300(filepath):
    # Nominal, 300 rows (3 seconds, dt=0.01)
    with open(filepath, 'w') as f:
        f.write("TS_UTC,VIB_RMS_G,TEMP_STATION_C,CURR_AMP_A\n")
        for i in range(300):
            t = i * 0.01
            # Low vibration (nominal state)
            vib = 0.05 * math.sin(2 * math.pi * 7.25 * t) + random.uniform(-0.02, 0.02)
            temp = 42.0 + 0.5 * math.sin(2 * math.pi * 0.1 * t) + random.uniform(-0.1, 0.1)
            # Current around 11.5 A
            curr = 11.5 + random.uniform(-0.2, 0.2)
            f.write(f"{t:.2f},{vib:.4f},{temp:.2f},{curr:.2f}\n")

def generate_ab_750(filepath):
    # Critical, 300 rows (3 seconds, dt=0.01)
    # Recreates a blocked pump leading to 72 bar overpressure, 118.4 A overcurrent, 145 °C temperature, and 28.56 mm/s RMS vibration.
    with open(filepath, 'w') as f:
        f.write("T_SEC,RMS_Vibe,Winding_Temp,Discharge_Pres,Amperage_Motor\n")
        for i in range(300):
            t = i * 0.01
            # High vibration around 28.56 mm/s RMS (with oscillations)
            vib = 28.56 + 3.5 * math.sin(2 * math.pi * 11.73 * t) + random.uniform(-0.5, 0.5)
            
            # Winding temp rising to 145 °C
            temp = 120.0 + 25.0 * (t / 3.0) + random.uniform(-0.5, 0.5)
            
            # Discharge pressure rising to 72 bar (overpressure)
            pres = 65.0 + 7.0 * (t / 3.0) + random.uniform(-0.2, 0.2)
            
            # High current around 118.4 A (triggering degradation)
            curr = 118.4 + 4.0 * math.sin(2 * math.pi * 0.5 * t) + random.uniform(-0.8, 0.8)
            
            f.write(f"{t:.2f},{vib:.4f},{temp:.2f},{pres:.2f},{curr:.2f}\n")

if __name__ == '__main__':
    # Workspace paths
    ws_dir = r"C:\Users\52664\.gemini\antigravity\scratch\aurea-systems"
    siemens_ws = os.path.join(ws_dir, "prueba_siemens_300.csv")
    ab_ws = os.path.join(ws_dir, "prueba_ab_750.csv")
    
    # Artifact paths
    art_dir = r"C:\Users\52664\.gemini\antigravity\brain\0d8e40e0-bfc3-4e23-9285-4c34f5a756c8\scratch"
    os.makedirs(art_dir, exist_ok=True)
    siemens_art = os.path.join(art_dir, "prueba_siemens_300.csv")
    ab_art = os.path.join(art_dir, "prueba_ab_750.csv")
    
    # Generate files in workspace
    generate_siemens_300(siemens_ws)
    generate_ab_750(ab_ws)
    print("Files generated in workspace.")
    
    # Copy to artifacts
    shutil.copy(siemens_ws, siemens_art)
    shutil.copy(ab_ws, ab_art)
    print("Files copied to artifacts.")
