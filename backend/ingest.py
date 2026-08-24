"""
知识库文档导入脚本
将 docx 文档复制到后端 data/knowledge_base/ 目录

用法: python ingest.py
或: python ingest.py --source "d:\A计划-非遗文化\中国非遗智能体档案.docx"
"""

import os
import sys
import shutil
import argparse


def main():
    parser = argparse.ArgumentParser(description="非遗知识库文档导入工具")
    parser.add_argument(
        "--source",
        type=str,
        default=None,
        help="源文档路径（默认自动搜索项目根目录的 .docx 文件）",
    )
    parser.add_argument(
        "--target-dir",
        type=str,
        default=None,
        help="目标目录（默认 backend/data/knowledge_base/）",
    )
    args = parser.parse_args()

    # 确定目标目录
    if args.target_dir:
        target_dir = args.target_dir
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        target_dir = os.path.join(script_dir, "data", "knowledge_base")

    os.makedirs(target_dir, exist_ok=True)

    # 确定源文档
    if args.source:
        sources = [args.source]
    else:
        # 自动搜索项目根目录
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sources = []
        for f in os.listdir(project_root):
            if f.endswith(".docx") and not f.startswith("~$"):
                sources.append(os.path.join(project_root, f))
        # 也搜索项目思路文件
       思路_path = os.path.join(project_root, "项目思路")
        if os.path.exists(思路_path):
            sources.append(思路_path)

    if not sources:
        print("❌ 未找到任何文档，请用 --source 指定文档路径")
        sys.exit(1)

    print(f"📂 目标目录: {target_dir}")
    print(f"📄 找到 {len(sources)} 个源文件:\n")

    copied = 0
    for src in sources:
        if not os.path.exists(src):
            print(f"  ⚠️  跳过（不存在）: {src}")
            continue

        filename = os.path.basename(src)
        dst = os.path.join(target_dir, filename)

        # 如果是 .txt 之外的文件，转为 .txt（方便后续处理）
        if not filename.endswith(".txt"):
            # docx 文件直接复制，由 document_loader 处理
            pass

        try:
            shutil.copy2(src, dst)
            size = os.path.getsize(dst)
            print(f"  ✓ {filename} ({size:,} bytes)")
            copied += 1
        except Exception as e:
            print(f"  ✗ {filename}: {e}")

    print(f"\n✅ 已复制 {copied} 个文件到知识库目录")
    print(f"💡 现在可以启动后端服务: cd backend && python main.py")


if __name__ == "__main__":
    main()
