"""
知识图谱引导应用测试脚本
演示SmartBot知识图谱引导应用的完整使用流程
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.taishige import TaishigeAgent


def test_knowledge_graph_application():
    """
    测试知识图谱引导应用完整流程
    """
    print("=" * 80)
    print("SmartBot 知识图谱引导应用测试")
    print("=" * 80)
    
    # 创建太史阁Agent
    taishige = TaishigeAgent("KG_TEST_001")
    
    # ========== 101-103: 介绍和引导 ==========
    print("\n" + "=" * 80)
    print("[101] 输出简介")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 101)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[102] 引导用户")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 102)
    print(result["output"])
    
    # 模拟用户输入
    user_input = "我想了解LLM（大语言模型）"
    print(f"\n[用户输入]: {user_input}")
    
    print("\n" + "=" * 80)
    print("[103] 接收用户输入")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow(user_input, 103)
    print(result["output"])
    
    # ========== 200-203: 明确问题，设定目标 ==========
    print("\n" + "=" * 80)
    print("[201] 存储原始问题")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 201)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[202] 生成目标")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow(user_input, 202)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[203] 确认目标")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 203)
    print(result["output"])
    
    # 模拟用户确认
    print(f"\n[用户输入]: 认可")
    
    # ========== 300-303: 分析维度 ==========
    print("\n" + "=" * 80)
    print("[301] 输出目标")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 301)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[302] 分析维度")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 302)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[303] 确认维度")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 303)
    print(result["output"])
    
    # 模拟用户确认
    print(f"\n[用户输入]: 认可")
    
    # ========== 400-405: 细化解释和问答 ==========
    print("\n" + "=" * 80)
    print("[401] 输出目标")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 401)
    print(result["output"])
    
    # 维度1
    print("\n" + "=" * 80)
    print("[402] 输出第1个维度详细解释")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 402)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[403] 询问是否有疑问")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 403)
    print(result["output"])
    
    # 模拟用户提问
    user_question = "什么是LLM基础知识？"
    print(f"\n[用户输入]: {user_question}")
    
    print("\n" + "=" * 80)
    print("[404] 回答用户问题")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow(user_question, 404)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[405] 确认问题是否解决")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 405)
    print(result["output"])
    
    # 模拟用户确认已解决
    print(f"\n[用户输入]: 已解决")
    
    # 维度2
    print("\n" + "=" * 80)
    print("[402] 输出第2个维度详细解释")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 402)
    print(result["output"])
    
    print("\n" + "=" * 80)
    print("[403] 询问是否有疑问")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 403)
    print(result["output"])
    
    # 模拟用户无疑问
    print(f"\n[用户输入]: 无")
    
    # 维度3-4（快速跳过）
    for i in range(2):
        print("\n" + "=" * 80)
        print(f"[402] 输出第{i+3}个维度详细解释")
        print("=" * 80)
        result = taishige.process_knowledge_graph_workflow("", 402)
        print(result["output"][:200] + "...")
        
        print("\n" + "=" * 80)
        print("[403] 询问是否有疑问")
        print("=" * 80)
        result = taishige.process_knowledge_graph_workflow("", 403)
        print(result["output"])
        
        print(f"\n[用户输入]: 无")
    
    # ========== 500-501: 支持的指令 ==========
    print("\n" + "=" * 80)
    print("[500] 输出指令帮助")
    print("=" * 80)
    result = taishige.process_knowledge_graph_workflow("", 500)
    print(result["output"])
    
    # 测试各个指令
    commands = ["/简介", "/目标", "/维度分析", "/Q&A", "/help", "/知识图谱", "/输出"]
    
    for cmd in commands:
        print("\n" + "=" * 80)
        print(f"[501] 执行指令: {cmd}")
        print("=" * 80)
        result = taishige.process_knowledge_graph_workflow(cmd, 501)
        print(result["output"])
    
    print("\n" + "=" * 80)
    print("知识图谱引导应用测试完成！")
    print("=" * 80)


def test_interactive_mode():
    """
    交互式测试模式
    用户可以输入内容，体验完整流程
    """
    print("\n" + "=" * 80)
    print("SmartBot 知识图谱引导应用 - 交互式模式")
    print("=" * 80)
    print("输入'quit'退出程序\n")
    
    taishige = TaishigeAgent("KG_INTERACTIVE_001")
    current_step = 101
    
    while True:
        print("\n" + "-" * 80)
        print(f"当前步骤: {current_step}")
        print("-" * 80)
        
        result = taishige.process_knowledge_graph_workflow("", current_step)
        print(result["output"])
        
        # 如果需要用户输入
        if result.get("action") == "wait_for_input" or result.get("action") == "wait_for_confirmation":
            user_input = input("\n请输入: ")
            
            if user_input.lower() == "quit":
                print("退出程序")
                break
            
            # 根据当前步骤处理用户输入
            if current_step == 103:
                current_step = 201
            elif current_step == 203:
                if "认可" in user_input:
                    current_step = 301
                else:
                    # 用户不认可，保持当前步骤，让用户重新输入目标
                    print("\n请告诉我您希望调整的方向：")
                    user_input = input("调整后的目标: ")
                    taishige.knowledge_graph_db["目标"]["<目标>"] = user_input
                    print(f"\n已更新目标: {user_input}")
                    print("\n这个目标是您的本意吗？")
            
            elif current_step == 303:
                if "认可" in user_input:
                    current_step = 401
                else:
                    # 用户不认可，让用户调整维度
                    print("\n请告诉我您希望如何调整维度：")
                    print("1. 增加维度")
                    print("2. 删除维度")
                    print("3. 修改逻辑")
                    choice = input("请选择(1/2/3): ")
                    
                    if choice == "1":
                        new_dim = input("请输入新增的维度名称: ")
                        idx = len(taishige.knowledge_graph_db["维度分析"]) + 1
                        taishige.knowledge_graph_db["维度分析"].append({
                            "<序号>": idx,
                            "<维度名称>": new_dim,
                            "<简要解释>": "用户自定义维度",
                            "<详细解释>": ""
                        })
                    elif choice == "2":
                        idx = int(input("请输入要删除的维度序号: "))
                        taishige.knowledge_graph_db["维度分析"] = [
                            d for d in taishige.knowledge_graph_db["维度分析"]
                            if d["<序号>"] != idx
                        ]
                    elif choice == "3":
                        new_logic = input("请输入新的分析逻辑: ")
                        taishige.knowledge_graph_db["目标"]["<逻辑>"] = new_logic
                    
                    print("\n已更新分析内容，请确认")
            
            elif current_step == 403:
                if "无" in user_input or user_input.strip() == "":
                    # 继续下一个维度
                    idx = taishige.workflow_state["dimension_index"]
                    if idx < len(taishige.knowledge_graph_db["维度分析"]):
                        current_step = 402
                    else:
                        current_step = 500
                else:
                    # 用户有疑问
                    current_step = 404
            
            elif current_step == 405:
                if "已解决" in user_input:
                    # 更新问题状态
                    if taishige.knowledge_graph_db["Q&A"]:
                        taishige.knowledge_graph_db["Q&A"][-1]["<状态>"] = "已解决"
                    current_step = 402
                elif "重新解释" in user_input:
                    # 重新生成回答
                    last_qa = taishige.knowledge_graph_db["Q&A"][-1]
                    answer = taishige._step_404_answer_question(last_qa["<问题>"])
                    last_qa["<回答>"] = answer
                    last_qa["<状态>"] = "未解决"
                    print(f"\n[新回答]: {answer}")
                    current_step = 405
                else:
                    # 新问题
                    last_qa = taishige.knowledge_graph_db["Q&A"][-1]
                    last_qa["<状态>"] = "待办"
                    current_step = 404
            
            else:
                # 处理其他用户输入
                current_step = result["next_step"]
        else:
            current_step = result["next_step"]


if __name__ == "__main__":
    # 运行自动化测试
    test_knowledge_graph_application()
    
    # 如果需要交互式测试，取消下面的注释
    # test_interactive_mode()
