from __future__ import annotations
import os
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from app.rag import BM25Index, load_chunks
ROOT=Path(__file__).resolve().parents[1]
load_dotenv(ROOT/".env")
CHUNKS=load_chunks(ROOT/"data"/"documents")
INDEX=BM25Index(CHUNKS)
app=FastAPI(title="Financial Intelligence RAG Demo",version="1.0.0")
class AskRequest(BaseModel):
    question:str=Field(min_length=3,max_length=1500)
def answer_question(question:str,evidence:list[dict[str,Any]])->tuple[str,str]:
    if not evidence:return "No encontré evidencia suficiente en los documentos disponibles.","abstention"
    key=os.getenv("OPENAI_API_KEY","").strip()
    if key:
        try:
            from openai import OpenAI
            client=OpenAI(api_key=key)
            context="\n\n".join(f"[{e['source']} | {e['section']}] {e['text']}" for e in evidence)
            result=client.chat.completions.create(model=os.getenv("OPENAI_MODEL","gpt-4.1-mini"),temperature=0,messages=[
                {"role":"system","content":"Responde en español usando solo la evidencia. Si no basta, indícalo. No inventes cifras. Cita documento y sección."},
                {"role":"user","content":f"Pregunta: {question}\n\nEvidencia:\n{context}"}])
            return result.choices[0].message.content or "Sin respuesta.","openai"
        except Exception:pass
    return "La evidencia documental más relevante indica:\n\n"+"\n\n".join(f"{e['text']} (Fuente: {e['source']}, sección: {e['section']})." for e in evidence[:2]),"extractive-fallback"
@app.get("/health")
def health():return {"status":"ok","documents":len({c.doc_id for c in CHUNKS}),"chunks":len(CHUNKS),"retrieval":"BM25"}
@app.post("/ask")
def ask(payload:AskRequest):
    hits=INDEX.search(payload.question,limit=5)
    evidence=[{"source":c.doc_id,"title":c.title,"section":c.section,"chunk_id":c.chunk_id,"score":round(score,4),"text":c.text} for c,score in hits]
    answer,model=answer_question(payload.question,evidence if hits and hits[0][1]>0 else [])
    return {"answer":answer,"sources":[{"document":e["source"],"title":e["title"],"section":e["section"],"relevance_bm25":e["score"]} for e in evidence],"model":model,"retrieval":"BM25","evidence_fragments":evidence}
app.mount("/static",StaticFiles(directory=ROOT/"frontend"),name="static")
@app.get("/")
def root():
    from fastapi.responses import FileResponse
    return FileResponse(ROOT/"frontend"/"index.html")
