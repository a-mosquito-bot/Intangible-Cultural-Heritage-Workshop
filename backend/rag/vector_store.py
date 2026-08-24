"""
向量嵌入与存储 - 使用 sklearn TF-IDF + FAISS
轻量级方案：中文友好、无需 GPU、无需下载大模型
"""

import os
import pickle
import re
from typing import List, Dict, Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import faiss


class VectorStore:
    """TF-IDF + FAISS 向量存储封装"""

    def __init__(
        self,
        collection_name: str = "ich_knowledge",
        persist_dir: str = "./vector_db",
    ):
        """
        初始化向量存储

        Args:
            collection_name: 集合名称
            persist_dir: 持久化目录
        """
        self.collection_name = collection_name
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)

        # TF-IDF 向量化器（针对中文优化）
        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb",   # 字符级 n-gram，适合中文
            ngram_range=(2, 4),   # 2-4 字组合
            max_features=5000,    # 最多 5000 个特征
            max_df=0.9,           # 忽略出现频率 > 90% 的词
            min_df=1,             # 最少出现 1 次
            sublinear_tf=True,    # 使用 1 + log(tf)
        )

        # FAISS 索引
        self.index = None
        self.dimension = None

        # 存储文本和元数据（用于检索时返回）
        self.documents: List[str] = []
        self.metadatas: List[Dict] = []
        self.chunk_ids: List[str] = []

        # 尝试加载已有数据
        self._load()

        count = len(self.documents)
        if count > 0:
            print(f"  向量库 '{collection_name}': {count} 条记录 (维度: {self.dimension})")

    def _get_save_paths(self):
        """获取持久化文件路径"""
        base = os.path.join(self.persist_dir, self.collection_name)
        return {
            "vectorizer": base + "_vectorizer.pkl",
            "index": base + "_index.faiss",
            "documents": base + "_documents.pkl",
            "metadatas": base + "_metadatas.pkl",
            "chunk_ids": base + "_chunk_ids.pkl",
        }

    def _save(self):
        """持久化所有数据"""
        paths = self._get_save_paths()

        # 保存 TF-IDF vectorizer
        with open(paths["vectorizer"], "wb") as f:
            pickle.dump(self.vectorizer, f)

        # 保存 FAISS 索引
        if self.index is not None:
            faiss.write_index(self.index, paths["index"])

        # 保存元数据
        with open(paths["documents"], "wb") as f:
            pickle.dump(self.documents, f)
        with open(paths["metadatas"], "wb") as f:
            pickle.dump(self.metadatas, f)
        with open(paths["chunk_ids"], "wb") as f:
            pickle.dump(self.chunk_ids, f)

    def _load(self):
        """从磁盘加载数据"""
        paths = self._get_save_paths()

        if not os.path.exists(paths["vectorizer"]):
            return

        try:
            with open(paths["vectorizer"], "rb") as f:
                self.vectorizer = pickle.load(f)

            if os.path.exists(paths["index"]):
                self.index = faiss.read_index(paths["index"])
                self.dimension = self.index.d

            if os.path.exists(paths["documents"]):
                with open(paths["documents"], "rb") as f:
                    self.documents = pickle.load(f)
            if os.path.exists(paths["metadatas"]):
                with open(paths["metadatas"], "rb") as f:
                    self.metadatas = pickle.load(f)
            if os.path.exists(paths["chunk_ids"]):
                with open(paths["chunk_ids"], "rb") as f:
                    self.chunk_ids = pickle.load(f)

        except Exception as e:
            print(f"  加载数据失败: {e}，将重新初始化")
            self.documents = []
            self.metadatas = []
            self.chunk_ids = []

    def add_chunks(self, chunks: List[Dict[str, str]]) -> int:
        """
        批量添加文本块到向量库

        Args:
            chunks: 文本块列表，每个包含 chunk_id, text, filename, source 等

        Returns:
            添加的记录数
        """
        if not chunks:
            return 0

        new_texts = [c["text"] for c in chunks]
        new_ids = [c["chunk_id"] for c in chunks]
        new_metadatas = [
            {
                "filename": c.get("filename", ""),
                "source": c.get("source", ""),
                "chunk_index": c.get("chunk_index", 0),
                "char_count": c.get("char_count", 0),
            }
            for c in chunks
        ]

        # 去重检查
        existing_ids = set(self.chunk_ids)
        filtered = [
            (id_, text, meta)
            for id_, text, meta in zip(new_ids, new_texts, new_metadatas)
            if id_ not in existing_ids
        ]

        if not filtered:
            print("  所有数据已存在，跳过")
            return 0

        new_ids_f, new_texts_f, new_metadatas_f = zip(*filtered)
        new_ids_f = list(new_ids_f)
        new_texts_f = list(new_texts_f)
        new_metadatas_f = list(new_metadatas_f)

        print(f"  正在构建 TF-IDF 向量 ({len(new_texts_f)} 条) ...")

        # 合并已有和新文本，重新训练 vectorizer
        all_texts = self.documents + new_texts_f
        tfidf_matrix = self.vectorizer.fit_transform(all_texts)
        self.dimension = tfidf_matrix.shape[1]
        embeddings = tfidf_matrix.toarray().astype(np.float32)

        print(f"  TF-IDF 维度: {self.dimension}")

        # 构建 FAISS 索引（内积 = 余弦相似度，因为向量已 L2 归一化）
        # 先做 L2 归一化
        faiss.normalize_L2(embeddings)

        self.index = faiss.IndexFlatIP(self.dimension)  # Inner Product
        self.index.add(embeddings)

        # 更新元数据
        self.documents.extend(new_texts_f)
        self.metadatas.extend(new_metadatas_f)
        self.chunk_ids.extend(new_ids_f)

        # 持久化
        self._save()

        print(f"  ✓ 已添加 {len(new_ids_f)} 条记录（总计 {len(self.documents)} 条）")
        return len(new_ids_f)

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        filter_filename: Optional[str] = None,
    ) -> List[Dict]:
        """
        查询最相关的文本块

        Args:
            query_text: 查询文本
            n_results: 返回结果数
            filter_filename: 可选，按文件名过滤

        Returns:
            [{"chunk_id": "...", "text": "...", "filename": "...", "score": 0.95}, ...]
        """
        if self.index is None or len(self.documents) == 0:
            return []

        # 将查询文本转为向量
        query_vec = self.vectorizer.transform([query_text]).toarray().astype(np.float32)
        faiss.normalize_L2(query_vec)

        # 搜索
        n = min(n_results * 3 if filter_filename else n_results, len(self.documents))
        scores, indices = self.index.search(query_vec, n)

        # 格式化结果
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.documents):
                continue
            if score < 0.01:  # 过滤过低的相似度
                continue

            doc = {
                "chunk_id": self.chunk_ids[idx],
                "text": self.documents[idx],
                "filename": self.metadatas[idx].get("filename", ""),
                "source": self.metadatas[idx].get("source", ""),
                "score": round(float(score), 4),
            }

            # 可选的文件名过滤
            if filter_filename and doc["filename"] != filter_filename:
                continue

            results.append(doc)

            if len(results) >= n_results:
                break

        return results

    def get_stats(self) -> Dict:
        """获取向量库统计信息"""
        return {
            "collection_name": self.collection_name,
            "total_chunks": len(self.documents),
            "embedding_dim": self.dimension or 0,
            "persist_dir": self.persist_dir,
        }

    def clear(self):
        """清空向量库"""
        self.documents = []
        self.metadatas = []
        self.chunk_ids = []
        self.index = None
        self.dimension = None
        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            max_features=5000,
            max_df=0.9,
            min_df=1,
            sublinear_tf=True,
        )

        # 删除持久化文件
        for path in self._get_save_paths().values():
            if os.path.exists(path):
                os.remove(path)

        print(f"  向量库 '{self.collection_name}' 已清空")


if __name__ == "__main__":
    from document_loader import load_documents
    from text_splitter import chunk_documents

    # 测试完整流程
    docs = load_documents("./data/knowledge_base")
    chunks = chunk_documents(docs)

    store = VectorStore(persist_dir="./vector_db")
    count = store.add_chunks(chunks)
    print(f"\n入库完成: {count} 条")

    # 测试查询
    tests = [
        "竹编工艺最难的步骤是什么？",
        "广东有哪些传统手工非遗？",
        "京剧的唱腔有什么特点？",
        "景德镇瓷器怎么制作的？",
    ]
    for q in tests:
        print(f"\n{'='*60}")
        print(f"🔍 查询: {q}")
        results = store.query(q, n_results=3)
        for i, r in enumerate(results):
            print(f"  [{i+1}] score={r['score']:.4f} | {r['filename']}")
            print(f"      {r['text'][:120]}...")
