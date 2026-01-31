"""
监察院（执行层：原因/逻辑分析）
基于通政司事实，做原因归因、逻辑链梳理
"""
import requests
import json

YICHUANSI_API = "http://127.0.0.1:8000/yichuansi/"


class JianchayuanAgent:
    """监察院"""
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.agent_name = "jianchayuan"
    
    def analyze_causes(self, core_facts: dict) -> dict:
        """
        归因核心原因，量化因素占比
        
        参数：
            core_facts: dict
        
        返回：
            cause_analysis: dict
        """
        # 归因逻辑（示例：项目进度场景）
        cause_analysis = {
            "primary_reason": {
                "factor": "资源投入不足",
                "impact": "70%",
                "details": "方案设计阶段资源投入为0人，无法启动核心环节"
            },
            "secondary_reasons": [
                {
                    "factor": "需求调研延迟",
                    "impact": "30%",
                    "details": "需求调研滞后5天，导致方案设计无法按时启动"
                }
            ],
            "excluded_factors": ["外部依赖", "技术难题"]
        }
        return cause_analysis
    
    def build_logic_chain(self, cause_analysis: dict) -> list:
        """
        构建逻辑链路（原因->结果）
        
        参数：
            cause_analysis: dict
        
        返回：
            logic_chain: list
        """
        # 逻辑链可视化数据
        return [
            {"node": "资源投入不足（0人）", "next_node": "方案设计未启动", "relation": "直接导致"},
            {"node": "需求调研延迟（+5天）", "next_node": "方案设计启动滞后", "relation": "间接影响"},
            {"node": "方案设计未启动", "next_node": "项目整体进度滞后", "relation": "核心原因"}
        ]
    
    def run(self, task: str, tongzhengsi_result: dict):
        """
        执行任务
        
        参数：
            task: str
            tongzhengsi_result: dict
        
        返回：
            response: dict
        """
        core_facts = tongzhengsi_result["core_facts"]
        cause_analysis = self.analyze_causes(core_facts)
        logic_chain = self.build_logic_chain(cause_analysis)
        
        result = {
            "task_id": self.task_id,
            "agent": self.agent_name,
            "result": {
                "cause_analysis": cause_analysis,
                "logic_chain": logic_chain,
                "confidence": 0.88
            }
        }
        
        # 提交至驿传司
        response = requests.post(
            url=f"{YICHUANSI_API}receive_result",
            json={"agent_result": result, "sender": self.agent_name}
        )
        return response.json()


# 测试
if __name__ == "__main__":
    jianchayuan = JianchayuanAgent("T20260122100000_jianchayuan")
    
    tongzhengsi_result = {
        "core_facts": {
            "核心结论": "项目进度整体滞后，方案设计阶段未开始",
            "关键指标": [
                {"指标": "需求调研进度偏差", "值": "+5天", "影响": "基础环节延迟"},
                {"指标": "方案设计资源投入", "值": "0人", "影响": "无法启动"}
            ]
        }
    }
    
    result = jianchayuan.run("分析项目进度滞后的原因", tongzhengsi_result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
