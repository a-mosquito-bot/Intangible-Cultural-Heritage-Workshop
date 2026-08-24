"""
非遗知识库 RAG 系统 - FastAPI 服务
提供文档导入、知识检索、智能问答接口
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import Optional

# 强制 stdout 使用 UTF-8，解决 Windows 控制台 cp1252 无法输出中文和 emoji 的问题
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# 加载环境变量 (override=True 强制覆盖已有的环境变量)
load_dotenv(override=True)

# 确保 rag 模块可导入
sys.path.insert(0, os.path.dirname(__file__))

from rag.document_loader import load_documents
from rag.text_splitter import chunk_documents
from rag.vector_store import VectorStore
from rag.rag_chain import RAGChain


# ===== 全局状态 =====
vector_store: Optional[VectorStore] = None
rag_chain: Optional[RAGChain] = None


def init_system():
    """初始化 RAG 系统"""
    global vector_store, rag_chain

    persist_dir = os.getenv("VECTOR_DB_DIR", "./vector_db")
    provider = os.getenv("LLM_PROVIDER", "deepseek")

    print("=" * 60)
    print("  非遗知识库 RAG 系统初始化")
    print("=" * 60)

    vector_store = VectorStore(
        collection_name="ich_knowledge",
        persist_dir=persist_dir,
    )

    rag_chain = RAGChain(
        vector_store=vector_store,
        provider=provider,
    )

    stats = vector_store.get_stats()
    print(f"\n  向量库状态: {stats['total_chunks']} 条记录")
    print(f"  LLM 模型: {rag_chain.model}")
    print("=" * 60)

    # 如果向量库为空，自动导入知识库
    if stats["total_chunks"] == 0:
        print("\n⚠️  向量库为空，正在自动导入知识库...")
        knowledge_dir = os.path.join(os.path.dirname(__file__), "data", "knowledge_base")
        if os.path.exists(knowledge_dir):
            _ingest_documents(knowledge_dir)
        else:
            print(f"  知识库目录不存在: {knowledge_dir}")
            print("  请将文档放入 data/knowledge_base/ 后调用 POST /api/ingest")


def _ingest_documents(knowledge_dir: str) -> int:
    """内部文档导入函数"""
    global vector_store

    print(f"\n📂 扫描目录: {knowledge_dir}")
    docs = load_documents(knowledge_dir)
    if not docs:
        print("  未找到任何文档")
        return 0

    chunks = chunk_documents(docs)
    count = vector_store.add_chunks(chunks)
    print(f"  ✅ 导入完成: {count} 条记录\n")
    return count


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    print(">>> 启动非遗知识库 RAG 系统...")
    init_system()
    yield
    print("\n>>> 关闭服务...")


# ===== FastAPI 应用 =====
app = FastAPI(
    title="非遗知识库 RAG API",
    description="基于检索增强生成的非物质文化遗产智能问答系统",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置：允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== 数据模型 =====
class ChatRequest(BaseModel):
    question: str = Field(..., description="用户问题", min_length=1, max_length=2000)
    history: Optional[list[dict]] = Field(
        default=None, description="对话历史 [{'role':'user'|'assistant','content':'...'}]"
    )


class ChatResponse(BaseModel):
    answer: str = Field(..., description="AI 回答")
    sources: list[dict] = Field(default=[], description="参考来源列表")
    model: str = Field(..., description="使用的模型")
    retrieved_count: int = Field(default=0, description="检索到的文档数")


class IngestResponse(BaseModel):
    success: bool
    message: str
    count: int = 0


class StatsResponse(BaseModel):
    total_chunks: int
    collection_name: str
    embedding_dim: int
    model: str


# ===== API 接口 =====

@app.get("/")
async def root():
    """健康检查"""
    return {
        "service": "非遗知识库 RAG API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/api/debug")
async def debug_info():
    """调试：查看当前模型配置"""
    if rag_chain is None:
        return {"status": "not initialized"}
    return {
        "model": rag_chain.model,
        "provider": rag_chain.provider,
        "api_base": rag_chain.api_base,
    }

@app.get("/api/health")
async def health_check():
    """服务健康检查"""
    if vector_store is None:
        return JSONResponse(
            status_code=503,
            content={"status": "initializing", "message": "系统正在初始化..."},
        )
    return {
        "status": "healthy",
        "stats": vector_store.get_stats(),
    }


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    """获取知识库统计信息"""
    if vector_store is None:
        raise HTTPException(status_code=503, detail="系统尚未初始化完成")

    stats = vector_store.get_stats()
    return StatsResponse(
        total_chunks=stats["total_chunks"],
        collection_name=stats["collection_name"],
        embedding_dim=stats["embedding_dim"],
        model=rag_chain.model if rag_chain else "unknown",
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    RAG 智能问答接口

    接收用户问题，检索知识库并生成回答
    """
    if rag_chain is None:
        raise HTTPException(status_code=503, detail="系统尚未初始化完成")

    if vector_store.get_stats()["total_chunks"] == 0:
        raise HTTPException(
            status_code=400,
            detail="知识库为空，请先调用 POST /api/ingest 导入文档",
        )

    try:
        result = rag_chain.query(
            question=request.question,
            conversation_history=request.history,
        )
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_documents():
    """
    导入知识库文档

    扫描 data/knowledge_base/ 目录，加载所有支持的文档格式（.docx, .txt），
    进行文本分割、向量化，并存入 ChromaDB。
    """
    if vector_store is None:
        raise HTTPException(status_code=503, detail="系统尚未初始化完成")

    knowledge_dir = os.path.join(os.path.dirname(__file__), "data", "knowledge_base")

    if not os.path.exists(knowledge_dir):
        raise HTTPException(
            status_code=400,
            detail=f"知识库目录不存在: {knowledge_dir}",
        )

    try:
        count = _ingest_documents(knowledge_dir)
        return IngestResponse(
            success=True,
            message=f"成功导入 {count} 条知识记录",
            count=count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@app.post("/api/clear")
async def clear_knowledge_base():
    """清空知识库（谨慎使用）"""
    if vector_store is None:
        raise HTTPException(status_code=503, detail="系统尚未初始化完成")

    vector_store.clear()
    return {"success": True, "message": "知识库已清空"}


# ===== 静态文件服务（必须在所有 API 路由之后注册） =====
html_base_dir = os.path.join(os.path.dirname(__file__), "..", "html_base")
captures_dir = os.path.join(os.path.dirname(__file__), "..", "captures")

# 先挂载子路径
app.mount("/captures", StaticFiles(directory=captures_dir), name="captures")
app.mount("/css", StaticFiles(directory=os.path.join(html_base_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(html_base_dir, "js")), name="js")
app.mount("/images", StaticFiles(directory=os.path.join(html_base_dir, "images")), name="images")
# 最后挂载 / 根路径，html=True 表示自动寻找 index.html
app.mount("/", StaticFiles(directory=html_base_dir, html=True), name="static")

# ===== 启动入口 =====
if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )
