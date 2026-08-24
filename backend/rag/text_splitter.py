"""
文本分割器 - 将长篇文档智能切割为适合检索的语义块
"""

import re
from typing import List, Dict


def split_by_sections(text: str) -> List[str]:
    """
    按非遗档案的结构化标题进行分割
    识别模式：【xxx】、一、二、...、01：、02：等
    """
    # 构建分割正则：匹配标题行
    title_re = re.compile(
        r"(?:(?:^|\n)(?:[一二三四五六七八九十]+)[、，.]|"  # 中文序号标题
        r"(?:^|\n)\d{2}[：:]|"  # 01：格式
        r"(?:^|\n)【[^】]+】)"  # 【xxx】格式
    )

    # 找到所有标题位置
    matches = list(title_re.finditer(text))
    if not matches:
        return [text]

    chunks = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        # 修正 start：如果前面是换行符，从换行符开始
        if start > 0 and text[start - 1] == "\n":
            start = start
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

    # 如果第一个标题前有内容，加到第一个 chunk 前面
    if matches and matches[0].start() > 0:
        preamble = text[:matches[0].start()].strip()
        if preamble:
            chunks.insert(0, preamble)

    return chunks if chunks else [text]


def split_by_paragraphs(text: str, max_chunk_size: int = 1000) -> List[str]:
    """
    按段落分割，合并短段落直到接近 max_chunk_size
    """
    paragraphs = text.split("\n")
    chunks = []
    current_chunk = ""
    current_size = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        para_size = len(para)

        if current_size + para_size > max_chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = para
            current_size = para_size
        else:
            current_chunk += "\n" + para if current_chunk else para
            current_size += para_size

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def create_chunks(
    document: Dict[str, str],
    chunk_size: int = 800,
    chunk_overlap: int = 100,
) -> List[Dict[str, str]]:
    """
    为单篇文档创建文本块

    Args:
        document: {"filename": "...", "text": "...", "source": "..."}
        chunk_size: 每个块的目标字符数
        chunk_overlap: 相邻块的重叠字符数

    Returns:
        List[Dict]: 带元数据的文本块列表
    """
    text = document["text"]
    filename = document["filename"]
    source = document["source"]

    # 第一步：按结构化标题粗分割
    section_chunks = split_by_sections(text)

    # 第二步：对过长的段进一步切分
    final_chunks = []
    for section in section_chunks:
        if len(section) <= chunk_size:
            final_chunks.append(section)
        else:
            sub_chunks = split_by_paragraphs(section, max_chunk_size=chunk_size)
            final_chunks.extend(sub_chunks)

    # 第二步半：合并过小的块（< 50字）到相邻块，避免标题与内容分离
    merged_chunks = []
    i = 0
    while i < len(final_chunks):
        chunk = final_chunks[i]
        if len(chunk) < 50 and i + 1 < len(final_chunks):
            # 小标题块：和下一个块合并
            merged = chunk + "\n" + final_chunks[i + 1]
            merged_chunks.append(merged)
            i += 2
        else:
            merged_chunks.append(chunk)
            i += 1

    # 第三步：创建重叠窗口（对于较长的块）
    overlapped_chunks = []
    for i, chunk in enumerate(merged_chunks):
        # 添加前一个块的尾部和后一个块的头部作为上下文
        if i > 0 and chunk_overlap > 0:
            prev_tail = merged_chunks[i - 1][-chunk_overlap:]
            if not chunk.startswith(prev_tail):
                chunk = prev_tail + "\n" + chunk

        # 生成唯一 ID
        chunk_id = f"{filename.replace('.docx', '').replace('.txt', '')}_chunk_{i}"

        overlapped_chunks.append(
            {
                "chunk_id": chunk_id,
                "text": chunk,
                "filename": filename,
                "source": source,
                "chunk_index": i,
                "char_count": len(chunk),
            }
        )

    return overlapped_chunks


def chunk_documents(
    documents: List[Dict[str, str]],
    chunk_size: int = 800,
    chunk_overlap: int = 100,
) -> List[Dict[str, str]]:
    """
    对所有文档进行分割

    Returns:
        List[Dict]: 所有文本块，每个包含 chunk_id, text, filename, source 等字段
    """
    all_chunks = []
    for doc in documents:
        chunks = create_chunks(doc, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        all_chunks.extend(chunks)
        print(f"  📄 {doc['filename']}: {len(chunks)} 个文本块")

    print(f"\n总计 {len(all_chunks)} 个文本块")
    return all_chunks


if __name__ == "__main__":
    from document_loader import load_documents

    docs = load_documents("./data/knowledge_base")
    chunks = chunk_documents(docs)
    for c in chunks[:5]:
        print(f"\n--- {c['chunk_id']} ({c['char_count']} 字符) ---")
        print(c["text"][:300])
