---
name: lightrag
description: Sistema de Retrieval-Augmented Generation basado en grafos de conocimiento. Construye grafos automaticamente desde documentos, consulta con hibridacion local/global, y mejora respuestas de LLM con recuperacion estructurada.
---

# LightRAG

Sistema RAG open-source con grafos de conocimiento por HKU Data Science Lab.

## Origen
- GitHub: https://github.com/hkuds/lightrag
- Instalacion oficial: `pip install lightrag-hku`

## Cuando usar esta skill
- Usuario quiere construir un RAG avanzado sobre sus documentos
- Necesita recuperacion basada en grafos de conocimiento
- Busca sistema RAG con hibridacion local + global

## Uso basico
```python
from lightrag import LightRAG, QueryParam

rag = LightRAG(working_dir="./rag_storage")

# Insertar documentos
rag.insert("texto del documento...")

# Consultar
result = rag.query("pregunta?", param=QueryParam(mode="hybrid"))
```

## Modos de consulta
- `naive`: busqueda vectorial simple
- `local`: contexto local al nodo
- `global`: contexto global del grafo
- `hybrid`: combina local y global
