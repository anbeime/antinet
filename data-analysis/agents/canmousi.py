"""
参谋司（执行层：行动/方案建议）
基于风险/原因，生成可落地的行动建议
"""
import requests
import json

YICHUANSI_API = "http://127.0.0.1:8000/yichuansi/"


class CanmousiAgent:
    """参谋司"""
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.agent_name = "canmousi"
    
    def generate_actions(self, risk_detection: dict) -> dict:
        """
        生成分级行动建议（高/中优先级）
        
        参数：
            risk_detection: dict
        
        返回：
            action_suggestions: dict
        """
        return {
            "actions": [
                {
                    "step": 1,
                    "action": "紧急调配资源",
                    "details": "24小时内调配2名核心人员至方案设计阶段",
                    "priority": "高",
                    "expected_effect": "48小时内启动方案设计",
                    "resources": {"人力": "2人", "预算": "0元"}
                },
                {
                    "step": 2,
                    "action": "优化需求调研成果",
                    "details": "复盘需求调研延迟原因，压缩冗余环节",
                    "priority": "中",
                    "expected_effect": "后续阶段不再延迟",
                    "resources": {"人力": "1人", "预算": "0元"}
                }
            ],
            "overall_priority": "高",
            "success_metrics": ["方案设计48小时内启动", "整体进度滞后控制在7天内"]
        }
    
    def build_timeline(self, actions: dict) -> list:
        """
        生成时间线路线图
        
        参数：
            actions: dict
        
        返回：
            timeline: list
        """
        return [
            {"week": 1, "actions": ["紧急调配资源", "启动方案设计"]},
            {"week": 2, "actions": ["完成方案设计", "启动开发测试"]},
            {"week": 3, "actions": ["追平进度", "复盘优化"]}
        ]
    
    def run(self, task: str, xingyusi_result: dict):
        """
        执行任务
        
        参数：
            task: str
            xingyusi_result: dict
        
        返回：
            response: dict
        """
        risk_detection = xingyusi_result["risk_detection"]
        actions = self.generate_actions(risk_detection)
        timeline = self.build_timeline(actions)
        
        result = {
            "task_id": self.task_id,
            "agent": self.agent_name,
            "result": {
                "action_suggestions": actions,
                "timeline": timeline,
                "confidence": 0.85
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
    canmousi = CanmousiAgent("T20260122100000_canmousi")
    
    xingyusi_result = {
        "risk_detection": {
            "risk_type": "项目进度断层",
            "risk_level": "高"
        }
    }
    
    result = canmousi.run("分析项目进度滞后的原因", xingyusi_result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
