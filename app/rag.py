"""Transparent BM25 retrieval for the synthetic public demo."""
from __future__ import annotations
import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
TOKEN_RE=re.compile(r"[a-záéíóúñü0-9]+",re.IGNORECASE)
def tokenize(text:str)->list[str]:
    return [x.lower() for x in TOKEN_RE.findall(text)]
@dataclass
class Chunk:
    doc_id:str
    title:str
    section:str
    text:str
    chunk_id:str
def split_words(text:str,size:int=115,overlap:int=20)->list[str]:
    words=text.split();step=max(1,size-overlap)
    return [" ".join(words[i:i+size]) for i in range(0,len(words),step) if words[i:i+size]]
def load_chunks(directory:Path)->list[Chunk]:
    chunks=[]
    for path in sorted(directory.glob("*.md")):
        title=path.stem;section="General";body=[]
        def flush():
            for part in split_words("\n".join(body)):
                chunks.append(Chunk(path.name,title,section,part,f"{path.stem}-{len(chunks)+1}"))
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith("# "):
                title=line[2:].strip()
            elif line.startswith("## "):
                if body:flush();body=[]
                section=line[3:].strip()
            else:body.append(line)
        if body:flush()
    return chunks
class BM25Index:
    def __init__(self,chunks:list[Chunk],k1:float=1.5,b:float=0.75):
        self.chunks=chunks;self.k1=k1;self.b=b
        self.tokens=[tokenize(c.text) for c in chunks]
        self.lengths=[len(t) for t in self.tokens]
        self.avgdl=sum(self.lengths)/max(len(self.lengths),1)
        self.df=Counter(term for terms in self.tokens for term in set(terms))
    def search(self,query:str,limit:int=5):
        terms=set(tokenize(query))
        if not terms:return []
        n=len(self.chunks);ranked=[]
        for i,tokens in enumerate(self.tokens):
            tf=Counter(tokens);score=0.0
            for term in terms:
                freq=tf[term]
                if not freq:continue
                idf=math.log(1+(n-self.df[term]+0.5)/(self.df[term]+0.5))
                denom=freq+self.k1*(1-self.b+self.b*self.lengths[i]/max(self.avgdl,1))
                score+=idf*freq*(self.k1+1)/denom
            if score>0:ranked.append((self.chunks[i],score))
        return sorted(ranked,key=lambda x:x[1],reverse=True)[:limit]
