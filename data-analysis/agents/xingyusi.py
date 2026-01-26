"""
刑狱司（执行层：风险/问题检测）
识别风险/异常，评级并评估影响
"""
import requests
import json

YICHUANSI_API = "http://127.0.0.1:8000/yichuansi/"


class XingyusiAgent:
    """刑狱司"""
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.agent_name = "xingyusi"
    
    def detect_risk(self, cause_analysis: dict) -> dict:
        """
        识别风险点，评级（高/中/低）
        
        参数：
            cause_analysis: dict
        
        返回：
            risk_detection: dict
        """
        return {
            "risk_type": "项目进度断层",
            "risk_level": "高",
            "risk_details": {
                "affected_stages": ["方案设计", "开发测试"],
                "time_period": "立即"
            },
            "risk_causes": cause_analysis["primary_reason"]
        }
    
    def evaluate_impact(self, risk_detection: dict) -> dict:
        """
        量化风险影响（进度/成本/质量）
        
        参数：
            risk_detection: dict
        
        返回：
            impact_evaluation: dict
        """
        return {
            "financial_impact": "项目延期导致成本增加10%",
            "operational_impact": "整体交付时间滞后至少15天",
            "risk_matrix": {"probability": "高", "impact": "高", "level": "高"}
        }
    
    def run(self, task: str, jianchayuan_result: dict):
        """
        执行任务
        
        参数：
            task: str
            jianchayuan_result: dict
        
        返回：
            response: dict
        """
        cause_analysis = jianchayuan_result["cause_analysis"]
        risk_detection = self.detect_risk(cause_analysis)
        impact_evaluation = self.evaluate_impact(risk_detection)
        
        result = {
            "task_id": self.task_id,
            "agent": self.agent_name,
            "result": {
                "risk_detection": risk_detection,
                "impact_evaluation": impact_evaluation,
                "confidence": 0.92
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
    xingyusi = XingyusiAgent("T20260122100000_xingyusi")
    
    jianchayuan_result = {
        "cause_analysis": {
            "primary_reason": {
                "factor": "资源投入不足",
                "impact": "70%",
                "details": "方案设计阶段资源投入为0人，无法启动核心环节"
            }
        }
    }
    
    result = xingyusi.run("分析项目进度滞后的原因", jianchayuan_result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
