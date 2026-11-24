# Architecture — Financial Intelligence RAG

## 1. Scope

Independent portfolio prototype for document-grounded financial research. The public corpus is synthetic and represents the fictional entity Horizonte Financiero, S.A. It is not a Banorte implementation or a system validated by Banorte.

## 2. Runtime components

- **Corpus:** Markdown documents stored under `data/documents`.
- **Loader and chunker:** reads Markdown files, tracks document title and section headings, and splits section text into word windows (115 words, 20-word overlap in the current implementation).
- **Retriever:** in-memory BM25 index implemented in `app/rag.py`; ranks lexical matches and returns scored chunks.
- **API:** FastAPI application in `app/api.py`.
- **Answer strategy:** optional OpenAI Chat Completions path when `OPENAI_API_KEY` is configured; otherwise an extractive fallback. Financial summary and price-target absence paths have explicit deterministic handling.
- **Analytics:** rule-based metric extraction from corpus chunks, returning source, section, chunk ID and excerpt.
- **Comparison guard:** period comparison checks the periods available in the corpus and returns insufficient-history status when both periods are not available.
- **Frontend:** static HTML/CSS/JavaScript research workspace.
- **Delivery:** GitHub Actions for automated tests and Vercel deployment.

## 3. Query flow

1. Client submits a question to `POST /ask`.
2. BM25 ranks corpus chunks.
3. Query-specific selection logic filters/caps evidence for supported scenarios.
4. The answer strategy uses the selected evidence or abstains.
5. API returns the answer, retrieval method, model/fallback label and source metadata.
6. UI renders the answer and evidence center.

## 4. Analytics flow

- `GET /analytics/overview` extracts seven configured financial metrics from the corpus and exposes the available period list.
- `POST /analytics/compare` checks whether requested periods are distinct and available. If the corpus only contains Q3 2025, it returns `insufficient_history` and no comparison value.

## 5. API surface

| Method | Route | Responsibility |
|---|---|---|
| GET | `/health` | Runtime health and corpus counts |
| POST | `/ask` | Evidence retrieval and question answering |
| GET | `/analytics/overview` | Financial metric snapshot and provenance |
| POST | `/analytics/compare` | Historical-period availability validation |
| GET | `/docs` | OpenAPI interface |

## 6. Engineering decisions

- BM25 is an interpretable lexical retrieval baseline; it is not vector search.
- Section-aware chunk IDs support reproducible document-level traceability.
- The API exposes source metadata instead of presenting answers as unsupported facts.
- The optional LLM path is constrained to supplied evidence; fallback keeps the demo operable without an external model.
- Missing evidence and missing historical periods lead to abstention rather than fabricated results.

## 7. Non-goals and production gaps

The prototype does not implement enterprise identity, RBAC, tenant isolation, persistent/vector databases, semantic reranking, robust PDF/OCR ingestion, distributed tracing, formal model/retrieval evaluation, prompt-injection isolation, regulated-data governance, high availability or operational SLAs. These are explicit extension areas, not capabilities to claim as implemented.

## 8. Data and institutional disclaimer

All demo financial values are synthetic. No Banorte data, proprietary documents, confidential assessment content or institutional endorsement is included. The banking use case is illustrative only.
