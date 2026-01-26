"""
8-Agent协作流程完整测试脚本
演示从用户输入到最终报告生成的完整流程
"""
import json
import time
import subprocess
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.orchestrator import OrchestratorAgent
from agents.mijuanfang import MijuanfangAgent
from agents.tongzhengsi import TongzhengsiAgent
from agents.jianchayuan import JianchayuanAgent
from agents.xingyusi import XingyusiAgent
from agents.canmousi import CanmousiAgent
from agents.taishige import TaishigeAgent


def test_full_workflow():
    """
    测试完整�?-Agent协作流程
    """
    print("=" * 80)
    print("Antinet 8-Agent协作流程完整测试")
    print("=" * 80)
    
    # 1. 用户输入
    print("\n[1/8] 用户输入")
    print("-" * 80)
    user_input = {
        "user_id": "U123456",
        "raw_material": """| 项目阶段 | 计划完成时间 | 实际完成时间 | 进度偏差 | 资源投入 |
|----------|--------------|--------------|----------|----------|
| 需求调�?| 2026.01.10   | 2026.01.15   | +5�?    | 3�?     |
| 方案设计 | 2026.01.20   | 未开�?      | 滞后     | 0�?     |
| 开发测�?| 2026.02.10   | 未开�?      | 滞后     | 0�?     |""",
        "user_query": "分析这个项目进度滞后的原因，生成可视化报�?,
        "request_time": "2026-01-22 10:00:00"
    }
    print(f"用户ID: {user_input['user_id']}")
    print(f"用户需�? {user_input['user_query']}")
    print(f"原始素材: {user_input['raw_material'][:50]}...")
    
    # 2. 锦衣卫总指挥使 - 解析用户请求
    print("\n[2/8] 锦衣卫总指挥使 - 解析用户请求")
    print("-" * 80)
    commander = OrchestratorAgent(genie_api_base_url="http://127.0.0.1:5000", model_path="Qwen2.0-7B")
    task_instructions = commander.parse_user_request(user_input)
    print(f"任务ID: {task_instructions['task_id']}")
    print(f"优先�? {task_instructions['priority']}")
    print(f"子任务数: {len(task_instructions['sub_tasks'])}")
    
    # 3. 驿传�?- 下发任务（模拟）
    print("\n[3/8] 驿传�?- 下发任务")
    print("-" * 80)
    dispatch_result = commander.dispatch_task(task_instructions)
    print(f"下发状�? {dispatch_result['dispatch_status']}")
    print(f"任务ID列表: {dispatch_result['task_ids']}")
    
    # 4. 密卷�?- 数据预处�?    print("\n[4/8] 密卷�?- 数据预处�?)
    print("-" * 80)
    mijuanfang_task_id = dispatch_result['task_ids'][0]
    mijuanfang = MijuanfangAgent(mijuanfang_task_id)
    mijuanfang_result = mijuanfang.run(task_instructions['sub_tasks'][0]['task'], user_input['raw_material'])
    print(f"解析格式: {mijuanfang_result['result']['parsed_data']['format']}")
    print(f"数据质量: {mijuanfang_result['result']['quality_report']['quality_level']}")
    
    # 5. 通政�?- 事实生成
    print("\n[5/8] 通政�?- 事实生成")
    print("-" * 80)
    tongzhengsi_task_id = dispatch_result['task_ids'][1]
    tongzhengsi = TongzhengsiAgent(tongzhengsi_task_id)
    tongzhengsi_result = tongzhengsi.run(task_instructions['sub_tasks'][1]['task'], mijuanfang_result['result'])
    print(f"核心结论: {tongzhengsi_result['result']['core_facts']['核心结论']}")
    print(f"关键指标�? {len(tongzhengsi_result['result']['core_facts']['关键指标'])}")
    print(f"置信�? {tongzhengsi_result['result']['confidence']}")
    
    # 6. 监察�?- 原因分析
    print("\n[6/8] 监察�?- 原因分析")
    print("-" * 80)
    jianchayuan_task_id = dispatch_result['task_ids'][2]
    jianchayuan = JianchayuanAgent(jianchayuan_task_id)
    jianchayuan_result = jianchayuan.run(task_instructions['sub_tasks'][2]['task'], tongzhengsi_result['result'])
    print(f"主要原因: {jianchayuan_result['result']['cause_analysis']['primary_reason']['factor']}")
    print(f"影响占比: {jianchayuan_result['result']['cause_analysis']['primary_reason']['impact']}")
    print(f"逻辑链节点数: {len(jianchayuan_result['result']['logic_chain'])}")
    print(f"置信�? {jianchayuan_result['result']['confidence']}")
    
    # 7. 刑狱�?- 风险检�?    print("\n[7/8] 刑狱�?- 风险检�?)
    print("-" * 80)
    xingyusi_task_id = dispatch_result['task_ids'][3]
    xingyusi = XingyusiAgent(xingyusi_task_id)
    xingyusi_result = xingyusi.run(task_instructions['sub_tasks'][3]['task'], jianchayuan_result['result'])
    print(f"风险类型: {xingyusi_result['result']['risk_detection']['risk_type']}")
    print(f"风险等级: {xingyusi_result['result']['risk_detection']['risk_level']}")
    print(f"运营影响: {xingyusi_result['result']['impact_evaluation']['operational_impact']}")
    print(f"置信�? {xingyusi_result['result']['confidence']}")
    
    # 8. 参谋�?- 行动建议
    print("\n[8/8] 参谋�?- 行动建议")
    print("-" * 80)
    canmousi_task_id = dispatch_result['task_ids'][4]
    canmousi = CanmousiAgent(canmousi_task_id)
    canmousi_result = canmousi.run(task_instructions['sub_tasks'][4]['task'], xingyusi_result['result'])
    print(f"行动建议�? {len(canmousi_result['result']['action_suggestions']['actions'])}")
    print(f"整体优先�? {canmousi_result['result']['action_suggestions']['overall_priority']}")
    print(f"时间线周�? {len(canmousi_result['result']['timeline'])}")
    print(f"置信�? {canmousi_result['result']['confidence']}")
    
    # 9. 太史�?- 知识存储
    print("\n[9/8] 太史�?- 知识存储")
    print("-" * 80)
    taishige_task_id = dispatch_result['task_ids'][5]
    taishige = TaishigeAgent(taishige_task_id)
    all_results = {
        "mijuanfang": mijuanfang_result['result'],
        "tongzhengsi": tongzhengsi_result['result'],
        "jianchayuan": jianchayuan_result['result'],
        "xingyusi": xingyusi_result['result'],
        "canmousi": canmousi_result['result']
    }
    taishige_result = taishige.run(task_instructions['sub_tasks'][5]['task'], all_results)
    print(f"知识ID: {taishige_result['result']['store_result']['knowledge_id']}")
    print(f"存储状�? {taishige_result['result']['store_result']['store_status']}")
    print(f"相关案例�? {len(taishige_result['result']['related_cases'])}")
    
    # 10. 锦衣卫总指挥使 - 聚合结果
    print("\n[10/8] 锦衣卫总指挥使 - 聚合结果")
    print("-" * 80)
    report_draft = commander.aggregate_results({
        "mijuanfang": mijuanfang_result['result'],
        "tongzhengsi": tongzhengsi_result['result'],
        "jianchayuan": jianchayuan_result['result'],
        "xingyusi": xingyusi_result['result'],
        "canmousi": canmousi_result['result'],
        "taishige": taishige_result['result']
    })
    print(f"报告摘要: {report_draft['summary']}")
    
    # 11. 锦衣卫总指挥使 - 渲染可视�?    print("\n[11/8] 锦衣卫总指挥使 - 渲染可视�?)
    print("-" * 80)
    final_report = commander.render_visualization(report_draft)
    print(f"报告ID: {final_report['report_id']}")
    print(f"PDF路径: {final_report['pdf_path']}")
    print(f"长图路径: {final_report['long_img_path']}")
    print(f"卡片路径: {final_report['card_img_paths']}")
    print(f"生成时间: {final_report['generate_time']}")
    print(f"耗时: {final_report['cost_time']}")
    
    # 12. 完整报告输出
    print("\n[12/8] 完整报告")
    print("=" * 80)
    print(json.dumps(final_report, ensure_ascii=False, indent=2))
    print("=" * 80)
    
    print("\n8-Agent协作流程测试完成�?)


def test_individual_agents():
    """
    测试各个Agent的独立功�?    """
    print("\n" + "=" * 80)
    print("各Agent独立功能测试")
    print("=" * 80)
    
    # 测试密卷�?    print("\n[测试] 密卷�?)
    mijuanfang = MijuanfangAgent("TEST_mijuanfang")
    raw_material = """| 项目阶段 | 进度 |
|----------|------|
| 需求调�?| 完成 |
| 方案设计 | 进行�?|"""
    result = mijuanfang.run("测试解析", raw_material)
    print(f"�?密卷房测试通过: {result['status']}")
    
    # 测试通政�?    print("\n[测试] 通政�?)
    tongzhengsi = TongzhengsiAgent("TEST_tongzhengsi")
    mijuanfang_result = {
        "cleaned_data": {
            "format": "table",
            "data": [{"项目阶段": "需求调�?, "进度": "完成"}]
        }
    }
    result = tongzhengsi.run("测试事实提取", mijuanfang_result)
    print(f"�?通政司测试通过: {result['status']}")
    
    # 测试监察�?    print("\n[测试] 监察�?)
    jianchayuan = JianchayuanAgent("TEST_jianchayuan")
    tongzhengsi_result = {
        "core_facts": {
            "核心结论": "测试结论",
            "关键指标": []
        }
    }
    result = jianchayuan.run("测试原因分析", tongzhengsi_result)
    print(f"�?监察院测试通过: {result['status']}")
    
    # 测试刑狱�?    print("\n[测试] 刑狱�?)
    xingyusi = XingyusiAgent("TEST_xingyusi")
    jianchayuan_result = {
        "cause_analysis": {
            "primary_reason": {"factor": "测试因素", "impact": "50%"}
        }
    }
    result = xingyusi.run("测试风险检�?, jianchayuan_result)
    print(f"�?刑狱司测试通过: {result['status']}")
    
    # 测试参谋�?    print("\n[测试] 参谋�?)
    canmousi = CanmousiAgent("TEST_canmousi")
    xingyusi_result = {
        "risk_detection": {
            "risk_type": "测试风险",
            "risk_level": "�?
        }
    }
    result = canmousi.run("测试行动建议", xingyusi_result)
    print(f"�?参谋司测试通过: {result['status']}")
    
    # 测试太史�?    print("\n[测试] 太史�?)
    taishige = TaishigeAgent("TEST_taishige")
    all_results = {
        "mijuanfang": {},
        "tongzhengsi": {},
        "jianchayuan": {},
        "xingyusi": {},
        "canmousi": {}
    }
    result = taishige.run("测试知识存储", all_results)
    print(f"�?太史阁测试通过: {result['status']}")
    
    print("\n所有Agent独立功能测试完成�?)


if __name__ == "__main__":
    # 运行独立测试
    test_individual_agents()
    
    # 运行完整流程测试
    test_full_workflow()
