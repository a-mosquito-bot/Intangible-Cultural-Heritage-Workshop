"""
RAG 检索生成链 - 检索 + LLM 生成 + 来源追溯
支持 DeepSeek API (OpenAI 兼容) 和 Claude API (Anthropic SDK)
"""

import os
from typing import List, Dict, Optional

from openai import OpenAI
from .vector_store import VectorStore


# RAG 系统提示词
SYSTEM_PROMPT = """你是一个非遗（非物质文化遗产）知识助手，名叫"非遗智答"。你基于平台专属的非遗数据库回答问题，知识范围涵盖中国传统工业技艺和手工艺非遗项目。

## 你的能力
- 回答关于非遗技艺的历史、工艺、文化价值、传承现状等问题
- 提供有据可查的非遗知识，杜绝编造
- 推荐非遗研学体验项目

## 回答规则
1. **严格基于提供的参考资料回答**，必须仔细阅读并充分利用参考资料中的内容
2. **优先输出参考资料中已有的信息**，即使参考资料只提供了部分信息，也要把你找到的相关内容全部组织好输出
3. 如果参考资料足以部分回答问题但缺乏某些细节，就先输出已有的内容，再说明哪些细节暂缺
4. 如果参考资料完全不足以回答用户问题，诚实说明并建议查阅其他渠道
5. 使用自然、友好的语气，但保持专业准确
6. 回答中引用具体信息时，在正文中注明来源于哪项非遗项目（如"据端砚制作技艺记载…"），但不要在末尾单独列出"参考来源"板块——前端已自动展示来源标签
7. 用中文回答

## 重要知识映射
- "广东手工非遗"、"广东工业非遗" → 对应知识库中的**端砚制作技艺（广东）**
- "打铁"、"锻造" → 知识库中归类为传统锻造/打铁工艺，归属于平台工业非遗范畴
- "制陶"、"手工制陶" → 可参考知识库中的**景德镇手工制瓷技艺**内容
- "竹编"、"竹编工需" → 对应知识库中的**竹编（安溪竹藤编）**内容
- 错别字自动纠正：如"景得镇"→"景德镇"、"磁器"→"瓷器"、"工需"→"工艺"
- 模糊提问时，优先匹配地区+技艺类非遗项目

## 当前知识库范围
数据库包含以下非遗项目的详细资料：
- 京剧（北京）
- 剪纸/蔚县剪纸（河北）
- 皮艺/蒙古族皮艺（内蒙古）
- 扬州漆器髹饰技艺（江苏）
- 东阳木雕（浙江）
- 宣纸制作技艺（安徽）
- 竹编/安溪竹藤编（福建）
- 景德镇手工制瓷技艺（江西）
- 蓝印花布印染技艺（湖南）
- 端砚制作技艺（广东）
"""


