# Financial Intelligence RAG
### Enterprise FinTech AI Research Workspace

[![Production](https://img.shields.io/badge/Deployment-Vercel%20Production-000000?logo=vercel)](https://financial-intelligence-rag-two.vercel.app)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions)](https://github.com/hugomedinadata-ai/financial-intelligence-rag/actions)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

**Financial Intelligence RAG** is an independent portfolio project that demonstrates how document retrieval, evidence-grounded question answering and financial analytics can be combined in a banking-oriented research workspace.

> **Demo data notice:** the corpus belongs to the fictional entity `Horizonte Financiero, S.A.` and all figures are synthetic. This is not a Banorte product, commissioned implementation, endorsement or validation. No Banorte information or confidential challenge material is included.

## Live application

- **Production demo:** https://financial-intelligence-rag-two.vercel.app
- **Interactive API documentation:** append `/docs` to the production URL.
- **Repository:** https://github.com/hugomedinadata-ai/financial-intelligence-rag

## Business problem

Financial, risk and strategy teams need to locate figures across reports and investor materials, understand the context behind them and verify where each answer came from. A language-model response without source traceability can create material risk.

This prototype addresses that problem with a constrained workflow: retrieve relevant document passages, produce an answer from the available evidence, expose source metadata and abstain when the corpus does not support a conclusion.

## What the solution does

- Accepts natural-language questions about the supplied financial corpus.
- Splits Markdown source documents into section-aware chunks with overlap.
- Ranks passages with a transparent BM25 lexical retrieval implementation.
- Returns answer text together with document, section, chunk identifier, excerpt and retrieval relevance.
- Supports optional OpenAI-backed generation; the extractive fallback keeps the application usable without an API key.
- Provides a financial analytics snapshot with seven extracted metrics and source provenance.
- Refuses to calculate period-over-period changes when both periods are not represented in the corpus.
- Includes a responsive research workspace, evidence center and automated tests.

## Architecture at a glance

```text
Synthetic Markdown financial documents
                 |
                 v
       Load, section parsing & chunking
                 |
                 v
          In-memory BM25 index
                 |
       Natural-language question
                 |
                 v
         FastAPI retrieval layer
                 |
          Ranked evidence chunks
                 |
        +--------+---------+
        |                  |
        v                  v
 Optional OpenAI      Extractive fallback
 grounded response    / explicit abstention
        |                  |
        +--------+---------+
                 |
                 v
    Answer + source/section/chunk metadata
                 |
                 v
       Web research workspace

Financial corpus ---> metric extraction ---> /analytics/overview
Available periods ---> comparison guard ---> /analytics/compare
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions and limitations.

## Technology

| Layer | Implementation |
|---|---|
| API | Python, FastAPI, Pydantic |
| Document processing | Markdown parsing, section-aware chunking, word overlap |
| Retrieval | In-process BM25 implementation |
| Answer generation | Optional OpenAI API; extractive fallback |
| Financial analytics | Rule-based extraction with source provenance |
| Frontend | HTML, CSS, JavaScript |
| Quality | pytest, HTTPX, GitHub Actions |
| Deployment | Vercel |

## Demonstration corpus and sample indicators

The current corpus covers **Q3 2025 only**. Its synthetic snapshot includes:

| Metric | Synthetic value |
|---|---:|
| Total revenue | MXN 18,450 million |
| Total loan portfolio | MXN 742,300 million |
| Non-performing loan ratio (IMOR) | 1.9% |
| Net income | MXN 3,120 million |
| ROE | 19.6% |
| ROA | 2.2% |
| Annual portfolio growth | 8.4% |

These values are sample data for exercising retrieval and analytics behavior. They are not actual financial results, forecasts or investment information.

## Validation evidence

The integrated production version has the following recorded checks:

- GitHub Actions completed successfully with **16 automated tests passing** for the validated integration commit.
- Production `GET /health` returned HTTP 200.
- Production `GET /analytics/overview` returned HTTP 200 and seven metrics with document/section/chunk provenance.
- The production web interface returned HTTP 200.
- A composite financial question was manually exercised in the production UI; the observed response displayed four evidence sources and a **177 ms** response time.

The 177 ms figure is one observed request, not a load-test result, SLA or latency guarantee. The 16-test result applies to the validated commit and should be rechecked for subsequent changes.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Service status, document/chunk counts and retrieval method |
| POST | `/ask` | Retrieve evidence and answer a question |
| GET | `/analytics/overview` | Extract the financial metric snapshot and provenance |
| POST | `/analytics/compare` | Validate whether two requested periods can be compared |
| GET | `/docs` | Interactive OpenAPI documentation |

Example request:

```bash
curl -X POST "http://127.0.0.1:8000/ask" \
  -H "Content-Type: application/json" \
  -d '{"question":"¿Cuáles fueron los ingresos totales del tercer trimestre de 2025?"}'
```

The response includes `answer`, `sources`, `model`, `retrieval` and `evidence_fragments`. Source traceability is document + section + chunk; page numbers are not claimed because the demo corpus is Markdown.

## Run locally

Requirements: Python 3.10+.

```bash
python -m venv .venv

# Windows PowerShell
.venv\\Scripts\\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Copy `.env.example` to `.env` if you want to configure optional model access. Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`. Do not commit secrets.

Start the API:

```bash
uvicorn app.api:app --reload --port 8000
```

Open http://127.0.0.1:8000 and http://127.0.0.1:8000/docs.

Run tests:

```bash
pytest -q
```

## Design choices and trade-offs

1. **BM25 first:** a transparent lexical baseline makes retrieval behavior inspectable and reproducible without a vector database.
2. **Evidence before generation:** answer context is assembled from retrieved passages, and source metadata is returned to the client.
3. **Graceful fallback:** optional model integration does not prevent local operation when no model key is configured.
4. **Abstention over invention:** unsupported questions and missing historical periods do not produce fabricated values or comparisons.
5. **Explicit corpus scope:** the analytics endpoint reports the periods actually present in the source documents.

## Current limitations

This is a portfolio prototype, not a production-ready banking platform. It does not currently provide enterprise authentication/authorization, tenant isolation, persistent/vector indexing, semantic reranking, PDF OCR ingestion, distributed observability, formal model evaluation, prompt-injection isolation, regulated-data controls or high-availability guarantees. The OpenAI generation path is optional and requires separate evaluation and configuration.

Potential next steps include document versioning, robust PDF extraction, hybrid retrieval, retrieval/groundedness evaluation, role-based access control, audit logging, monitoring, human review and security testing.

## Portfolio positioning

This project demonstrates practical work across data engineering, API design, retrieval-augmented generation, financial analytics, evidence traceability, test automation and cloud deployment. It is designed to support technical discussion with Data & AI leaders, engineering managers and financial-services teams.

**Author:** Hugo Medina — Data & Technology | Data & Analytics | AI

## License

MIT. See [LICENSE](LICENSE).
