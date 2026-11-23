from fastapi.testclient import TestClient

from app.api import app

client = TestClient(app)


def test_dashboard_serves_financial_research_workspace():
    response = client.get("/")
    assert response.status_code == 200
    assert "Financial <span>Research</span>" in response.text
    assert "SYNTHETIC DATA" in response.text
    assert 'id="ask-form"' in response.text
    assert 'id="evidence"' in response.text


def test_frontend_assets_are_served_and_responsive():
    css = client.get("/static/styles.css")
    js = client.get("/static/app.js")

    assert css.status_code == 200
    assert "@media(max-width:600px)" in css.text
    assert "@media(max-width:900px)" in css.text
    assert js.status_code == 200
    assert 'fetch("/ask"' in js.text
    assert 'fetch("/health"' in js.text


def test_frontend_exposes_evidence_and_abstention_states():
    page = client.get("/").text
    script = client.get("/static/app.js").text

    assert 'id="question-context"' in page
    assert 'id="sources"' in page
    assert "evidence_fragments" in script
    assert "abstention" in script
    assert 'responseCard.dataset.kind = "error"' in script


def test_frontend_distinguishes_grounded_unavailability_from_missing_evidence():
    script = client.get("/static/app.js").text

    assert '"Dato no publicado"' in script
    assert "Evidencia encontrada: el dato no está publicado" in script
    assert "Abstención: la evidencia no permite determinar el dato" in script
    assert '"Evidencia insuficiente"' in script


def test_evidence_empty_state_is_hidden_when_sources_exist():
    script = client.get("/static/app.js").text
    css = client.get("/static/styles.css").text

    assert '"Selecciona una evidencia"' in script
    assert '.evidence-empty[hidden]{display:none!important}' in css
