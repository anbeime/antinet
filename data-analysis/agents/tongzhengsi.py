"""
通政司（执行层：事实生成/核心信息提炼）
从密卷房标准化数据中，提取客观、结构化的核心事实
"""
import requests
import json

YICHUANSI_API = "http://127.0.0.1:8000/yichuansi/"


class TongzhengsiAgent:
    """通政司"""
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.agent_name = "tongzhengsi"
    
    def extract_facts(self, cleaned_data: dict) -> dict:
        """
        从清洗后的数据中提取核心事实
        
        参数：
            cleaned_data: dict
        
        返回：
            core_facts: dict
        """
        core_facts = {"核心结论": "", "关键指标": [], "对比维度": []}
        
        # 表格数据事实提取
        if cleaned_data["format"] == "table":
            # 示例：项目进度场景
            stages = [row["项目阶段"] for row in cleaned_data["data"]]
            delays = [row for row in cleaned_data["data"] if row["进度偏差"] in ["滞后", "+"]]
            
            if delays:
                core_facts["核心结论"] = f"项目进度整体滞后，{delays[0]['项目阶段']}阶段延迟"
                for row in cleaned_data["data"]:
                    core_facts["关键指标"].append({
                        "指标": f"{row['项目阶段']}进度偏差",
                        "值": row["进度偏差"],
                        "影响": "基础环节延迟" if row["项目阶段"] == "需求调研" else "核心环节未启动"
                    })
        
        return core_facts
    
    def structure_facts(self, core_facts: dict) -> dict:
        """
        将事实按通用维度结构化（时间/指标/对比）
        
        参数：
            core_facts: dict
        
        返回：
            structured_facts: dict
        """
        # 按「事实类型-维度-值」结构化
        structured = {
            "客观事实": [
                {"类型": "进度状态", "维度": "整体", "值": core_facts["核心结论"]},
                {"类型": "资源状态", "维度": "各阶段", "值": core_facts["关键指标"]}
            ]
        }
        return structured
    
    def run(self, task: str, mijuanfang_result: dict):
        """
        执行任务（先从驿传司获取密卷房成果，再提取事实）
        
        参数：
            task: str
            mijuanfang_result: dict
        
        返回：
            response: dict
        """
        cleaned_data = mijuanfang_result["cleaned_data"]
        core_facts = self.extract_facts(cleaned_data)
        structured_facts = self.structure_facts(core_facts)
        
        result = {
            "task_id": self.task_id,
            "agent": self.agent_name,
            "result": {
                "core_facts": core_facts,
                "structured_facts": structured_facts,
                "confidence": 0.98
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
    tongzhengsi = TongzhengsiAgent("T20260122100000_tongzhengsi")
    
    # 模拟密卷房成果
    mijuanfang_result = {
        "cleaned_data": {
            "format": "table",
            "data": [
                {"项目阶段": "需求调研", "计划完成时间": "2026.01.10", "实际完成时间": "2026.01.15", "进度偏差": "+5天", "资源投入": "3人"},
                {"项目阶段": "方案设计", "计划完成时间": "2026.01.20", "实际完成时间": "未开始", "进度偏差": "滞后", "资源投入": "0人"}
            ]
        }
    }
    
    result = tongzhengsi.run("分析项目进度滞后的原因", mijuanfang_result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
