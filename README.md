# 非遗工业技艺数字化平台 · AI 传承文旅

> 全国首个非遗工业技艺数字化 **AI · 传承文旅平台** —— 把非遗技艺装进可检索、可问答、可体验的数字化档案库。

项目以「非物质文化遗产」为主题，构建一个集 **档案检索、智能问答（RAG）、线上体验、研学服务** 于一体的数字化平台。前端为纯静态页面，后端提供基于检索增强生成（RAG）的知识库问答服务。

---

## ✨ 功能特性

- **非遗技艺档案库**：结构化展示各地非遗项目（京剧、剪纸、皮艺、扬州漆器、东阳木雕、宣纸、竹编、景德镇制瓷、蓝印花布、端砚等）
- **AI 知识库问答**：基于自建知识库的 RAG 智能问答，回答严格依据资料、杜绝编造，并支持来源追溯
- **非遗线上体验**：图片 / 视频 / 3D 模型（GLB）多模态展示，含五感体验页面
- **线下研学体验服务**：研学项目、体验课程展示
- **新老匠人传承培育计划**：传承人申报与培育相关页面
- **知识库管理**：文档一键导入（`.docx` / `.txt`）、向量库统计、清空重建

---

## 🧱 技术栈

| 层 | 技术 |
| --- | --- |
| 后端框架 | [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn |
| 向量检索 | **TF-IDF**（`char_wb`，2-4 字 n-gram）+ **FAISS** |
| 大语言模型 | DeepSeek（OpenAI 兼容接口，默认）/ Claude（Anthropic SDK），可切换 |
| 文档解析 | `python-docx`（`.docx` / `.txt`） |
| 前端 | 原生 HTML + CSS + JavaScript，含 `model-viewer` 3D 展示 |

> 向量检索采用 **TF-IDF + FAISS** 的轻量方案：对中文友好、无需 GPU、无需下载大模型，开箱即用。

---

## 📁 项目结构

```
A计划-非遗文化/
├── backend/                    # FastAPI 后端（RAG 服务）
│   ├── main.py                 # 服务入口 + 全部 API 路由 + 静态文件托管
│   ├── ingest.py               # 文档导入脚本
│   ├── requirements.txt        # Python 依赖
│   ├── .env.example            # 环境变量模板
│   ├── data/knowledge_base/    # 知识库源文档（.docx / .txt）
│   ├── rag/                    # RAG 核心模块
│   │   ├── document_loader.py  # 文档加载
│   │   ├── text_splitter.py    # 文本切分
│   │   ├── vector_store.py     # TF-IDF + FAISS 向量库
│   │   └── rag_chain.py        # 检索 + LLM 生成链
│   └── vector_db/              # 向量库持久化文件（.pkl / .faiss）
├── html_base/                  # 前端静态页面（由后端托管）
│   ├── index.html              # 首页
│   ├── database.html           # 非遗档案库
│   ├── craft-detail.html       # 技艺详情
│   ├── rag-qa.html             # AI 知识库问答
│   ├── sensory.html            # 五感线上体验
│   ├── sports-games.html       # 体育游戏 / 线上体验
│   ├── register.html           # 传承培育计划
│   ├── school.html             # 研学体验服务
│   ├── css/  js/  data/  images/
└── captures/                   # 素材：图片 / 视频（show/）/ 3D 模型（.glb）
```

---

## 🚀 快速开始

### 1. 环境要求

- Python **3.10+**
- `pip`

### 2. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 配置环境变量

复制模板并填入你的 API Key：

```bash
cp .env.example .env
```

编辑 `backend/.env`，按需选择 LLM 提供商：

| 提供商 | 变量 | 说明 |
| --- | --- | --- |
| DeepSeek（默认） | `LLM_PROVIDER=deepseek`、`DEEPSEEK_API_KEY=sk-...` | 从 https://platform.deepseek.com/ 获取 |
| Claude | `LLM_PROVIDER=claude`、`ANTHROPIC_API_KEY=sk-ant-...` | 从 https://console.anthropic.com/ 获取 |

### 4. 启动服务

```bash
cd backend
python main.py
```

或在 Windows 下双击根目录的 **`启动后端.bat`**。

启动后：

- 平台首页：<http://localhost:8000>
- API 文档（Swagger UI）：<http://localhost:8000/docs>

> 首次启动若向量库为空，会自动导入 `backend/data/knowledge_base/` 中的文档。

### 5. 导入 / 更新知识库

把新文档（`.docx` / `.txt`）放入 `backend/data/knowledge_base/` 后：

```bash
python ingest.py --source "d:\A计划-非遗文化\中国非遗智能体档案.docx"
```

或调用接口：`POST /api/ingest`

---

## 🔌 API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 健康检查 / 服务信息 |
| GET | `/api/health` | 服务健康状态 |
| GET | `/api/stats` | 知识库统计（chunk 数、维度、模型） |
| GET | `/api/debug` | 查看当前模型 / 提供商配置 |
| POST | `/api/chat` | RAG 智能问答 |
| POST | `/api/ingest` | 导入知识库文档 |
| POST | `/api/clear` | 清空知识库 |

**问答请求示例：**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "端砚制作技艺有哪些工序？"}'
```

---

## 🛠️ 开发说明

- 后端启动后会把 `html_base/` 作为静态资源托管，因此**前端页面由后端统一服务**（无需单独部署前端）。
- 前端页面通过 `fetch` 调用后端 `/api/chat` 等接口，需确保前后端同源（默认同源部署于 8000 端口）。
- 更换向量库或文档后，调用 `POST /api/clear` 清空，再 `POST /api/ingest` 重建。

---

## 🔒 安全提示

- **不要将 `backend/.env` 提交到仓库** —— 其中包含真实的 API Key。请在 `.gitignore` 中忽略 `.env`，并妥善使用 `.env.example` 作为模板。
- 若 Key 已泄露，请立即到对应平台**吊销并重新生成**。
- `CORS` 当前允许所有来源（`allow_origins=["*"]`），生产环境请收紧为具体域名。

---

## 📄 许可证

待补充。
