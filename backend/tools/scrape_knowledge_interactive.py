# -*- coding: utf-8 -*-
"""
交互式抓取 Coze 知识库内容
支持手动登录后抓取指定内容
"""
import asyncio
import json
from playwright.async_api import async_playwright
from typing import Dict, Any, List


async def scrape_knowledge_content():
    """
    交互式抓取知识库内容
    """
    async with async_playwright() as p:
        # 启动浏览器（非 headless 模式，便于用户操作）
        browser = await p.chromium.launch(headless=False, slow_mo=500)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()

        # 存储所有的知识库数据
        knowledge_data = {
            'documents': [],
            'api_responses': []
        }

        # 监听 API 响应
        async def handle_response(response):
            if '/api/' in response.url and 'knowledge' in response.url.lower():
                try:
                    content_type = response.headers.get('content-type', '')
                    if 'application/json' in content_type:
                        data = await response.json()
                        knowledge_data['api_responses'].append({
                            'url': response.url,
                            'status': response.status,
                            'data': data
                        })
                        print(f"捕获到知识库 API: {response.url}")
                except Exception as e:
                    print(f"处理 API 响应时出错: {e}")

        page.on('response', handle_response)

        try:
            print("=" * 60)
            print("Coze 知识库抓取工具")
            print("=" * 60)
            print()
            print("步骤说明:")
            print("1. 浏览器将自动打开")
            print("2. 请在浏览器中手动登录 Coze 账号")
            print("3. 导航到知识库页面")
            print("4. 找到'餐单建议'相关的文档")
            print("5. 按 Ctrl+C 或在命令行按回车键开始抓取")
            print()
            print("开始导航到 Coze...")

            # 打开 Coze 首页
            await page.goto('https://www.coze.cn/', wait_until='load')

            print("\n浏览器已打开。请完成以下操作：")
            print("1. 登录账号")
            print("2. 进入知识库页面")
            print("3. 找到'餐单建议'所在的位置")
            print("\n操作完成后，请在此命令行按回车键开始抓取...")

            # 等待用户操作
            input()

            print("\n开始抓取知识库内容...")

            # 获取页面标题
            title = await page.title()
            print(f"当前页面标题: {title}")

            # 尝试多种方式获取知识库内容
            scraped_data = []

            # 方法1: 尝试从页面 DOM 获取
            try:
                print("\n尝试从页面 DOM 获取内容...")
                
                # 等待页面完全加载
                await asyncio.sleep(2)
                
                # 获取所有可能的知识库文档元素
                # 尝试不同的选择器
                selectors = [
                    '[class*="knowledge"]',
                    '[class*="document"]',
                    '[class*="article"]',
                    '[class*="item"]',
                    '[data-testid*="knowledge"]',
                    '[data-testid*="document"]',
                ]
                
                page_content = ""
                for selector in selectors:
                    try:
                        elements = await page.query_selector_all(selector)
                        if elements:
                            print(f"找到 {len(elements)} 个 '{selector}' 元素")
                            for i, element in enumerate(elements[:10]):  # 只取前10个
                                text = await element.inner_text()
                                if len(text) > 10:  # 过滤掉太短的内容
                                    scraped_data.append({
                                        'type': 'dom_element',
                                        'selector': selector,
                                        'index': i,
                                        'content': text
                                    })
                    except:
                        continue
                
                # 获取整个页面的可见文本
                visible_text = await page.inner_text('body')
                scraped_data.append({
                    'type': 'full_page_text',
                    'content': visible_text
                })
                
            except Exception as e:
                print(f"从 DOM 获取内容失败: {e}")

            # 方法2: 执行 JavaScript 获取 React/Vue 等框架渲染的数据
            try:
                print("\n尝试从 JavaScript 对象获取数据...")
                
                # 尝试获取常见的存储对象
                js_commands = [
                    "() => typeof window.__NEXT_DATA__ !== 'undefined' ? window.__NEXT_DATA__ : null",
                    "() => typeof window.__NUXT__ !== 'undefined' ? window.__NUXT__ : null",
                    "() => typeof window.__INITIAL_STATE__ !== 'undefined' ? window.__INITIAL_STATE__ : null",
                    "() => { try { return JSON.stringify(window.store) } catch { return null } }",
                    "() => { try { return JSON.stringify(window.__store__) } catch { return null } }",
                    "() => { try { return JSON.stringify(window._SSR_HYDRATED_DATA) } catch { return null } }",
                ]
                
                for cmd in js_commands:
                    try:
                        result = await page.evaluate(cmd)
                        if result and result != 'null' and result != 'undefined':
                            print(f"成功获取到数据，长度: {len(str(result))}")
                            scraped_data.append({
                                'type': 'javascript_data',
                                'command': cmd,
                                'data': result if len(str(result)) < 50000 else str(result)[:50000] + '...[truncated]'
                            })
                    except Exception as e:
                        pass
                
                # 获取 localStorage
                try:
                    ls_data = await page.evaluate("() => JSON.stringify(window.localStorage)")
                    scraped_data.append({
                        'type': 'localStorage',
                        'data': ls_data
                    })
                    print(f"获取到 localStorage，长度: {len(ls_data)}")
                except:
                    pass
                
                # 获取 sessionStorage
                try:
                    ss_data = await page.evaluate("() => JSON.stringify(window.sessionStorage)")
                    scraped_data.append({
                        'type': 'sessionStorage',
                        'data': ss_data
                    })
                    print(f"获取到 sessionStorage，长度: {len(ss_data)}")
                except:
                    pass
                    
            except Exception as e:
                print(f"从 JavaScript 获取数据失败: {e}")

            # 方法3: 获取完整的 HTML
            try:
                print("\n获取完整 HTML...")
                html_content = await page.content()
                scraped_data.append({
                    'type': 'html_content',
                    'data': html_content
                })
                print(f"HTML 长度: {len(html_content)}")
            except Exception as e:
                print(f"获取 HTML 失败: {e}")

            # 保存所有抓取的数据
            knowledge_data['scraped_content'] = scraped_data
            knowledge_data['page_title'] = title
            knowledge_data['url'] = page.url

            # 保存到文件
            output_file = "C:/test/antinet/data/knowledge/scraped_content.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(knowledge_data, f, ensure_ascii=False, indent=2)

            print(f"\n" + "=" * 60)
            print("抓取完成！")
            print("=" * 60)
            print(f"数据已保存到: {output_file}")
            print(f"页面标题: {title}")
            print(f"页面 URL: {page.url}")
            print(f"抓取到的内容项数: {len(scraped_data)}")
            print(f"API 响应数: {len(knowledge_data['api_responses'])}")

            # 显示内容摘要
            if scraped_data:
                print("\n抓取的内容类型:")
                content_types = {}
                for item in scraped_data:
                    content_type = item.get('type', 'unknown')
                    content_types[content_type] = content_types.get(content_type, 0) + 1
                for content_type, count in content_types.items():
                    print(f"  - {content_type}: {count} 项")

            print("\n浏览器将保持打开，您可以手动查看页面...")
            print("按回车键关闭浏览器...")
            input()

        except KeyboardInterrupt:
            print("\n用户中断操作")
        except Exception as e:
            print(f"\n发生错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(scrape_knowledge_content())
