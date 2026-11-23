from fastapi.testclient import TestClient
from app.api import app
client=TestClient(app)
def test_health():
 r=client.get("/health");assert r.status_code==200 and r.json()["status"]=="ok"
def test_revenue():
 r=client.post("/ask",json={"question":"¿Cuáles fueron los ingresos totales del tercer trimestre de 2025?"})
 assert r.status_code==200 and r.json()["evidence_fragments"] and "18,450" in r.json()["answer"]
def test_imor():
 r=client.post("/ask",json={"question":"¿Cuál fue el índice de morosidad?"})
 assert r.status_code==200 and "1.9%" in r.json()["answer"]
def test_disclosed_absence_of_target_price():
 r=client.post("/ask",json={"question":"¿Cuál es el precio objetivo para 2026?"})
 assert r.status_code==200 and "no publica un precio objetivo" in r.json()["answer"].lower()
def test_validation():
 r=client.post("/ask",json={"question":"x"});assert r.status_code==422
