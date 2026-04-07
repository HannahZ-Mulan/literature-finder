#!/usr/bin/env python3
"""
PDF分页提取脚本
使用PyPDF2提取每页文本，支持并行处理
"""

import sys
import json
import time
from typing import List, Dict, Any

try:
    import PyPDF2
except ImportError:
    print("Installing PyPDF2...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
    import PyPDF2


def extract_pdf_pages(file_path: str, batch_size: int = 6) -> Dict[str, Any]:
    """
    提取PDF的所有页面

    Args:
        file_path: PDF文件路径
        batch_size: 批处理大小（用于并行处理）

    Returns:
        包含每页提取结果的字典
    """
    start_time = time.time()
    pages = []

    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)

            print(f"Extracting {total_pages} pages...", file=sys.stderr)

            for page_num in range(total_pages):
                try:
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()

                    pages.append({
                        "pageNumber": page_num + 1,
                        "text": text,
                        "success": bool(text and text.strip()),
                        "method": "PyPDF2"
                    })

                    # 显示进度
                    if (page_num + 1) % 10 == 0:
                        print(f"Extracted {page_num + 1}/{total_pages} pages", file=sys.stderr)

                except Exception as e:
                    pages.append({
                        "pageNumber": page_num + 1,
                        "text": "",
                        "success": False,
                        "error": str(e),
                        "method": "PyPDF2"
                    })

        duration = time.time() - start_time

        return {
            "pages": pages,
            "totalPages": total_pages,
            "method": "PyPDF2",
            "duration": duration * 1000  # 转换为毫秒
        }

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return {
            "pages": [],
            "totalPages": 0,
            "method": "PyPDF2",
            "error": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract-pdf-pages.py <pdf_file> [batch_size]", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 6

    result = extract_pdf_pages(pdf_path, batch_size)
    print(json.dumps(result, ensure_ascii=False))
