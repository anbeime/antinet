"""
密卷房（执行层：数据/信息预处理）
解析任意格式素材，清洗/标准化，生成素材质量评估
"""
import requests
import json
import re
from typing import Dict, List

YICHUANSI_API = "http://127.0.0.1:8000/yichuansi/"


class MijuanfangAgent:
    """密卷房"""
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.agent_name = "mijuanfang"
    
    def parse_material(self, raw_material: str) -> Dict:
        """
        解析任意格式素材（表格/文本/JSON），提取核心信息
        
        参数：
            raw_material: str
        
        返回：
            parsed_data: dict
        """
        # 表格解析逻辑（适配markdown表格）
        if "|" in raw_material and "---" in raw_material:
            lines = [line.strip() for line in raw_material.split("\n") if line.strip()]
            header = [h.strip() for h in lines[0].split("|") if h.strip()]
            data = []
            for line in lines[2:]:  # 跳过表头和分隔线
                values = [v.strip() for v in line.split("|") if v.strip()]
                if len(values) == len(header):
                    data.append(dict(zip(header, values)))
            return {"fields": header, "data": data, "format": "table"}
        
        # JSON解析
        elif raw_material.startswith("{") and raw_material.endswith("}"):
            return {"data": json.loads(raw_material), "format": "json"}
        
        # 文本解析（简单分句）
        else:
            sentences = [s.strip() for s in raw_material.split("。") if s.strip()]
            return {"data": sentences, "format": "text"}
    
    def clean_data(self, parsed_data: Dict) -> Dict:
        """
        清洗无效信息/缺失值，标准化数据格式
        
        参数：
            parsed_data: dict
        
        返回：
            cleaned_data: dict
        """
        cleaned_data = parsed_data.copy()
        
        # 示例：清洗缺失值（实际可扩展更多规则）
        if parsed_data["format"] == "table":
            cleaned_data["data"] = [
                {k: v if v != "" else "无" for k, v in row.items()}
                for row in parsed_data["data"]
            ]
        
        return cleaned_data
    
    def evaluate_quality(self, cleaned_data: Dict) -> Dict:
        """
        评估素材质量（优秀/良好/一般）
        
        参数：
            cleaned_data: dict
        
        返回：
            quality_report: dict
        """
        total_count = len(cleaned_data["data"]) if "data" in cleaned_data else 0
        missing_count = 0
        
        if cleaned_data["format"] == "table":
            for row in cleaned_data["data"]:
                missing_count += sum(1 for v in row.values() if v == "无")
            missing_rate = f"{(missing_count / (total_count * len(cleaned_data['fields']))) * 100:.1f}%"
        else:
            missing_rate = "0%"
        
        # 质量等级判定
        if missing_rate == "0.0%":
            quality_level = "优秀"
        elif float(missing_rate[:-1]) < 5:
            quality_level = "良好"
        else:
            quality_level = "一般"
        
        return {
            "quality_level": quality_level,
            "missing_rate": missing_rate,
            "valid_rate": f"{100 - float(missing_rate[:-1]):.1f}%",
            "format": cleaned_data["format"]
        }
    
    def run(self, task: str, raw_material: str):
        """
        执行任务并提交成果至驿传司
        
        参数：
            task: str
            raw_material: str
        
        返回：
            response: dict
        """
        # 解析->清洗->评估
        parsed_data = self.parse_material(raw_material)
        cleaned_data = self.clean_data(parsed_data)
        quality_report = self.evaluate_quality(cleaned_data)
        
        # 组装成果
        result = {
            "task_id": self.task_id,
            "agent": self.agent_name,
            "result": {
                "parsed_data": parsed_data,
                "cleaned_data": cleaned_data,
                "quality_report": quality_report
            }
        }
        
        # 提交至驿传司
        response = requests.post(
            url=f"{YICHUANSI_API}receive_result",
            json={"agent_result": result, "sender": self.agent_name}
        )
        return response.json()


# 测试调用
if __name__ == "__main__":
    task_id = "T20260122100000_mijuanfang"
    mijuanfang = MijuanfangAgent(task_id)
    
    # 模拟原始素材
    raw_material = """| 项目阶段 | 计划完成时间 | 实际完成时间 | 进度偏差 | 资源投入 |
|----------|--------------|--------------|----------|----------|
| 需求调研 | 2026.01.10   | 2026.01.15   | +5天     | 3人      |
| 方案设计 | 2026.01.20   | 未开始       | 滞后     | 0人      |"""
    
    result = mijuanfang.run("分析项目进度滞后的原因", raw_material)
    print(json.dumps(result, ensure_ascii=False, indent=2))