class RAGChain:
    """RAG 检索增强生成链（支持 DeepSeek / Claude 切换）"""

    # 支持的 provider 配置
    PROVIDERS = {
        "deepseek": {
            "base_url": "https://api.deepseek.com",
            "default_model": "deepseek-v4-pro",
            "env_key": "DEEPSEEK_API_KEY",
        },
        "claude": {
            "base_url": "https://api.anthropic.com",
            "default_model": "claude-sonnet-5-20250915",
            "env_key": "ANTHROPIC_API_KEY",
        },
        # 兼容任意 OpenAI 兼容接口（如本地 Ollama、vLLM 等）
        "openai_compatible": {
            "base_url": "https://api.openai.com/v1",
            "default_model": "gpt-4o",
            "env_key": "OPENAI_API_KEY",
        },
    }

    def __init__(
        self,
        vector_store: VectorStore,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        max_retrieved: int = 5,
    ):
        """
        Args:
            vector_store: 向量存储实例
            api_key: API Key（默认从环境变量读取）
            api_base: API 地址（默认根据 provider 自动选择）
            model: 模型 ID（默认根据 provider 自动选择）
            provider: 提供商类型 (deepseek | claude | openai_compatible)
            max_retrieved: 检索返回的最大文档数
        """
        self.vector_store = vector_store
        self.max_retrieved = max_retrieved

        # ---- 确定 provider ----
        self.provider = provider or os.getenv("LLM_PROVIDER", "deepseek")

        if self.provider not in self.PROVIDERS:
            # 自定义 provider：从环境变量读取配置
            self.provider_config = {
                "base_url": api_base or os.getenv("LLM_BASE_URL", "https://api.deepseek.com"),
                "default_model": model or os.getenv("LLM_MODEL", "deepseek-v4-pro"),
                "env_key": "LLM_API_KEY",
            }
        else:
            self.provider_config = self.PROVIDERS[self.provider]

        # ---- 获取 API Key ----
        env_key_name = self.provider_config["env_key"]
        self.api_key = api_key or os.getenv(env_key_name) or os.getenv("LLM_API_KEY")

        if not self.api_key:
            raise ValueError(
                f"未找到 API Key！请设置以下任一环境变量：\n"
                f"  - {env_key_name}\n"
                f"  - LLM_API_KEY\n"
                f"或在 backend/.env 文件中配置"
            )

        # ---- 确定模型 ----
        self.model = model or os.getenv("LLM_MODEL") or self.provider_config["default_model"]

        # ---- 确定 API 地址 ----
        self.api_base = api_base or os.getenv("LLM_BASE_URL") or self.provider_config["base_url"]

        # ---- 初始化 OpenAI 兼容客户端 ----
        # DeepSeek 和大多数国产模型都兼容 OpenAI SDK
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.api_base,
        )

        print(f"  LLM Provider: {self.provider}")
        print(f"  API Base: {self.api_base}")
        print(f"  Model: {self.model}")

    def retrieve(self, query: str) -> List[Dict]:
        """检索相关文档（含地区关键词增强）"""
        results = self.vector_store.query(query, n_results=self.max_retrieved)

        # 地区关键词增强：如果查询包含省份名，额外检索该省份内容并合并
        provinces = [
            "广东", "福建", "浙江", "江苏", "安徽", "江西", "湖南",
            "河北", "北京", "内蒙古", "湖北", "四川", "贵州", "云南",
            "陕西", "甘肃", "河南", "山东", "山西", "辽宁", "吉林",
            "黑龙江", "海南", "青海", "台湾", "广西", "西藏", "宁夏", "新疆",
        ]
        found_provinces = [p for p in provinces if p in query]
        if found_provinces:
            for p in found_provinces[:2]:  # 最多增强2个省份
                extra = self.vector_store.query(p, n_results=3)
                for doc in extra:
                    if doc["chunk_id"] not in {r["chunk_id"] for r in results}:
                        results.append(doc)

        # 按 score 排序，取 top N
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[: self.max_retrieved]

    def _build_messages(
        self, query: str, retrieved_docs: List[Dict],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        """构建发送给 LLM 的消息列表（OpenAI 兼容格式）"""
        # 构建参考资料文本
        if retrieved_docs:
            context_parts = []
            for i, doc in enumerate(retrieved_docs, 1):
                source_name = doc["filename"].replace(".docx", "").replace(".txt", "")
                context_parts.append(
                    f"[参考{i}] 来源: {source_name} (相关度: {doc['score']:.2f})\n{doc['text']}"
                )
            context_text = "\n\n---\n\n".join(context_parts)
        else:
            context_text = "（未找到相关参考资料）"

        user_message = f"""## 参考资料
{context_text}

## 用户问题
{query}

请基于以上参考资料回答用户问题。如果参考资料不足，请诚实说明。"""

        # 构建完整消息列表
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if conversation_history:
            # 只保留最近几轮，避免超出上下文
            recent = conversation_history[-8:]
            messages.extend(recent)

        messages.append({"role": "user", "content": user_message})

        return messages

    def query(
        self,
        question: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict:
        """
        执行 RAG 查询：检索 + 生成

        Args:
            question: 用户问题
            conversation_history: 可选的历史对话

        Returns:
            {
                "answer": "生成的回答",
                "sources": [...],
                "model": "使用的模型",
            }
        """
        # Step 1: 检索
        retrieved_docs = self.retrieve(question)
        print(f"  检索到 {len(retrieved_docs)} 篇相关文档")

        # Step 2: 构建消息
        messages = self._build_messages(question, retrieved_docs, conversation_history)

        # Step 3: 调用 LLM API（直接 HTTP 请求）
        import json as _json, urllib.request as _ur
        payload = {
            "model": "deepseek-v4-pro",
            "messages": messages,
            "max_tokens": 2000,
            "temperature": 0.3,
            "stream": False,
        }
        print(f"  [DEBUG] 发送 model: {payload['model']}")
        data = _json.dumps(payload).encode("utf-8")
        req = _ur.Request(
            f"{self.api_base}/v1/chat/completions",
            data=data,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with _ur.urlopen(req, timeout=60) as resp:
                body = _json.loads(resp.read().decode("utf-8"))
                answer = body["choices"][0]["message"]["content"]
        except _ur.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            raise Exception(f"Error code: {e.code} - {err_body}")

        # Step 4: 格式化来源（排除项目方案类文档，仅展示非遗技艺档案）
        EXCLUDE_SOURCE_FILES = {"项目思路.txt", "非遗项目方案思路.docx"}
        sources = [
            {
                "filename": doc["filename"],
                "chunk_id": doc["chunk_id"],
                "text_preview": doc["text"][:200] + "..." if len(doc["text"]) > 200 else doc["text"],
                "score": doc["score"],
            }
            for doc in retrieved_docs
            if doc["score"] > 0.10 and doc["filename"] not in EXCLUDE_SOURCE_FILES
        ]

        return {
            "answer": answer,
            "sources": sources,
            "model": self.model,
            "retrieved_count": len(retrieved_docs),
        }


if __name__ == "__main__":
    from document_loader import load_documents
    from text_splitter import chunk_documents

    docs = load_documents("./data/knowledge_base")
    chunks = chunk_documents(docs)
    store = VectorStore(persist_dir="./vector_db")
    store.add_chunks(chunks)

    chain = RAGChain(store)

    for q in ["竹编工艺最难的步骤是什么？", "广东有哪些传统手工非遗？"]:
        print(f"\n{'='*60}")
        print(f"❓ {q}")
        result = chain.query(q)
        print(f"\n🤖 回答:\n{result['answer']}")
        print(f"\n📚 来源 ({len(result['sources'])}):")
        for s in result["sources"]:
            print(f"  - [{s['score']:.2f}] {s['filename']}")
