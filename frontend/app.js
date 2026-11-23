(() => {
  const form = document.querySelector("#ask-form");
  const question = document.querySelector("#question");
  const askButton = document.querySelector("#ask");
  const status = document.querySelector("#status");
  const statusText = document.querySelector("#status-text");
  const latency = document.querySelector("#latency");
  const responseCard = document.querySelector("#response-card");
  const answer = document.querySelector("#answer");
  const questionContext = document.querySelector("#question-context");
  const responseTitle = document.querySelector("#response-title");
  const responseMeta = document.querySelector("#response-meta");
  const sources = document.querySelector("#sources");
  const sourcesEmpty = document.querySelector("#sources-empty");
  const sourceCount = document.querySelector("#source-count");
  const healthRefresh = document.querySelector("#health-refresh");
  let lastAnswer = "";

  const setStatus = (state, message, duration = "") => {
    status.dataset.state = state;
    statusText.textContent = message;
    latency.textContent = duration;
  };

  const makeMeta = (label) => {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    chip.textContent = label;
    return chip;
  };

  const renderSources = (items) => {
    sources.replaceChildren();
    const list = Array.isArray(items) ? items : [];
    sourceCount.textContent = String(list.length);
    sourcesEmpty.hidden = list.length > 0;
    sourcesEmpty.replaceChildren();
    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-graphic";
    emptyIcon.textContent = "▤";
    const emptyTitle = document.createElement("strong");
    emptyTitle.textContent = list.length ? "Selecciona una evidencia" : "Sin evidencia recuperada";
    const emptyText = document.createElement("p");
    emptyText.textContent = list.length
      ? "Selecciona «Ver fragmento de evidencia» para inspeccionar el documento, la sección y el fragmento."
      : "Las fuentes documentales aparecerán aquí después de realizar una consulta.";
    sourcesEmpty.append(emptyIcon, emptyTitle, emptyText);

    list.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "source-card";
      card.dataset.chunkId = item.chunk_id || String(index);

      const top = document.createElement("div");
      top.className = "source-top";
      const fileIcon = document.createElement("span");
      fileIcon.className = "source-file-icon";
      fileIcon.textContent = "▤";

      const titleWrap = document.createElement("div");
      const title = document.createElement("div");
      title.className = "source-title";
      title.textContent = item.title || item.document || item.source || "Documento sin título";
      const section = document.createElement("div");
      section.className = "source-section";
      section.textContent = [item.section || "Sección no especificada", item.chunk_id || ""].filter(Boolean).join(" · ");
      titleWrap.append(title, section);

      const score = document.createElement("span");
      score.className = "source-score";
      const scoreValue = Number(item.relevance_bm25 ?? item.score);
      score.textContent = Number.isFinite(scoreValue) ? "BM25 " + scoreValue.toFixed(3) : "BM25";

      top.append(fileIcon, titleWrap, score);
      card.append(top);

      const fragment = item.text || item.excerpt;
      if (fragment) {
        const details = document.createElement("details");
        details.className = "source-details";
        const summary = document.createElement("summary");
        summary.textContent = "Ver fragmento de evidencia";
        const excerpt = document.createElement("p");
        excerpt.textContent = fragment;
        details.append(summary, excerpt);
        details.addEventListener("toggle", () => {
          if (!details.open) return;
          sources.querySelectorAll(".source-card").forEach((node) => node.classList.remove("is-selected"));
          card.classList.add("is-selected");
          sourcesEmpty.hidden = false;
          sourcesEmpty.replaceChildren();
          const selectedTitle = document.createElement("strong");
          selectedTitle.textContent = "Evidencia seleccionada";
          const selectedDocument = document.createElement("p");
          selectedDocument.textContent = [item.title || item.source || "Documento", item.section || "Sección no especificada", item.chunk_id || ""].filter(Boolean).join(" · ");
          const selectedHint = document.createElement("p");
          selectedHint.className = "selected-evidence-text";
          selectedHint.textContent = fragment;
          sourcesEmpty.append(selectedTitle, selectedDocument, selectedHint);
        });
        card.append(details);
      } else {
        const excerpt = document.createElement("p");
        excerpt.className = "source-excerpt";
        excerpt.textContent = "El servicio no devolvió el texto del fragmento.";
        card.append(excerpt);
      }
      sources.append(card);
    });
  };

  const renderResponse = (payload, elapsed, userQuestion) => {
    const answerText = typeof payload.answer === "string" ? payload.answer : "El servicio no devolvió una respuesta legible.";
    const evidence = Array.isArray(payload.evidence_fragments) ? payload.evidence_fragments : (Array.isArray(payload.sources) ? payload.sources : []);
    const isAbstention = payload.model === "abstention" || /no encontr[eé] evidencia suficiente/i.test(answerText);
    const asksPriceTarget = /precio objetivo|price target|precio de la acci[oó]n.*objetivo/i.test(userQuestion || "");
    const confirmsUnavailable = asksPriceTarget && /no publica un precio objetivo|no se encontr[oó] un precio objetivo/i.test(answerText);
    const hasEvidence = evidence.length > 0;
    const outcomeTitle = confirmsUnavailable
      ? "Dato no publicado"
      : (isAbstention ? (hasEvidence ? "Respuesta no concluyente" : "Evidencia insuficiente") : "Resultado del análisis");
    const outcomeStatus = confirmsUnavailable
      ? "Consulta completada · Evidencia encontrada: el dato no está publicado"
      : (isAbstention
        ? (hasEvidence ? "Consulta completada · Abstención: la evidencia no permite determinar el dato" : "Consulta completada · No se encontró evidencia suficiente")
        : "Consulta completada · Evidencia documental disponible");
    lastAnswer = answerText;
    questionContext.textContent = "Consulta: " + question.value.trim();
    answer.textContent = answerText;
    responseTitle.textContent = outcomeTitle;
    responseCard.dataset.kind = confirmsUnavailable ? "grounded-abstention" : (isAbstention ? "abstention" : "answer");
    responseCard.hidden = false;
    responseMeta.replaceChildren();
    responseMeta.append(
      makeMeta("Recuperación: " + (payload.retrieval || "BM25")),
      makeMeta(confirmsUnavailable ? "Resultado: abstención fundamentada" : "Generación: " + (payload.model || "No especificada")),
      makeMeta("Fuentes: " + evidence.length),
      makeMeta(elapsed + " ms")
    );
    renderSources(evidence);
    setStatus("ready", outcomeStatus, elapsed + " ms");
  };

  const checkHealth = async () => {
    healthRefresh.disabled = true;
    healthRefresh.textContent = "…";
    try {
      const response = await fetch("/health", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Health check HTTP " + response.status);
      const data = await response.json();
      if (data.status !== "ok") throw new Error("Servicio no saludable");
      setStatus("ready", "API conectada · " + (data.retrieval || "BM25") + " · " + (data.documents ?? "—") + " documentos");
      healthRefresh.title = "API saludable · Actualizar estado";
    } catch (error) {
      setStatus("error", "No se pudo verificar la API. Comprueba el despliegue o inténtalo de nuevo.");
      healthRefresh.title = error.message;
    } finally {
      healthRefresh.disabled = false;
      healthRefresh.textContent = "↻";
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = question.value.trim();
    if (text.length < 3) {
      setStatus("error", "Escribe una pregunta de al menos 3 caracteres.");
      question.focus();
      return;
    }

    askButton.disabled = true;
    askButton.querySelector("span:first-child").textContent = "Analizando…";
    responseCard.hidden = true;
    setStatus("loading", "Buscando evidencia en el corpus documental…");
    const started = performance.now();

    try {
      const response = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ question: text })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof payload.detail === "string" ? payload.detail : "El servicio respondió con HTTP " + response.status + ".";
        throw new Error(detail);
      }
      renderResponse(payload, Math.round(performance.now() - started), text);
    } catch (error) {
      responseCard.hidden = false;
      responseCard.dataset.kind = "error";
      responseTitle.textContent = "No fue posible completar la consulta";
      questionContext.textContent = "Consulta: " + text;
      answer.textContent = error.message || "Ocurrió un error inesperado al consultar el servicio.";
      responseMeta.replaceChildren(makeMeta("Estado: error"), makeMeta("Reintenta en unos momentos"));
      renderSources([]);
      setStatus("error", "Error de consulta · " + (error.message || "Fallo de conexión"));
    } finally {
      askButton.disabled = false;
      askButton.querySelector("span:first-child").textContent = "Consultar";
    }
  });

  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => {
      question.value = button.dataset.question || "";
      question.focus();
      form.requestSubmit();
    });
  });

  document.querySelector("#copy-answer").addEventListener("click", async () => {
    if (!lastAnswer) return;
    const button = document.querySelector("#copy-answer");
    try {
      await navigator.clipboard.writeText(lastAnswer);
      button.textContent = "Copiado ✓";
      window.setTimeout(() => { button.textContent = "Copiar respuesta"; }, 1600);
    } catch {
      button.textContent = "No disponible";
    }
  });

  const analyticsGrid = document.querySelector("#analytics-metrics");
  const analyticsPeriod = document.querySelector("#analytics-period");
  const compareButton = document.querySelector("#compare-periods");
  const comparisonResult = document.querySelector("#comparison-result");

  const loadAnalytics = async () => {
    try {
      const response = await fetch("/analytics/overview", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      analyticsPeriod.textContent = "Periodo disponible · " + (data.available_periods || []).join(", ");
      analyticsGrid.replaceChildren();
      (data.metrics || []).forEach((metric) => {
        const card = document.createElement("article");
        card.className = "analytics-metric";
        const name = document.createElement("span");
        name.className = "analytics-metric-name";
        name.textContent = metric.name;
        const value = document.createElement("strong");
        value.className = "analytics-metric-value";
        value.textContent = metric.value + (metric.unit === "%" ? "%" : " M");
        const provenance = document.createElement("small");
        provenance.textContent = [metric.title, metric.section, metric.chunk_id].filter(Boolean).join(" · ");
        card.append(name, value, provenance);
        analyticsGrid.append(card);
      });
      if (!data.metrics || !data.metrics.length) {
        const empty = document.createElement("p");
        empty.className = "analytics-placeholder";
        empty.textContent = "No se encontraron indicadores estructurados en el corpus.";
        analyticsGrid.append(empty);
      }
      comparisonResult.textContent = data.historical_series_available
        ? "Hay más de un periodo disponible. Puedes solicitar una comparación."
        : "Solo existe información de Q3 2025. No se mostrarán variaciones históricas sin documentos de otros periodos.";
    } catch {
      analyticsPeriod.textContent = "Indicadores no disponibles";
      analyticsGrid.textContent = "No fue posible consultar el resumen financiero.";
      comparisonResult.textContent = "No se pudo verificar la cobertura histórica del corpus.";
    }
  };

  compareButton.addEventListener("click", async () => {
    compareButton.disabled = true;
    compareButton.textContent = "Validando…";
    comparisonResult.textContent = "Comprobando cobertura documental para Q2 y Q3 2025…";
    try {
      const response = await fetch("/analytics/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ period_a: "Q2 2025", period_b: "Q3 2025" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error("HTTP " + response.status);
      comparisonResult.textContent = data.message + " Periodos disponibles: " + (data.available_periods || []).join(", ");
    } catch {
      comparisonResult.textContent = "No fue posible validar la comparación. Inténtalo nuevamente.";
    } finally {
      compareButton.disabled = false;
      compareButton.textContent = "Validar Q2 vs Q3 2025";
    }
  });

  healthRefresh.addEventListener("click", checkHealth);
  question.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  checkHealth();
  loadAnalytics();
})();