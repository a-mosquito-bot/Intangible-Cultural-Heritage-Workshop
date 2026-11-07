# 非遗工业技艺数字化平台 · AI 传承文旅

**Intangible Cultural Heritage Industrial Craft Digital Platform · AI Inheritance & Cultural Tourism**

> 全国首个非遗工业技艺数字化 **AI · 传承文旅平台** —— 把非遗技艺装进可检索、可问答、可体验的数字化档案库。
> China's first digital **AI · Inheritance & Cultural Tourism platform** for intangible cultural heritage industrial crafts — bringing ICH crafts into a searchable, queryable, and experiential digital archive.

项目以「非物质文化遗产」为主题，构建一个集 **档案检索、智能问答（RAG）、线上体验、研学服务** 于一体的数字化平台。前端为纯静态页面，后端提供基于检索增强生成（RAG）的知识库问答服务。
The project, themed around "intangible cultural heritage", builds a digital platform that integrates **archive retrieval, intelligent Q&A (RAG), online experience, and study-tour services**. The frontend is a pure static site, while the backend provides knowledge-base Q&A powered by retrieval-augmented generation (RAG).

---

## 🌐 在线演示 · Live Demo

**[www.bigeleven.top](https://www.bigeleven.top)** —— 前端体验的在线预览。
An online preview of the frontend experience.

> 线上站点是轻量级纯静态部署（仅前端）：你可以直接浏览非遗档案库、五感体验页面和 3D 模型。AI 知识库问答（RAG）功能运行在后端，静态部署不包含后端 —— 如需完整体验（含智能问答），请[本地运行](#-快速开始--quick-start)。
> The live site is a lightweight static deployment (frontend only): you can browse the ICH archive, the sensory experience pages, and the 3D models right away. The AI Q&A (RAG) feature runs on the backend, which isn't part of the static deployment — for the full experience including intelligent Q&A, [run it locally](#-快速开始--quick-start).

---

## ✨ 功能特性 · Features

- **非遗技艺档案库**：结构化展示各地非遗项目（京剧、剪纸、皮艺、扬州漆器、东阳木雕、宣纸、竹编、景德镇制瓷、蓝印花布、端砚等）
  **ICH Craft Archive**: structured display of heritage crafts across China (Peking Opera, paper-cutting, leather craft, Yangzhou lacquerware, Dongyang wood carving, Xuan paper, bamboo weaving, Jingdezhen porcelain, blue calico, Duan inkstone, and more)
- **AI 知识库问答**：基于自建知识库的 RAG 智能问答，回答严格依据资料、杜绝编造，并支持来源追溯
  **AI Knowledge-Base Q&A**: RAG-based intelligent Q&A built on a self-hosted knowledge base, answering strictly from source material (no fabrication) with source tracing
- **非遗线上体验**：图片 / 视频 / 3D 模型（GLB）多模态展示，含五感体验页面
  **ICH Online Experience**: multimodal display of images / videos / 3D models (GLB), including a five-senses experience page
- **线下研学体验服务**：研学项目、体验课程展示
  **Offline Study-Tour Services**: study-tour programs and experiential courses
- **新老匠人传承培育计划**：传承人申报与培育相关页面
  **Master–Apprentice Inheritance Program**: pages for inheritor registration and cultivation
- **知识库管理**：文档一键导入（`.docx` / `.txt`）、向量库统计、清空重建
  **Knowledge-Base Management**: one-click document import (`.docx` / `.txt`), vector-store statistics, clear & rebuild

---

## 🧱 技术栈 · Tech Stack

| 层 · Layer | 技术 · Technology |
| --- | --- |
| 后端框架 · Backend framework | [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn |
| 向量检索 · Vector retrieval | **TF-IDF**（`char_wb`，2-4 字 n-gram）+ **FAISS** |
| 大语言模型 · LLM | DeepSeek（OpenAI 兼容接口，默认 · default）/ Claude（Anthropic SDK），可切换 · switchable |
| 文档解析 · Document parsing | `python-docx`（`.docx` / `.txt`） |
| 前端 · Frontend | 原生 HTML + CSS + JavaScript · Vanilla HTML + CSS + JS，含 `model-viewer` 3D 展示 |

> 向量检索采用 **TF-IDF + FAISS** 的轻量方案：对中文友好、无需 GPU、无需下载大模型，开箱即用。
> Vector retrieval uses a lightweight **TF-IDF + FAISS** approach: friendly to Chinese text, no GPU required, no need to download a large model — works out of the box.

---

## 📁 项目结构 · Project Structure

```
ProjectA_ICHWorkshop/
├── backend/                    # FastAPI 后端（RAG 服务）· FastAPI backend (RAG service)
│   ├── main.py                 # 服务入口 + 全部 API 路由 + 静态文件托管 · entry point + all API routes + static hosting
│   ├── ingest.py               # 文档导入脚本 · document import script
│   ├── requirements.txt        # Python 依赖 · Python dependencies
│   ├── .env.example            # 环境变量模板 · environment variable template
│   ├── data/knowledge_base/    # 知识库源文档（.docx / .txt）· knowledge-base source documents
│   ├── rag/                    # RAG 核心模块 · RAG core modules
│   │   ├── document_loader.py  # 文档加载 · document loading
│   │   ├── text_splitter.py    # 文本切分 · text splitting
│   │   ├── vector_store.py     # TF-IDF + FAISS 向量库 · TF-IDF + FAISS vector store
│   │   └── rag_chain.py        # 检索 + LLM 生成链 · retrieval + LLM generation chain
│   └── vector_db/              # 向量库持久化文件（.pkl / .faiss）· persisted vector-store files
├── html_base/                  # 前端静态页面（由后端托管）· frontend static pages (served by backend)
│   ├── index.html              # 首页 · homepage
│   ├── database.html           # 非遗档案库 · ICH craft archive
│   ├── craft-detail.html       # 技艺详情 · craft details
│   ├── rag-qa.html             # AI 知识库问答 · AI knowledge-base Q&A
│   ├── sensory.html            # 五感线上体验 · five-senses online experience
│   ├── sports-games.html       # 体育游戏 / 线上体验 · sports games / online experience
│   ├── register.html           # 传承培育计划 · inheritance & cultivation program
│   ├── school.html             # 研学体验服务 · study-tour services
│   ├── css/  js/  data/  images/
└── captures/                   # 素材：图片 / 视频（show/）/ 3D 模型（.glb）· assets: images / videos / 3D models
```

---

## 🚀 快速开始 · Quick Start

### 1. 环境要求 · Requirements

- Python **3.10+**
- `pip`

### 2. 安装依赖 · Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. 配置环境变量 · Configure Environment Variables

复制模板并填入你的 API Key：
Copy the template and fill in your API key:

```bash
cp .env.example .env
```

编辑 `backend/.env`，按需选择 LLM 提供商：
Edit `backend/.env` and choose your LLM provider:

| 提供商 · Provider | 变量 · Variables | 说明 · Notes |
| --- | --- | --- |
| DeepSeek（默认 · default） | `LLM_PROVIDER=deepseek`、`DEEPSEEK_API_KEY=sk-...` | 从 https://platform.deepseek.com/ 获取 · Get one at https://platform.deepseek.com/ |
| Claude | `LLM_PROVIDER=claude`、`ANTHROPIC_API_KEY=sk-ant-...` | 从 https://console.anthropic.com/ 获取 · Get one at https://console.anthropic.com/ |

### 4. 启动服务 · Start the Service

```bash
cd backend
python main.py
```

或在 Windows 下双击根目录的 **`启动后端.bat`**。
Or on Windows, double-click **`启动后端.bat`** in the project root.

启动后：
Once started:

- 平台首页 · Platform homepage：<http://localhost:8000>
- API 文档（Swagger UI）· API docs (Swagger UI)：<http://localhost:8000/docs>

> 首次启动若向量库为空，会自动导入 `backend/data/knowledge_base/` 中的文档。
> On first launch, if the vector store is empty, documents in `backend/data/knowledge_base/` are imported automatically.

### 5. 导入 / 更新知识库 · Import / Update the Knowledge Base

把新文档（`.docx` / `.txt`）放入 `backend/data/knowledge_base/` 后：
After placing new documents (`.docx` / `.txt`) into `backend/data/knowledge_base/`:

```bash
python ingest.py --source "path\to\中国非遗智能体档案.docx"
```

或调用接口 · Or call the endpoint：`POST /api/ingest`

---

## 🔌 API 概览 · API Overview

| 方法 · Method | 路径 · Path | 说明 · Description |
| --- | --- | --- |
| GET | `/` | 健康检查 / 服务信息 · Health check / service info |
| GET | `/api/health` | 服务健康状态 · Service health status |
| GET | `/api/stats` | 知识库统计（chunk 数、维度、模型）· KB statistics (chunk count, dimensions, model) |
| GET | `/api/debug` | 查看当前模型 / 提供商配置 · View current model / provider configuration |
| POST | `/api/chat` | RAG 智能问答 · RAG intelligent Q&A |
| POST | `/api/ingest` | 导入知识库文档 · Import knowledge-base documents |
| POST | `/api/clear` | 清空知识库 · Clear the knowledge base |

**问答请求示例 · Q&A request example：**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "端砚制作技艺有哪些工序？"}'
```

---

## 🛠️ 开发说明 · Development Notes

- 后端启动后会把 `html_base/` 作为静态资源托管，因此**前端页面由后端统一服务**（无需单独部署前端）。
  After startup, the backend serves `html_base/` as static assets, so **the frontend is served by the backend** (no separate frontend deployment needed).
- 前端页面通过 `fetch` 调用后端 `/api/chat` 等接口，需确保前后端同源（默认同源部署于 8000 端口）。
  Frontend pages call backend endpoints such as `/api/chat` via `fetch`; keep the frontend and backend same-origin (by default both are served on port 8000).
- 更换向量库或文档后，调用 `POST /api/clear` 清空，再 `POST /api/ingest` 重建。
  After changing the vector store or documents, call `POST /api/clear` to clear it, then `POST /api/ingest` to rebuild.

---
