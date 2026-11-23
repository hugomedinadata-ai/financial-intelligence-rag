# Financial Intelligence — RAG documental (demo pública)

Aplicación demostrativa de recuperación aumentada por generación (RAG) para consultar documentación financiera. El conjunto documental incluido es **100% sintético**: `Horizonte Financiero, S.A.` no representa a una institución real y sus cifras fueron creadas exclusivamente para esta demostración.

> Este repositorio demuestra un patrón técnico reutilizable. No es el código original del reto de Banorte, no contiene información de Banorte y no acredita una relación comercial con ninguna institución.

## Qué incluye

- Ingesta local de documentos Markdown.
- Fragmentación por secciones con solapamiento.
- Indexación y recuperación léxica BM25 implementada en Python.
- API REST con FastAPI: `GET /health` y `POST /ask`.
- Generación opcional con OpenAI, usando evidencia recuperada y temperatura cero.
- Fallback extractivo sin API key; devuelve fragmentos recuperados en lugar de inventar una síntesis.
- Referencias de documento, sección, fragmento y score de recuperación.
- Interfaz web ligera y pruebas automatizadas.
- Caso explícito de pregunta sin evidencia suficiente.

## Arquitectura

```text
Documentos Markdown sintéticos
          |
          v
  Ingesta y chunking (sección + overlap)
          |
          v
  Índice BM25 en memoria
          |
  Pregunta del usuario
          |
          v
  FastAPI /ask ----> Top-k fragmentos + score
          |                         |
          |             +-----------+-----------+
          |             |                       |
          |        OpenAI opcional          Fallback
          |        grounded answer          extractivo
          |             |                       |
          +-------------+-----------------------+
                        |
                        v
             Respuesta + fuentes
                        |
                        v
                   Frontend
```

## Requisitos

- Python 3.10 o superior.
- Para respuestas generativas: una API key propia de OpenAI. Es opcional; sin ella funciona el fallback extractivo.

## Ejecución local

```bash
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # En Windows, copia .env.example .env
uvicorn app.api:app --reload --port 8000
```

Abre `http://127.0.0.1:8000`. Documentación interactiva de la API: `http://127.0.0.1:8000/docs`.

Para activar generación con OpenAI, configura `OPENAI_API_KEY` y, opcionalmente, `OPENAI_MODEL` en `.env`. No subas `.env` al repositorio.

## Pruebas

```bash
pytest -q
```

Las pruebas verifican salud del servicio, recuperación de ingresos e IMOR, tratamiento de una consulta de precio objetivo no reportado y validación de entrada.

## Contrato de API

`POST /ask`

```json
{"question": "¿Cuáles fueron los ingresos totales del tercer trimestre de 2025?"}
```

La respuesta incluye `answer`, `sources`, `model`, `retrieval` y `evidence_fragments`. Los documentos de la demo usan secciones, no paginación PDF; por ello la referencia de trazabilidad es documento + sección + chunk, no número de página.

## Límites conocidos y siguientes mejoras

- BM25 es un baseline léxico; no es búsqueda vectorial ni reranking semántico.
- La demo carga documentos Markdown al iniciar; no implementa una consola de administración ni una base vectorial persistente.
- No implementa MCP, A2A, autenticación enterprise, autorización por roles, observabilidad distribuida ni despliegue productivo.
- El fallback es extractivo. La calidad generativa depende del modelo configurado y debe evaluarse antes de cualquier uso real.
- En un entorno productivo se recomienda incorporar extracción PDF controlada, evaluación de retrieval y groundedness, versionado de corpus, controles de acceso, logging seguro, monitoreo y revisión humana.

## Seguridad y privacidad

No se incluyen credenciales, documentos de clientes, estados financieros reales ni archivos del reto original. Usa únicamente documentos propios o con autorización. Las claves se proporcionan por variables de entorno.

## Evaluación demostrativa

Las pruebas de este repositorio son pruebas de software del prototipo. No deben confundirse con los resultados de evaluación del reto privado ni presentarse como evidencia de que este repositorio es idéntico a aquella implementación.

## Licencia

MIT. Consulta `LICENSE`.
