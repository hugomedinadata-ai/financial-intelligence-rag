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
    emptyTitle.textContent = "Sin evidencia recuperada";
    const emptyText = document.createElement("p");
    emptyText.textContent = "Las fuentes documentales aparecerán aquí después de realizar una consulta.";
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

  const renderResponse = (payload, elapsed) => {
    const answerText = typeof payload.answer === "string" ? payload.answer : "El servicio no devolvió una respuesta legible.";
    const isAbstention = payload.model === "abstention" || /no encontr[eé] evidencia suficiente/i.test(answerText);
    lastAnswer = answerText;
    questionContext.textContent = "Consulta: " + question.value.trim();
    answer.textContent = answerText;
    responseTitle.textContent = isAbstention ? "Evidencia insuficiente" : "Resultado del análisis";
    responseCard.dataset.kind = isAbstention ? "abstention" : "answer";
    responseCard.hidden = false;
    responseMeta.replaceChildren();
    responseMeta.append(
      makeMeta("Recuperación: " + (payload.retrieval || "BM25")),
      makeMeta("Generación: " + (payload.model || "No especificada")),
      makeMeta("Fuentes: " + (Array.isArray(payload.sources) ? payload.sources.length : 0)),
      makeMeta(elapsed + " ms")
    );
    renderSources(payload.evidence_fragments || payload.sources || []);
    setStatus(isAbstention ? "ready" : "ready", isAbstention ? "Consulta completada · El sistema se abstuvo por falta de evidencia" : "Consulta completada · Evidencia documental disponible", elapsed + " ms");
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
      renderResponse(payload, Math.round(performance.now() - started));
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

  healthRefresh.addEventListener("click", checkHealth);
  question.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  checkHealth();
})();