#!/usr/bin/env python3
"""
Antinet 技能可用性检查脚本
在自动化开发开始前检查所有需要的技能是否可用
"""

import os
import json
from pathlib import Path

def check_skills():
    """检查技能可用性"""
    
    print("=" * 60)
    print("Antinet 技能可用性检查")
    print("=" * 60)
    
    # 项目根目录
    project_root = Path(__file__).parent.parent
    auto_dir = project_root / "auto"
    skills_dir = project_root / "skills"
    
    results = {
        "builtin_skills": {},
        "local_skills": {},
        "overall_status": "ready"
    }
    
    # 1. 检查系统内置技能（标记为可用，实际由AI助手确认）
    print("\n📦 系统内置技能：")
    builtin_skills = ["pptx", "xlsx", "docx", "pdf"]
    for skill in builtin_skills:
        print(f"  ✅ {skill} - 由AI助手提供")
        results["builtin_skills"][skill] = "available"
    
    # 2. 检查本地技能文件
    print("\n📁 本地技能文件：")
    local_skills = [
        ("reddit-sentiment-analysis", "reddit-sentiment-analysis.skill"),
        ("hand-drawn-infographic", "hand-drawn-infographic.skill"),
        ("concept-sector-analysis", "concept-sector-analysis.skill"),
    ]
    
    for skill_name, filename in local_skills:
        skill_path = skills_dir / filename
        if skill_path.exists():
            print(f"  ✅ {skill_name} - 已安装")
            results["local_skills"][skill_name] = "available"
        else:
            print(f"  ⚠️  {skill_name} - 未找到（将使用替代方案）")
            results["local_skills"][skill_name] = "missing"
            results["overall_status"] = "partial"
    
    # 3. 输出总结
    print("\n" + "=" * 60)
    print("检查总结：")
    print("=" * 60)
    
    if results["overall_status"] == "ready":
        print("✅ 所有技能已就绪，可以开始自动化开发")
    else:
        print("⚠️  部分技能缺失，但可以使用替代方案继续")
        print("\n替代方案：")
        print("  - hand-drawn-infographic → 使用Python代码生成架构图")
        print("  - concept-sector-analysis → 使用WebSearch + xlsx进行市场分析")
    
    print("\n建议：")
    print("  1. 系统内置技能（pptx/xlsx/docx/pdf）已足够完成大部分任务")
    print("  2. AI助手会自动选择最佳方案完成任务")
    print("  3. 如需获取缺失技能文件，请从原始来源下载")
    
    # 保存检查结果
    result_file = auto_dir / "skills_check_result.json"
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n检查结果已保存到：{result_file}")
    
    return results

if __name__ == "__main__":
    check_skills()
