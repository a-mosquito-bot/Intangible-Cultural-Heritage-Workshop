"""
文档加载器 - 支持 .docx, .txt, .md 等多种格式
从知识库目录加载非遗文档并解析为纯文本
"""

import os
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Optional


def extract_docx_text(filepath: str) -> str:
    """从 .docx 文件提取纯文本"""
    try:
        with zipfile.ZipFile(filepath) as z:
            xml_content = z.read("word/document.xml")
        tree = ET.fromstring(xml_content)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

        paragraphs = []
        for p in tree.iter(
            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"
        ):
            texts = []
            for t in p.iter(
                "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"
            ):
                if t.text:
                    texts.append(t.text)
            if texts:
                line = "".join(texts)
                # 跳过空行和纯空格行
                if line.strip():
                    paragraphs.append(line)
        return "\n".join(paragraphs)
    except Exception as e:
        raise RuntimeError(f"无法解析 docx 文件 {filepath}: {e}")


def extract_txt_text(filepath: str) -> str:
    """读取纯文本文件"""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def clean_text(text: str) -> str:
    """清理文本：去除多余空行、统一格式"""
    # 合并多个连续空行为单个空行
    text = re.sub(r"\n{3,}", "\n\n", text)
    # 去除首尾空白
    text = text.strip()
    return text


def load_documents(knowledge_dir: str) -> List[Dict[str, str]]:
    """
    加载知识库目录中的所有文档

    Args:
        knowledge_dir: 知识库文档目录路径

    Returns:
        List[Dict]: [{"filename": "xxx.docx", "text": "...", "source": "完整路径"}]
    """
    documents = []
    supported_formats = {".docx": extract_docx_text, ".txt": extract_txt_text}

    knowledge_path = Path(knowledge_dir)
    if not knowledge_path.exists():
        raise FileNotFoundError(f"知识库目录不存在: {knowledge_dir}")

    for file_path in knowledge_path.iterdir():
        if file_path.is_file() and not file_path.name.startswith("~"):
            ext = file_path.suffix.lower()
            if ext in supported_formats:
                try:
                    text = supported_formats[ext](str(file_path))
                    text = clean_text(text)
                    if text:
                        documents.append(
                            {
                                "filename": file_path.name,
                                "text": text,
                                "source": str(file_path.absolute()),
                            }
                        )
                        print(f"  ✓ 已加载: {file_path.name} ({len(text)} 字符)")
                except Exception as e:
                    print(f"  ✗ 加载失败 {file_path.name}: {e}")

    print(f"\n共加载 {len(documents)} 篇文档")
    return documents


if __name__ == "__main__":
    import sys

    docs = load_documents(sys.argv[1] if len(sys.argv) > 1 else "./data/knowledge_base")
    for d in docs:
        print(f"\n{'='*60}")
        print(f"文件: {d['filename']}")
        print(f"长度: {len(d['text'])} 字符")
        print(f"预览: {d['text'][:200]}...")
