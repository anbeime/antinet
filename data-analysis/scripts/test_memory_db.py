"""
Agent记忆数据库完整测试脚本
测试Agent间流转记忆的所有功能
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.agent_memory_db import AgentMemoryDB
from scripts.init_memory_db import init_database, drop_database


def test_database_operations():
    """
    测试数据库所有操作
    """
    print("=" * 80)
    print("Agent记忆数据库测试")
    print("=" * 80)
    
    # 初始化数据库
    db_path = "./test_agent_memory.db"
    drop_database(db_path)
    init_database(db_path)
    
    db = AgentMemoryDB(db_path)
    
    # ========== 测试1：任务管理 ==========
    print("\n" + "=" * 80)
    print("[测试1] 任务管理")
    print("=" * 80)
    
    # 创建任务
    task_id = db.create_task("分析上个月销售趋势", "趋势分析", "high")
    print(f"创建任务: {task_id}")
    assert task_id is not None
    
    # 获取任务
    task = db.get_task(task_id)
    print(f"任务查询: {task['user_query']}")
    assert task is not None
    assert task['status'] == 'pending'
    
    # 更新任务状态
    db.update_task_status(task_id, "running")
    task = db.get_task(task_id)
    print(f"状态更新: {task['status']}")
    assert task['status'] == 'running'
    
    # 完成任务
    final_result = {
        "summary": "销售趋势分析完成",
        "metrics": {
            "total_sales": 1200000,
            "growth_rate": "-15%"
        }
    }
    db.update_task_result(task_id, final_result)
    task = db.get_task(task_id)
    print(f"任务完成: {task['status']}")
    assert task['status'] == 'completed'
    assert task['final_result'] is not None
    
    # ========== 测试2：Agent执行记录 ==========
    print("\n" + "=" * 80)
    print("[测试2] Agent执行记录")
    print("=" * 80)
    
    # 创建执行记录
    execution_id = db.create_agent_execution(
        task_id, "mijuanfang", "preprocessor", 
        {"raw_data": "sales_data.csv"}
    )
    print(f"创建执行记录: {execution_id}")
    assert execution_id is not None
    
    # 开始执行
    db.start_execution(execution_id)
    execution = db.get_agent_execution(execution_id)
    print(f"开始执行: {execution['status']}")
    assert execution['status'] == 'running'
    
    # 完成执行
    output_data = {
        "preprocessed_data": {
            "cleaned_data": [1, 2, 3, 4, 5],
            "quality_report": {
                "completeness": 0.98,
                "accuracy": 0.99
            }
        }
    }
    db.complete_execution(execution_id, output_data, 1500)
    execution = db.get_agent_execution(execution_id)
    print(f"完成执行: {execution['status']}, 耗时: {execution['execution_time']}ms")
    assert execution['status'] == 'completed'
    assert execution['execution_time'] == 1500
    
    # 测试多个Agent执行记录
    agents = ["tongzhengsi", "jianchayuan", "xingyusi", "canmousi"]
    for agent in agents:
        exec_id = db.create_agent_execution(
            task_id, agent, "execution_agent", {"task": "test"}
        )
        db.start_execution(exec_id)
        db.complete_execution(exec_id, {"result": "success"}, 1000)
    
    executions = db.get_task_executions(task_id)
    print(f"任务执行记录: {len(executions)} 条")
    assert len(executions) == 5
    
    # ========== 测试3：消息流转日志 ==========
    print("\n" + "=" * 80)
    print("[测试3] 消息流转日志")
    print("=" * 80)
    
    # 模拟Agent间的消息流转
    messages = [
        ("orchestrator", "mijuanfang", "task", {"instruction": "处理销售数据"}),
        ("mijuanfang", "tongzhengsi", "result", {"data": "cleaned_data"}),
        ("tongzhengsi", "jianchayuan", "result", {"facts": "核心事实"}),
        ("jianchayuan", "xingyusi", "result", {"interpretation": "分析结论"}),
        ("xingyusi", "canmousi", "result", {"risks": "风险检测"}),
        ("canmousi", "orchestrator", "result", {"actions": "行动建议"})
    ]
    
    for from_agent, to_agent, msg_type, content in messages:
        log_id = db.log_message(task_id, from_agent, to_agent, msg_type, content)
        print(f"消息: {from_agent} -> {to_agent} ({msg_type})")
        db.mark_message_processed(log_id)
    
    # 查询任务消息
    task_messages = db.get_task_messages(task_id)
    print(f"任务消息: {len(task_messages)} 条")
    assert len(task_messages) == 6
    
    # 查询Agent消息
    mijuanfang_messages = db.get_agent_messages("mijuanfang")
    print(f"密卷房消息: {len(mijuanfang_messages)} 条")
    assert len(mijuanfang_messages) >= 2
    
    # ========== 测试4：知识卡片 ==========
    print("\n" + "=" * 80)
    print("[测试4] 知识卡片")
    print("=" * 80)
    
    # 创建四色卡片
    cards_data = [
        {
            "agent": "tongzhengsi",
            "type": "blue",
            "content": {
                "title": "12月销售数据统计",
                "content": {
                    "dimensions": ["时间"],
                    "metrics": {
                        "sales": {"value": 1200000, "unit": "元"},
                        "growth_rate": {"value": "-15%", "comparison": "环比"}
                    }
                }
            },
            "tags": ["销售", "数据", "12月"]
        },
        {
            "agent": "jianchayuan",
            "type": "green",
            "content": {
                "title": "销售下滑原因分析",
                "content": {
                    "logic_chain": [
                        {"step": 1, "description": "竞品推出促销活动"},
                        {"step": 2, "description": "核心客户群体被分流"},
                        {"step": 3, "description": "销量环比下降15%"}
                    ]
                }
            },
            "tags": ["销售", "下滑", "原因"]
        },
        {
            "agent": "xingyusi",
            "type": "yellow",
            "content": {
                "title": "库存积压预警",
                "content": {
                    "risk_type": "库存积压",
                    "risk_level": "一级",
                    "details": {
                        "current_stock": 5000,
                        "expected_demand": 2000,
                        "excess_ratio": "150%"
                    }
                }
            },
            "tags": ["风险", "库存", "积压"]
        },
        {
            "agent": "canmousi",
            "type": "red",
            "content": {
                "title": "库存清理行动建议",
                "content": {
                    "actions": [
                        {
                            "step": 1,
                            "action": "推出限时折扣清理库存",
                            "priority": "立即执行",
                            "expected_effect": "库存周转率提升30%"
                        }
                    ]
                }
            },
            "tags": ["行动", "建议", "清理"]
        }
    ]
    
    card_ids = []
    for card_data in cards_data:
        card_id = db.create_knowledge_card(
            task_id, 
            card_data["agent"],
            card_data["type"],
            card_data["content"],
            card_data["tags"]
        )
        card_ids.append(card_id)
        print(f"创建卡片: {card_id} ({card_data['type']})")
    
    # 查询任务卡片
    task_cards = db.get_task_cards(task_id)
    print(f"任务卡片: {len(task_cards)} 张")
    assert len(task_cards) == 4
    
    # 按标签搜索
    search_results = db.search_cards_by_tags(["销售"])
    print(f"搜索结果（'销售'标签）: {len(search_results)} 张")
    assert len(search_results) >= 2
    
    # ========== 测试5：Agent状态 ==========
    print("\n" + "=" * 80)
    print("[测试5] Agent状态")
    print("=" * 80)
    
    # 更新Agent状态
    agents_status = [
        ("orchestrator", "busy", task_id, {"cpu": 30, "memory": 40}),
        ("mijuanfang", "idle", None, {"cpu": 10, "memory": 20}),
        ("tongzhengsi", "idle", None, {"cpu": 5, "memory": 15}),
        ("jianchayuan", "error", None, {"cpu": 0, "memory": 25}),
        ("xingyusi", "busy", task_id, {"cpu": 20, "memory": 30}),
        ("canmousi", "busy", task_id, {"cpu": 25, "memory": 35})
    ]
    
    for agent_name, status, current_task_id, metrics in agents_status:
        db.update_agent_state(agent_name, status, current_task_id, metrics)
        print(f"更新状态: {agent_name} -> {status}")
    
    # 查询所有Agent状态
    all_states = db.get_all_agent_states()
    print(f"Agent状态: {len(all_states)} 个")
    assert len(all_states) == 6
    
    # 查询特定Agent状态
    orchestrator_state = db.get_agent_state("orchestrator")
    print(f"锦衣卫总指挥使状态: {orchestrator_state['status']}")
    assert orchestrator_state['status'] == 'busy'
    
    # ========== 测试6：综合查询 ==========
    print("\n" + "=" * 80)
    print("[测试6] 综合查询")
    print("=" * 80)
    
    # 获取所有任务
    all_tasks = db.get_all_tasks()
    print(f"所有任务: {len(all_tasks)} 个")
    
    # 获取运行中的任务
    running_tasks = db.get_all_tasks(status="running")
    print(f"运行中任务: {len(running_tasks)} 个")
    
    # 获取Agent执行历史
    mijuanfang_executions = db.get_agent_executions("mijuanfang")
    print(f"密卷房执行历史: {len(mijuanfang_executions)} 条")
    
    # 获取特定类型消息
    result_messages = db.get_agent_messages("mijuanfang", message_type="result")
    print(f"密卷房结果消息: {len(result_messages)} 条")
    
    # ========== 清理 ==========
    print("\n" + "=" * 80)
    print("测试完成")
    print("=" * 80)
    
    # 删除测试数据库
    drop_database(db_path)
    print("测试数据库已清理")
    
    print("\n" + "=" * 80)
    print("🎉 所有测试通过！")
    print("=" * 80)


def test_agent_collaboration_scenario():
    """
    测试完整的Agent协作场景
    """
    print("\n" + "=" * 80)
    print("Agent协作场景测试")
    print("=" * 80)
    
    # 初始化数据库
    db_path = "./test_scenario.db"
    drop_database(db_path)
    init_database(db_path)
    
    db = AgentMemoryDB(db_path)
    
    # 场景：用户查询"分析上个月销售趋势"
    print("\n[场景开始] 用户查询: 分析上个月销售趋势")
    
    # 1. 锦衣卫总指挥使接收查询
    task_id = db.create_task("分析上个月销售趋势", "趋势分析", "high")
    db.update_agent_state("orchestrator", "busy", task_id)
    db.update_task_status(task_id, "running")
    print(f"[总指挥使] 创建任务: {task_id}")
    
    # 2. 总指挥使分解任务并下发
    agents_tasks = [
        ("mijuanfang", "预处理数据"),
        ("tongzhengsi", "生成事实"),
        ("jianchayuan", "生成解释"),
        ("xingyusi", "检测风险"),
        ("canmousi", "提供建议")
    ]
    
    execution_ids = {}
    for agent_name, instruction in agents_tasks:
        exec_id = db.create_agent_execution(
            task_id, agent_name, "execution_agent", {"instruction": instruction}
        )
        execution_ids[agent_name] = exec_id
        db.log_message(
            task_id, "orchestrator", agent_name, "task",
            {"instruction": instruction}
        )
        print(f"[总指挥使] 下发任务到 {agent_name}")
    
    # 3. 密卷房执行
    db.start_execution(execution_ids["mijuanfang"])
    db.update_agent_state("mijuanfang", "busy", task_id)
    print("[密卷房] 开始执行...")
    
    # 模拟密卷房完成
    db.complete_execution(
        execution_ids["mijuanfang"],
        {"cleaned_data": "xxx", "quality": "good"},
        1200
    )
    db.update_agent_state("mijuanfang", "idle")
    db.log_message(
        task_id, "mijuanfang", "tongzhengsi", "result",
        {"data": "cleaned_data"}
    )
    print("[密卷房] 完成执行，发送数据到通政司")
    
    # 4. 通政司执行
    db.start_execution(execution_ids["tongzhengsi"])
    db.update_agent_state("tongzhengsi", "busy", task_id)
    
    db.complete_execution(
        execution_ids["tongzhengsi"],
        {"facts": "销售下降了15%"},
        800
    )
    db.create_knowledge_card(
        task_id, "tongzhengsi", "blue",
        {"title": "销售事实", "content": "销售下降15%"},
        ["销售", "事实"]
    )
    db.log_message(
        task_id, "tongzhengsi", "jianchayuan", "result",
        {"facts": "销售下降15%"}
    )
    print("[通政司] 完成执行，创建蓝色卡片，发送到监察院")
    
    # 5. 监察院执行
    db.start_execution(execution_ids["jianchayuan"])
    db.update_agent_state("jianchayuan", "busy", task_id)
    
    db.complete_execution(
        execution_ids["jianchayuan"],
        {"interpretation": "竞品促销导致"},
        1000
    )
    db.create_knowledge_card(
        task_id, "jianchayuan", "green",
        {"title": "下滑原因", "content": "竞品促销导致"},
        ["销售", "原因"]
    )
    db.log_message(
        task_id, "jianchayuan", "xingyusi", "result",
        {"interpretation": "竞品促销导致"}
    )
    print("[监察院] 完成执行，创建绿色卡片，发送到刑狱司")
    
    # 6. 刑狱司执行
    db.start_execution(execution_ids["xingyusi"])
    db.update_agent_state("xingyusi", "busy", task_id)
    
    db.complete_execution(
        execution_ids["xingyusi"],
        {"risks": "库存积压风险"},
        900
    )
    db.create_knowledge_card(
        task_id, "xingyusi", "yellow",
        {"title": "库存风险", "content": "库存积压风险"},
        ["风险", "库存"]
    )
    db.log_message(
        task_id, "xingyusi", "canmousi", "result",
        {"risks": "库存积压风险"}
    )
    print("[刑狱司] 完成执行，创建黄色卡片，发送到参谋司")
    
    # 7. 参谋司执行
    db.start_execution(execution_ids["canmousi"])
    db.update_agent_state("canmousi", "busy", task_id)
    
    db.complete_execution(
        execution_ids["canmousi"],
        {"actions": "推出限时折扣"},
        1100
    )
    db.create_knowledge_card(
        task_id, "canmousi", "red",
        {"title": "行动建议", "content": "推出限时折扣"},
        ["行动", "建议"]
    )
    db.log_message(
        task_id, "canmousi", "orchestrator", "result",
        {"actions": "推出限时折扣"}
    )
    print("[参谋司] 完成执行，创建红色卡片，发送到总指挥使")
    
    # 8. 总指挥使汇总
    db.update_agent_state("canmousi", "idle")
    db.update_agent_state("orchestrator", "idle")
    
    final_result = {
        "task_id": task_id,
        "status": "completed",
        "cards": db.get_task_cards(task_id),
        "executions": db.get_task_executions(task_id),
        "messages": db.get_task_messages(task_id)
    }
    db.update_task_result(task_id, final_result)
    print("[总指挥使] 汇总所有结果，任务完成")
    
    # 9. 验证结果
    print("\n[结果验证]")
    print(f"  - 执行记录: {len(db.get_task_executions(task_id))} 条")
    print(f"  - 消息流转: {len(db.get_task_messages(task_id))} 条")
    print(f"  - 知识卡片: {len(db.get_task_cards(task_id))} 张")
    print(f"  - Agent状态: {len(db.get_all_agent_states())} 个")
    
    # 清理
    drop_database(db_path)
    print("\n场景测试完成，数据库已清理")


if __name__ == "__main__":
    # 运行基础功能测试
    test_database_operations()
    
    # 运行协作场景测试
    test_agent_collaboration_scenario()
    
    print("\n" + "=" * 80)
    print("🎉 所有测试通过！Agent记忆数据库功能完整可用！")
    print("=" * 80)
