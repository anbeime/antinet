#!/usr/bin/env python3
# test_codebuddy_integration.py - 测试 CodeBuddy SDK 集成
"""
测试 CodeBuddy SDK 集成和后端 API
"""

import asyncio
import sys

# 测试 1: 验证 SDK 安装
try:
    from codebuddy_agent_sdk import query, CodeBuddyAgentOptions
    print("CodeBuddy SDK 安装成功")
except ImportError as e:
    print(f"❌ CodeBuddy SDK 安装失败: {e}")
    sys.exit(1)

# 测试 2: 测试后端路由导入
try:
    from backend.routes.codebuddy_chat_routes import router as codebuddy_router
    print("CodeBuddy 聊天路由导入成功")
except ImportError as e:
    print(f"❌ CodeBuddy 聊天路由导入失败: {e}")
    sys.exit(1)

# 测试 3: 测试知识库导入
try:
    from backend.routes.chat_routes import PRESET_KNOWLEDGE_CARDS
    print(f"知识库导入成功，共 {len(PRESET_KNOWLEDGE_CARDS)} 类卡片")
except ImportError as e:
    print(f"❌ 知识库导入失败: {e}")
    sys.exit(1)

# 测试 4: 测试 SDK 基本功能
async def test_sdk_basic():
    try:
        print("\n 正在测试 SDK 基本功能...")
        full_response = []
        async for message in query(prompt="你好"):
            if hasattr(message, 'content'):
                for block in message.content:
                    if hasattr(block, 'text'):
                        full_response.append(block.text)
        response = "".join(full_response)
        print(f"SDK 基本功能测试成功，响应: {response[:50]}...")
        return True
    except Exception as e:
        print(f"❌ SDK 基本功能测试失败: {e}")
        return False

# 测试 5: 测试知识库上下文获取
async def test_knowledge_context():
    try:
        print("\n 正在测试知识库上下文获取...")
        from backend.routes.codebuddy_chat_routes import _get_knowledge_context

        context = await _get_knowledge_context("Antinet 系统概述")
        if context:
            print(f"知识库上下文获取成功，长度: {len(context)} 字符")
            print(f"   上下文预览: {context[:100]}...")
        else:
            print(" 未找到相关上下文（这是正常的）")
        return True
    except Exception as e:
        print(f"❌ 知识库上下文获取测试失败: {e}")
        return False

# 测试 6: 测试完整的聊天流程
async def test_complete_chat_flow():
    try:
        print("\n 正在测试完整的聊天流程...")
        from backend.routes.codebuddy_chat_routes import _call_codebuddy_sdk

        # 测试带知识库的查询
        response_text, latency_ms = await _call_codebuddy_sdk(
            query_text="什么是 Antinet 系统？",
            context="基于知识库信息：Antinet 智能知识管家是一款部署于骁龙 AIPC 的端侧智能数据工作站..."
        )

        print(f"完整聊天流程测试成功")
        print(f"   响应: {response_text[:100]}...")
        print(f"   延迟: {latency_ms:.2f}ms")
        return True
    except Exception as e:
        print(f"❌ 完整聊天流程测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

# 主测试函数
async def main():
    print("=" * 60)
    print("CodeBuddy SDK 集成测试")
    print("=" * 60)

    # 运行所有测试
    tests = [
        ("SDK 基本功能", test_sdk_basic),
        ("知识库上下文", test_knowledge_context),
        ("完整聊天流程", test_complete_chat_flow),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} 测试异常: {e}")
            results.append((test_name, False))

    # 打印总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)

    for test_name, result in results:
        status = "通过" if result else "❌ 失败"
        print(f"{status} {test_name}")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    print(f"\n总计: {passed}/{total} 测试通过")

    if passed == total:
        print("\n🎉 所有测试通过！CodeBuddy SDK 集成成功。")
        print("\n下一步操作：")
        print("1. 启动后端服务: start_backend.bat")
        print("2. 启动前端服务: cd frontend && npm run dev")
        print("3. 打开浏览器访问前端页面")
        print("4. 点击右下角机器人图标，尝试使用 CodeBuddy 增强聊天功能")
        return 0
    else:
        print(f"\n  {total - passed} 个测试失败，请检查错误信息。")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
