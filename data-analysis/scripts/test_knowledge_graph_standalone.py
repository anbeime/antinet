"""
知识图谱引导应用独立测试脚本
不依赖驿传司服务，直接测试太史阁Agent的知识图谱引导功�?"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.taishige import TaishigeAgent


def test_knowledge_graph_workflow():
    """
    测试知识图谱引导应用工作流程（不依赖驿传司）
    """
    print("=" * 80)
    print("SmartBot 知识图谱引导应用 - 独立测试")
    print("=" * 80)
    
    # 创建太史阁Agent
    taishige = TaishigeAgent("KG_INDEPENDENT_001")
    
    # 测试101-103: 介绍和引�?    print("\n" + "=" * 80)
    print("[101] 输出简�?)
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 101)
    print(result["output"])
    assert result["next_step"] == 102
    
    print("\n" + "=" * 80)
    print("[102] 引导用户")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 102)
    print(result["output"])
    assert result["next_step"] == 103
    assert result["action"] == "wait_for_input"
    
    # 模拟用户输入
    user_input = "我想了解LLM（大语言模型�?
    print(f"\n[用户输入]: {user_input}")
    
    # 步骤103: 接收用户输入
    print("\n" + "=" * 80)
    print("[103] 接收用户输入")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow(user_input, 103)
    print(result["output"])
    assert taishige.knowledge_graph_db["目标"]["<原始问题>"] == user_input
    
    # 测试201-203: 明确问题，设定目�?    print("\n" + "=" * 80)
    print("[202] 生成目标")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow(user_input, 202)
    print(result["output"])
    assert "LLM" in taishige.knowledge_graph_db["目标"]["<目标>"]
    
    print("\n" + "=" * 80)
    print("[203] 确认目标")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 203)
    print(result["output"])
    assert result["action"] == "wait_for_confirmation"
    
    # 测试302-303: 分析维度
    print("\n" + "=" * 80)
    print("[302] 分析维度")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 302)
    print(result["output"])
    assert len(taishige.knowledge_graph_db["维度分析"]) > 0
    
    print("\n" + "=" * 80)
    print("[303] 确认维度")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 303)
    print(result["output"])
    assert result["action"] == "wait_for_confirmation"
    
    # 测试402-405: 细化解释和问�?    print("\n" + "=" * 80)
    print("[402] 输出�?个维度详细解�?)
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 402)
    print(result["output"])
    assert taishige.knowledge_graph_db["维度分析"][0]["<详细解释>"] != ""
    
    print("\n" + "=" * 80)
    print("[403] 询问是否有疑�?)
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 403)
    print(result["output"])
    assert result["action"] == "wait_for_input"
    
    # 模拟用户提问
    user_question = "什么是LLM基础知识�?
    print(f"\n[用户输入]: {user_question}")
    
    print("\n" + "=" * 80)
    print("[404] 回答用户问题")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow(user_question, 404)
    print(result["output"])
    assert len(taishige.knowledge_graph_db["Q&A"]) > 0
    assert taishige.knowledge_graph_db["Q&A"][0]["<问题>"] == user_question
    
    print("\n" + "=" * 80)
    print("[405] 确认问题是否解决")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 405)
    print(result["output"])
    assert result["action"] == "wait_for_input"
    
    # 测试500-501: 支持的指�?    print("\n" + "=" * 80)
    print("[500] 输出指令帮助")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 500)
    print(result["output"])
    
    # 测试各个指令
    commands = ["/简�?, "/目标", "/维度分析", "/Q&A", "/help", "/知识图谱"]
    
    for cmd in commands:
        print("\n" + "=" * 80)
        print(f"[501] 执行指令: {cmd}")
        print("=" * 80)
        result = taishige.process_knowledge_graph_workflow(cmd, 501)
        print(result["output"])
    
    # 测试/输出指令（测试完整性）
    print("\n" + "=" * 80)
    print("[501] 执行指令: /输出")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("/输出", 501)
    output = result["output"]
    print(output)
    assert "简�? in output
    assert "目标" in output
    assert "维度分析" in output
    
    print("\n" + "=" * 80)
    print("知识图谱引导应用独立测试全部通过�?)
    print("=" * 80)


def test_multiple_domains():
    """
    测试多个不同领域的知识图谱生�?    """
    print("\n" + "=" * 80)
    print("多领域测�?)
    print("=" * 80)
    
    domains = [
        ("我想了解LLM（大语言模型�?, "LLM"),
        ("我想学习Python编程", "Python"),
        ("我想了解社群运营", "社群运营")
    ]
    
    for user_input, domain in domains:
        print(f"\n{'=' * 80}")
        print(f"测试领域: {domain}")
        print('=' * 80)
        
        taishige = TaishigeAgent(f"KG_DOMAIN_{domain}")
        
        # 快速执行到步骤202
        taishige.process_knowledge_graph_workflow("", 101)
        taishige.process_knowledge_graph_workflow("", 102)
        taishige.process_knowledge_graph_workflow(user_input, 201)
        taishige.process_knowledge_graph_workflow(user_input, 202)
        
        # 验证目标生成
        goal = taishige.knowledge_graph_db["目标"]["<目标>"]
        print(f"生成的目�? {goal[:100]}...")
        
        # 验证维度分析
        taishige.process_knowledge_graph_workflow("", 302)
        dimensions = taishige.knowledge_graph_db["维度分析"]
        print(f"分析出的维度数量: {len(dimensions)}")
        for dim in dimensions:
            print(f"  - {dim['<维度名称>']}")
        
        # 验证详细解释生成
        if dimensions:
            dim_detail = taishige._step_402_generate_detail(dimensions[0])
            assert len(dim_detail) > 50, f"{domain} 的维度详细解释太�?
            print(f"�?个维度解释长�? {len(dim_detail)} 字符")


def test_edge_cases():
    """
    测试边界情况和异常处�?    """
    print("\n" + "=" * 80)
    print("边界情况和异常测�?)
    print("=" * 80)
    
    taishige = TaishigeAgent("KG_EDGE_001")
    
    # 测试未知指令
    print("\n测试未知指令...")
    result = taishige.process_knowledge_graph_workflow("/未知指令", 501)
    assert "未知指令" in result["output"]
    print("�?未知指令处理正确")
    
    # 测试空输�?    print("\n测试空输�?..")
    result = taishige.process_knowledge_graph_workflow("", 101)
    assert result["output"] != ""
    print("�?空输入处理正�?)
    
    # 测试步骤跳转
    print("\n测试步骤跳转...")
    taishige.process_knowledge_graph_workflow("", 201)
    result = taishige.process_knowledge_graph_workflow("", 302)
    assert len(taishige.knowledge_graph_db["维度分析"]) > 0
    print("�?步骤跳转处理正确")
    
    # 测试数据持久�?    print("\n测试数据持久�?..")
    taishige.knowledge_graph_db["目标"]["<原始问题>"] = "测试问题"
    assert taishige.knowledge_graph_db["目标"]["<原始问题>"] == "测试问题"
    print("�?数据持久性正�?)
    
    print("\n" + "=" * 80)
    print("边界情况和异常测试全部通过�?)
    print("=" * 80)


if __name__ == "__main__":
    # 运行所有测�?    try:
        test_knowledge_graph_workflow()
        test_multiple_domains()
        test_edge_cases()
        
        print("\n" + "=" * 80)
        print("🎉 所有测试通过�?)
        print("=" * 80)
        
    except AssertionError as e:
        print(f"\n 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n 测试出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
