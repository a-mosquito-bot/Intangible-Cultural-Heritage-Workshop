# Intangible Cultural Heritage Industrial Craft Digital Platform · AI Inheritance & Cultural Tourism

> China's first digital **AI · Inheritance & Cultural Tourism platform** for intangible cultural heritage industrial crafts — bringing ICH crafts into a searchable, queryable, and experiential digital archive.

The project, themed around "intangible cultural heritage", builds a digital platform that integrates **archive retrieval, intelligent Q&A (RAG), online experience, and study-tour services**. The frontend is a pure static site, while the backend provides knowledge-base Q&A powered by retrieval-augmented generation (RAG).

---

## 🌐 Live Demo

**[www.bigeleven.top](https://www.bigeleven.top)** — an online preview of the frontend experience.

> The live site is a lightweight static deployment (frontend only): you can browse the ICH archive, the sensory experience pages, and the 3D models right away. The AI Q&A (RAG) feature runs on the backend, which isn't part of the static deployment — for the full experience including intelligent Q&A, [run it locally](#-quick-start).

---

## ✨ Features

- **ICH Craft Archive**: structured display of heritage crafts across China (Peking Opera, paper-cutting, leather craft, Yangzhou lacquerware, Dongyang wood carving, Xuan paper, bamboo weaving, Jingdezhen porcelain, blue calico, Duan inkstone, and more)
- **AI Knowledge-Base Q&A**: RAG-based intelligent Q&A built on a self-hosted knowledge base, answering strictly from source material (no fabrication) with source tracing
- **ICH Online Experience**: multimodal display of images / videos / 3D models (GLB), including a five-senses experience page
- **Offline Study-Tour Services**: study-tour programs and experiential courses
- **Master–Apprentice Inheritance Program**: pages for inheritor registration and cultivation
- **Knowledge-Base Management**: one-click document import (`.docx` / `.txt`), vector-store statistics, clear & rebuild

---

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| Backend framework | [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn |
| Vector retrieval | **TF-IDF** (`char_wb`, 2–4 char n-gram) + **FAISS** |
| LLM | DeepSeek (OpenAI-compatible API, default) / Claude (Anthropic SDK), switchable |
| Document parsing | `python-docx` (`.docx` / `.txt`) |
| Frontend | Vanilla HTML + CSS + JavaScript, including `model-viewer` for 3D |

> Vector retrieval uses a lightweight **TF-IDF + FAISS** approach: friendly to Chinese text, no GPU required, no need to download a large model — works out of the box.

---

## 📁 Project Structure

```
ProjectA_ICHWorkshop/
├── backend/                    # FastAPI backend (RAG service)
│   ├── main.py                 # Service entry point + all API routes + static file hosting
│   ├── ingest.py               # Document import script
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── data/knowledge_base/    # Knowledge-base source documents (.docx / .txt)
│   ├── rag/                    # RAG core modules
│   │   ├── document_loader.py  # Document loading
│   │   ├── text_splitter.py    # Text splitting
│   │   ├── vector_store.py     # TF-IDF + FAISS vector store
│   │   └── rag_chain.py        # Retrieval + LLM generation chain
│   └── vector_db/              # Persisted vector-store files (.pkl / .faiss)
├── html_base/                  # Frontend static pages (served by the backend)
│   ├── index.html              # Homepage
│   ├── database.html           # ICH craft archive
│   ├── craft-detail.html       # Craft details
│   ├── rag-qa.html             # AI knowledge-base Q&A
│   ├── sensory.html            # Five-senses online experience
│   ├── sports-games.html       # Sports games / online experience
│   ├── register.html           # Inheritance & cultivation program
│   ├── school.html             # Study-tour services
│   ├── css/  js/  data/  images/
└── captures/                   # Assets: images / videos (show/) / 3D models (.glb)
```

---

## 🚀 Quick Start

### 1. Requirements

- Python **3.10+**
- `pip`

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy the template and fill in your API key:

```bash
cp .env.example .env
```

Edit `backend/.env` and choose your LLM provider:

| Provider | Variables | Notes |
| --- | --- | --- |
| DeepSeek (default) | `LLM_PROVIDER=deepseek`, `DEEPSEEK_API_KEY=sk-...` | Get one at https://platform.deepseek.com/ |
| Claude | `LLM_PROVIDER=claude`, `ANTHROPIC_API_KEY=sk-ant-...` | Get one at https://console.anthropic.com/ |

### 4. Start the Service

```bash
cd backend
python main.py
```

Or on Windows, double-click **`启动后端.bat`** in the project root.

Once started:

- Platform homepage: <http://localhost:8000>
- API docs (Swagger UI): <http://localhost:8000/docs>

> On first launch, if the vector store is empty, documents in `backend/data/knowledge_base/` are imported automatically.

### 5. Import / Update the Knowledge Base

After placing new documents (`.docx` / `.txt`) into `backend/data/knowledge_base/`:

```bash
python ingest.py --source "path\to\中国非遗智能体档案.docx"
```

Or call the endpoint: `POST /api/ingest`

---

## 🔌 API Overview

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Health check / service info |
| GET | `/api/health` | Service health status |
| GET | `/api/stats` | Knowledge-base statistics (chunk count, dimensions, model) |
| GET | `/api/debug` | View current model / provider configuration |
| POST | `/api/chat` | RAG intelligent Q&A |
| POST | `/api/ingest` | Import knowledge-base documents |
| POST | `/api/clear` | Clear the knowledge base |

**Q&A request example:**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the steps of Duan inkstone craftsmanship?"}'
```

---

## 🛠️ Development Notes

- After startup, the backend serves `html_base/` as static assets, so **the frontend is served by the backend** (no separate frontend deployment needed).
- Frontend pages call backend endpoints such as `/api/chat` via `fetch`; keep the frontend and backend same-origin (by default both are served on port 8000).
- After changing the vector store or documents, call `POST /api/clear` to clear it, then `POST /api/ingest` to rebuild.

---

## 🔒 Security Notes

- **Never commit `backend/.env` to the repository** — it contains real API keys. Ignore `.env` in `.gitignore` and use `.env.example` as the template.
- If a key has been exposed, **revoke and regenerate it** on the corresponding platform immediately.
- `CORS` currently allows all origins (`allow_origins=["*"]`); restrict it to specific domains in production.

---

## 📄 License

To be added.
