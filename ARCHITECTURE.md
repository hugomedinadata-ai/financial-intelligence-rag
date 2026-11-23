# Arquitectura

1. La aplicación carga el corpus Markdown sintético al iniciar.
2. Los documentos se dividen por encabezados y ventanas de palabras con solapamiento.
3. BM25 calcula la relevancia léxica y devuelve hasta cinco fragmentos.
4. Si existe OPENAI_API_KEY, los fragmentos se envían al modelo configurado con instrucción de responder solo con evidencia. Sin clave, se usa un fallback extractivo.
5. La API devuelve respuesta, fragmentos y referencias de documento/sección.

## Decisiones
- BM25 es un baseline interpretable y reproducible.
- La trazabilidad usa documento + sección + chunk; no se inventan páginas PDF.
- Si no hay coincidencia léxica, el sistema se abstiene.
- La generación LLM es opcional.

## Límites
No hay autenticación, autorización, persistencia de índice, parser PDF, vector retrieval, reranking semántico, aislamiento de prompt, monitoreo productivo ni controles enterprise. No se implementan MCP ni A2A. El corpus y todas sus cifras son sintéticos.
