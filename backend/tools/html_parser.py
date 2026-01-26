"""
HTML 知识解析器
解析 HTML 文件并提取文本内容，用于知识库导入
"""
from bs4 import BeautifulSoup
from pathlib import Path
from typing import List, Dict, Any
import json
import re


class HTMLKnowledgeParser:
    """HTML 知识解析器"""

    def __init__(self):
        self.extracted_data = []

    def parse_html_file(self, html_file: str) -> Dict[str, Any]:
        """
        解析单个 HTML 文件

        Args:
            html_file: HTML 文件路径

        Returns:
            解析结果字典
        """
        try:
            with open(html_file, 'r', encoding='gb2312') as f:
                html_content = f.read()

            soup = BeautifulSoup(html_content, 'html.parser')

            # 提取标题
            title = soup.title.string if soup.title else "未知标题"

            # 提取所有链接和文本
            links = []
            for a in soup.find_all('a'):
                href = a.get('href', '')
                text = a.get_text(strip=True)
                if text and len(text) > 5:  # 过滤太短的文本
                    links.append({
                        'href': href,
                        'text': text
                    })

            # 提取页面主要文本
            main_div = soup.find('div', {'id': 'main'})
            if main_div:
                main_text = main_div.get_text(separator='\n', strip=True)
            else:
                main_text = soup.get_text(separator='\n', strip=True)

            # 按行分割并过滤空行
            lines = [line.strip() for line in main_text.split('\n') if line.strip()]
            
            # 识别新闻条目（包含日期的模式）
            news_items = []
            date_pattern = r'\d{1,2}-\d{1,2}'
            for line in lines:
                if re.match(date_pattern, line):
                    news_items.append(line)

            return {
                'file_path': html_file,
                'title': title,
                'total_links': len(links),
                'links': links[:50],  # 限制链接数量
                'news_items': news_items,
                'text_length': len(main_text)
            }

        except Exception as e:
            return {
                'file_path': html_file,
                'error': str(e)
            }

    def parse_directory(self, html_dir: str) -> List[Dict[str, Any]]:
        """
        解析目录下的所有 HTML 文件

        Args:
            html_dir: HTML 文件目录

        Returns:
            所有文件的解析结果列表
        """
        html_dir_path = Path(html_dir)
        results = []

        for html_file in html_dir_path.glob('*.htm'):
            result = self.parse_html_file(str(html_file))
            results.append(result)

        return results

    def export_to_json(self, results: List[Dict[str, Any]], output_file: str):
        """
        将解析结果导出为 JSON 文件

        Args:
            results: 解析结果列表
            output_file: 输出 JSON 文件路径
        """
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    def extract_knowledge_cards(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        从解析结果中提取知识卡片

        Args:
            results: 解析结果列表

        Returns:
            知识卡片列表
        """
        cards = []

        for result in results:
            if 'error' in result:
                continue

            for link in result.get('links', []):
                # 创建蓝色卡片（事实卡片）
                cards.append({
                    'type': 'blue',
                    'title': link['text'][:50],
                    'content': link['text'],
                    'source': result['file_path'],
                    'url': link['href'],
                    'category': '财经资讯'
                })

        return cards


def main():
    """测试主函数"""
    parser = HTMLKnowledgeParser()

    # 解析 HTML 文件
    html_dir = "C:/test/antinet/data/html"
    results = parser.parse_directory(html_dir)

    print(f"\n解析了 {len(results)} 个 HTML 文件")

    # 显示解析结果
    for result in results:
        if 'error' in result:
            print(f" {result['file_path']}: {result['error']}")
        else:
            print(f"{result['file_path']}")
            print(f"   标题: {result['title']}")
            print(f"   链接数: {result['total_links']}")
            print(f"   文本长度: {result['text_length']}")

    # 导出 JSON
    output_file = "C:/test/antinet/data/knowledge/parsed_knowledge.json"
    parser.export_to_json(results, output_file)
    print(f"\n结果已导出到: {output_file}")

    # 提取知识卡片
    cards = parser.extract_knowledge_cards(results)
    print(f"\n提取了 {len(cards)} 张知识卡片")

    # 保存卡片
    cards_file = "C:/test/antinet/data/knowledge/knowledge_cards.json"
    with open(cards_file, 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"卡片已保存到: {cards_file}")


if __name__ == "__main__":
    main()
