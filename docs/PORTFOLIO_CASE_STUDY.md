# Portfolio Case Study — Financial Intelligence RAG

## Executive summary

Financial Intelligence RAG is an independently built FinTech-oriented research workspace that demonstrates evidence-grounded financial question answering and metric extraction over a synthetic document corpus.

**Live demo:** https://financial-intelligence-rag-two.vercel.app  
**Source code:** https://github.com/hugomedinadata-ai/financial-intelligence-rag

## Business context

Financial teams often need to find and validate figures across periodic reports, investor presentations and risk documentation. The prototype explores a controlled way to query those documents in natural language while preserving a path back to the source.

## Problem statement

A conversational interface alone is insufficient for financial research if users cannot inspect where an answer came from or know when the available corpus does not support a conclusion.

## Solution

A document retrieval and analytics workflow that:
- parses Markdown source documents into section-aware chunks;
- ranks candidate passages using BM25;
- returns answer text with document, section and chunk provenance;
- supports optional LLM generation and an extractive fallback;
- extracts seven configured financial metrics;
- refuses to calculate a historical comparison when the corpus lacks the requested period.

## Technical implementation

**Backend:** Python, FastAPI, Pydantic.  
**Retrieval:** custom in-memory BM25 implementation.  
**Generation:** optional OpenAI integration; deterministic/extractive paths for selected scenarios.  
**Frontend:** HTML, CSS and JavaScript.  
**Quality and delivery:** pytest, GitHub Actions and Vercel.

## Evidence and observed validation

- 16 automated tests passed on the validated integration commit.
- Production health endpoint returned HTTP 200.
- Production analytics endpoint returned HTTP 200 with seven metrics and source provenance.
- Production UI rendered successfully.
- A composite financial query was manually tested in the production interface; the observed run returned four evidence items and displayed 177 ms.

The 177 ms observation is a single request, not a performance benchmark or SLA.

## Business-facing demonstration

The synthetic Q3 2025 dataset contains revenue, portfolio, IMOR, net income, ROE, ROA and annual portfolio growth. It allows a reviewer to inspect how the application retrieves and presents indicators. Since Q2 2025 is absent, the application does not calculate a quarter-over-quarter change.

## What this project demonstrates

- Translating a financial research scenario into a working Data & AI prototype.
- Building a retrieval-backed API and a user-facing research workflow.
- Designing for source traceability and unsupported-answer handling.
- Extracting and exposing financial indicators with provenance.
- Automating software tests and deploying a public demonstration.

## Limitations and next steps

This is not a production banking platform. Enterprise identity, role-based access, tenant isolation, persistent vector retrieval, semantic reranking, robust PDF/OCR processing, formal evaluation, distributed observability, security hardening and operational SLAs remain future work.

## Data disclaimer

The company and all figures in the demonstration corpus are fictional and synthetic. This project is independent, is not commissioned or endorsed by Banorte, and does not reproduce a private technical challenge or use institutional confidential information.
