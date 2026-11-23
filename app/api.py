from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.rag import BM25Index, load_chunks

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
CHUNKS = load_chunks(ROOT / "data" / "documents")
INDEX = BM25Index(CHUNKS)

app = FastAPI(title="Financial Intelligence RAG Demo", version="1.1.0")


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1500)

class CompareRequest(BaseModel):
    period_a: str = Field(min_length=3, max_length=30)
    period_b: str = Field(min_length=3, max_length=30)


METRIC_PATTERNS = [
    ("Ingresos totales", r"ingresos totales (?:por|del trimestre sumaron) ([\\d,]+) millones", "MXN millones"),
    ("Cartera total", r"cartera total cerr[oó] en ([\\d,]+) millones", "MXN millones"),
    ("Índice de morosidad (IMOR)", r"(?:índice de morosidad \\(IMOR\\)|IMOR) (?:fue|reportado[^.]*fue) de ([\\d.]+)%", "%"),
    ("Utilidad neta", r"utilidad neta (?:trimestral )?fue de ([\\d,]+) millones", "MXN millones"),
    ("ROE", r"ROE[^.]*?fue de ([\\d.]+)%", "%"),
    ("ROA", r"ROA[^.]*?(?:ubic[oó]|se ubic[oó]) en ([\\d.]+)%", "%"),
    ("Crecimiento anual de cartera", r"crecimiento anual de cartera fue de ([\\d.]+)%", "%"),
]


def _periods_in_corpus() -> list[str]:
    corpus_text = " ".join(chunk.text for chunk in CHUNKS).lower()
    return ["Q3 2025"] if ("tercer trimestre de 2025" in corpus_text or "q3 2025" in corpus_text) else []


def _extract_metric_snapshot() -> list[dict[str, Any]]:
    metrics: list[dict[str, Any]] = []
    for label, pattern, unit in METRIC_PATTERNS:
        for chunk in CHUNKS:
            match = re.search(pattern, chunk.text, re.IGNORECASE)
            if not match:
                continue
            metrics.append({
                "name": label,
                "value": match.group(1),
                "unit": unit,
                "period": "Q3 2025",
                "source": chunk.doc_id,
                "title": chunk.title,
                "section": chunk.section,
                "chunk_id": chunk.chunk_id,
                "excerpt": chunk.text,
            })
            break
    return metrics


def _is_price_target_question(question: str) -> bool:
    normalized = question.lower()
    return (
        ("precio objetivo" in normalized)
        or ("price target" in normalized)
        or ("precio de la acción" in normalized and "objetivo" in normalized)
    )


def _select_relevant_hits(question: str, hits: list[tuple[Any, float]]) -> list[tuple[Any, float]]:
    """Keep a small, score-grounded set; domain-specific absence queries stay focused."""
    if not hits:
        return []

    if _is_price_target_question(question):
        # The demo corpus explicitly addresses this absence only in the Perspectives section.
        focused = [
            (chunk, score)
            for chunk, score in hits
            if "precio objetivo" in chunk.text.lower()
            or "price target" in chunk.text.lower()
        ]
        return focused[:2]

    best_score = hits[0][1]
    if best_score <= 0:
        return []

    # Exclude weakly related chunks and cap evidence to keep answers auditable.
    selected = [(chunk, score) for chunk, score in hits if score >= best_score * 0.45]
    return selected[:3]


def answer_question(question: str, evidence: list[dict[str, Any]]) -> tuple[str, str]:
    if _is_price_target_question(question):
        has_explicit_absence = any(
            "no publica un precio objetivo" in item["text"].lower()
            for item in evidence
        )
        if has_explicit_absence:
            return (
                "No se encontró un precio objetivo para 2026 en la documentación disponible. "
                "La presentación a inversionistas indica expresamente que la compañía ficticia "
                "no publica ese dato y que no debe inferirse a partir de otros indicadores.",
                "abstention",
            )
        return "No encontré evidencia documental suficiente para determinar un precio objetivo para 2026.", "abstention"

    if not evidence:
        return "No encontré evidencia suficiente en los documentos disponibles para responder esta pregunta.", "abstention"

    key = os.getenv("OPENAI_API_KEY", "").strip()
    if key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=key)
            context = "\n\n".join(
                f"[{item['source']} | {item['section']} | {item['chunk_id']}] {item['text']}"
                for item in evidence
            )
            result = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                temperature=0,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Responde en español usando exclusivamente la evidencia proporcionada. "
                            "No agregues datos ni contexto externo. Si la evidencia no responde la "
                            "pregunta, indícalo. Cada afirmación factual debe citar documento y sección."
                        ),
                    },
                    {"role": "user", "content": f"Pregunta: {question}\n\nEvidencia:\n{context}"},
                ],
            )
            return result.choices[0].message.content or "Sin respuesta.", "openai"
        except Exception:
            # Keep the demo available without an external model; expose fallback in metadata.
            pass

    excerpts = "\n\n".join(
        f"{item['text']} (Fuente: {item['source']}, sección: {item['section']})."
        for item in evidence[:2]
    )
    return "La evidencia documental relevante indica:\n\n" + excerpts, "extractive-fallback"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "documents": len({chunk.doc_id for chunk in CHUNKS}),
        "chunks": len(CHUNKS),
        "retrieval": "BM25",
    }


@app.post("/ask")
def ask(payload: AskRequest):
    hits = INDEX.search(payload.question, limit=10)
    selected = _select_relevant_hits(payload.question, hits)
    evidence = [
        {
            "source": chunk.doc_id,
            "title": chunk.title,
            "section": chunk.section,
            "chunk_id": chunk.chunk_id,
            "score": round(score, 4),
            "text": chunk.text,
        }
        for chunk, score in selected
    ]
    answer, model = answer_question(payload.question, evidence)
    return {
        "answer": answer,
        "sources": [
            {
                "document": item["source"],
                "title": item["title"],
                "section": item["section"],
                "chunk_id": item["chunk_id"],
                "relevance_bm25": item["score"],
                "excerpt": item["text"],
            }
            for item in evidence
        ],
        "model": model,
        "retrieval": "BM25",
        "evidence_fragments": evidence,
    }



@app.get("/analytics/overview")
def analytics_overview():
    metrics = _extract_metric_snapshot()
    return {
        "status": "ok",
        "entity": "Horizonte Financiero, S.A.",
        "synthetic": True,
        "available_periods": _periods_in_corpus(),
        "metrics": metrics,
        "documents_consulted": sorted({item["source"] for item in metrics}),
        "historical_series_available": len(_periods_in_corpus()) > 1,
    }


@app.post("/analytics/compare")
def analytics_compare(payload: CompareRequest):
    available = _periods_in_corpus()
    requested = [payload.period_a.strip().upper(), payload.period_b.strip().upper()]
    if requested[0] == requested[1]:
        return {
            "status": "invalid_comparison",
            "message": "Selecciona dos periodos distintos para realizar una comparación.",
            "available_periods": available,
            "comparison": None,
        }
    return {
        "status": "insufficient_history",
        "message": "No es posible comparar los periodos solicitados: el corpus disponible solo contiene información de Q3 2025. Se necesitan datos documentales de ambos periodos.",
        "available_periods": available,
        "requested_periods": requested,
        "comparison": None,
    }

app.mount("/static", StaticFiles(directory=ROOT / "frontend"), name="static")


@app.get("/")
def root():
    from fastapi.responses import FileResponse

    return FileResponse(ROOT / "frontend" / "index.html")
