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


def test_analytics_overview_returns_only_corpus_grounded_metrics():
    response = client.get("/analytics/overview")
    payload = response.json()

    assert response.status_code == 200
    assert payload["synthetic"] is True
    assert payload["available_periods"] == ["Q3 2025"]
    assert payload["historical_series_available"] is False
    assert len(payload["metrics"]) >= 5
    assert all(metric["source"] and metric["section"] and metric["chunk_id"] and metric["excerpt"] for metric in payload["metrics"])


def test_analytics_compare_does_not_invent_missing_period_data():
    response = client.post(
        "/analytics/compare",
        json={"period_a": "Q2 2025", "period_b": "Q3 2025"},
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "insufficient_history"
    assert payload["comparison"] is None
    assert payload["available_periods"] == ["Q3 2025"]
    assert "solo contiene información de Q3 2025" in payload["message"]


def test_composite_financial_summary_covers_requested_metrics_without_price_target_noise():
    response = client.post(
        "/ask",
        json={"question": "Resume el desempeño financiero de Horizonte Financiero durante Q3 2025. Integra ingresos, cartera, morosidad y rentabilidad. Identifica qué documento respalda cada indicador, explica las relaciones entre ellos y señala las limitaciones de la información disponible. No inventes datos ni tendencias históricas."},
    )
    payload = response.json()
    answer = payload["answer"]

    assert response.status_code == 200
    assert payload["model"] == "extractive-fallback"
    for expected in ["18,450", "742,300", "1.9%", "3,120", "19.6%", "2.2%"]:
        assert expected in answer
    assert "precio objetivo" not in answer.lower()
    assert "no permiten establecer tendencias intertrimestrales" in answer.lower()
    assert len(payload["evidence_fragments"]) >= 3
    assert all("precio objetivo" not in item["text"].lower() for item in payload["evidence_fragments"])
