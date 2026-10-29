"""Verify additive notes/photos upgrades and preservation of existing data."""
import json
from contextlib import closing
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.request

root = Path(__file__).resolve().parents[1]
binary = root / "Build/bin/Debug/net9.0/AutoMT.dll"

with tempfile.TemporaryDirectory(prefix="automt-schema-") as directory:
    database = Path(directory) / "test.db"
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    env = dict(os.environ, DOTNET_ROLL_FORWARD="Major",
               ASPNETCORE_URLS=f"http://127.0.0.1:{port}",
               ConnectionStrings__AutoMT=f"Data Source={database}",
               Logging__LogLevel__Default="Warning")

    def start():
        process = subprocess.Popen(["dotnet", str(binary)], cwd=root / "Sources/Backend", env=env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError("Test server exited during schema initialization")
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1) as response:
                    if json.load(response)["status"] == "ok":
                        return process
            except OSError:
                time.sleep(0.1)
        process.terminate()
        raise RuntimeError("Test server did not become healthy")

    process = start()
    process.terminate()
    process.wait(timeout=10)
    with closing(sqlite3.connect(database)) as db:
        db.execute("DROP TABLE VehicleNotes")
        db.execute("DROP TABLE VehiclePhotos")
        db.execute("INSERT INTO Users (Id, Name, PasswordHash) VALUES (999, 'existing-user', 'unchanged-hash')")
        db.execute("""INSERT INTO Vehicles (Id, UserId, VIN, Brand, Model, Year, Mileage,
                   LastMileageUpdate, IsDefault, DisableNotify)
                   VALUES (999,999,'JTMB43FV10D012345','Toyota','RAV4',2020,94000,
                   '2026-01-01 00:00:00',1,0)""")
        db.execute("INSERT INTO VehicleMaintenanceTypes (VehicleId,TypeId) VALUES (999,5)")
        db.execute("INSERT INTO Maintenances (VehicleId,TypeId,Mileage,IsSkipped) VALUES (999,5,80000,0)")
        db.execute("UPDATE Vehicles SET ImageUrl='/uploads/vehicles/999/existing.jpg' WHERE Id=999")
        before = list(db.execute("SELECT * FROM Vehicles")), list(db.execute("SELECT * FROM Maintenances"))
        db.commit()
    process = start()
    try:
        with closing(sqlite3.connect(database)) as db:
            after = list(db.execute("SELECT * FROM Vehicles")), list(db.execute("SELECT * FROM Maintenances"))
            assert before == after, "Existing vehicles or maintenance were changed"
            assert db.execute("SELECT PasswordHash FROM Users WHERE Id=999").fetchone()[0] == "unchanged-hash"
            assert db.execute("SELECT count(*) FROM VehicleNotes").fetchone()[0] == 0
            assert db.execute("SELECT VehicleId, Url FROM VehiclePhotos").fetchall() == [(999, '/uploads/vehicles/999/existing.jpg')]
    finally:
        process.terminate()
        process.wait(timeout=10)
    process = start()
    try:
        with closing(sqlite3.connect(database)) as db:
            assert db.execute("SELECT count(*) FROM VehiclePhotos").fetchone()[0] == 1, "Restart duplicated the legacy photo"
        print("Schema upgrade passed: account, vehicle, maintenance and legacy photo preserved; repeated startup adds no duplicates.")
    finally:
        process.terminate()
        process.wait(timeout=10)
