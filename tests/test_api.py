from fastapi.testclient import TestClient

from app.api import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_revenue():
    response = client.post(
        "/ask",
        json={"question": "¿Cuáles fueron los ingresos totales del tercer trimestre de 2025?"},
    )
    assert response.status_code == 200
    assert response.json()["evidence_fragments"]
    assert "18,450" in response.json()["answer"]


def test_imor():
    response = client.post("/ask", json={"question": "¿Cuál fue el índice de morosidad?"})
    assert response.status_code == 200
    assert "1.9%" in response.json()["answer"]


def test_price_target_abstains_with_only_relevant_evidence():
    response = client.post("/ask", json={"question": "¿Cuál es el precio objetivo para 2026?"})
    payload = response.json()

    assert response.status_code == 200
    assert payload["model"] == "abstention"
    assert "No se encontró un precio objetivo para 2026" in payload["answer"]
    assert len(payload["evidence_fragments"]) == 1
    assert "no publica un precio objetivo" in payload["evidence_fragments"][0]["text"].lower()
    assert all(
        "precio objetivo" in item["text"].lower()
        for item in payload["evidence_fragments"]
    )


def test_evidence_contains_document_section_and_chunk():
    response = client.post("/ask", json={"question": "¿Cuál fue el índice de morosidad?"})
    evidence = response.json()["evidence_fragments"]

    assert evidence
    assert all(item["source"] and item["section"] and item["chunk_id"] and item["text"] for item in evidence)


def test_validation():
    response = client.post("/ask", json={"question": "x"})
    assert response.status_code == 422
