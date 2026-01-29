#!/usr/bin/env python3
"""
前端 MOCK 数据移除与真实 API 对接脚本
系统性地处理所有前端页面，移除 MOCK 数据，对接真实后端 API
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Tuple

# 前端源代码目录
FRONTEND_SRC = Path("C:/test/antinet/src")

# 需要处理的文件列表
TARGET_FILES = [
    "pages/Home.tsx",
    "pages/DataManagement.tsx",
    "pages/BatchProcess.tsx",
    "pages/ExcelAnalysis.tsx",
    "pages/PPTAnalysis.tsx",
    "pages/PDFAnalysis.tsx",
    "pages/PDFAnalysisEnhanced.tsx",
    "pages/AgentSystem.tsx",
    "pages/NPUAnalysis.tsx",
    "pages/NPUDashboard.tsx",
    "pages/SkillCenter.tsx",
    "components/GTDSystem.tsx",
    "components/TeamCollaboration.tsx",
    "components/TeamKnowledgeManagement.tsx",
    "components/AnalyticsReport.tsx",
    "components/LuhmannSystemChecklist.tsx",
    "components/FourColorCards.tsx",
    "components/DataAnalysisPanel.tsx",
    "components/ChatBotModal.tsx",
    "components/KnowledgeGraph.tsx",
]

# API 端点映射
API_MAPPINGS = {
    # 知识管理
    "knowledge_cards": {
        "endpoint": "/api/knowledge/cards",
        "methods": ["GET", "POST"],
        "mock_patterns": [r"mock.*cards", r"setCards\(\[.*?\]\)"],
    },
    "knowledge_search": {
        "endpoint": "/api/knowledge/search",
        "methods": ["POST"],
        "mock_patterns": [r"mock.*search"],
    },
    "knowledge_graph": {
        "endpoint": "/api/knowledge/graph",
        "methods": ["GET"],
        "mock_patterns": [r"mock.*graph"],
    },
    # GTD 任务
    "gtd_tasks": {
        "endpoint": "/api/data/gtd-tasks",
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "mock_patterns": [r"mock.*tasks", r"setTasks\(\[.*?\]\)"],
    },
    # 团队协作
    "team_collaboration": {
        "endpoint": "/api/mock/team/collaboration",
        "methods": ["GET"],
        "mock_patterns": [r"mock.*team", r"mock.*collaboration"],
    },
    # 分析报告
    "analytics_report": {
        "endpoint": "/api/mock/analytics/report",
        "methods": ["GET"],
        "mock_patterns": [r"mock.*analytics", r"mock.*report"],
    },
    # 检查清单
    "checklist": {
        "endpoint": "/api/data/checklist",
        "methods": ["GET", "PUT"],
        "mock_patterns": [r"mock.*checklist"],
    },
    # 数据文件
    "data_files": {
        "endpoint": "/api/data/activities",
        "methods": ["GET", "POST"],
        "mock_patterns": [r"setFiles\(\[.*?\]\)", r"mock.*files"],
    },
    # 批量处理
    "batch_tasks": {
        "endpoint": "/api/pdf/batch/process",
        "methods": ["POST"],
        "mock_patterns": [r"mockTasks", r"setTasks\(\[.*?\]\)"],
    },
    # Excel 分析
    "excel_data": {
        "endpoint": "/api/excel/export-analysis",
        "methods": ["POST"],
        "mock_patterns": [r"mockData", r"mockColumns"],
    },
    # Agent 系统
    "agent_status": {
        "endpoint": "/api/agent/status",
        "methods": ["GET"],
        "mock_patterns": [r"mock.*agent"],
    },
    # NPU 性能
    "npu_status": {
        "endpoint": "/api/npu/status",
        "methods": ["GET"],
        "mock_patterns": [r"mock.*npu"],
    },
    # 技能系统
    "skill_list": {
        "endpoint": "/api/skill/list",
        "methods": ["GET"],
        "mock_patterns": [r"mock.*skill"],
    },
}


def find_mock_data(file_path: Path) -> List[Tuple[int, str]]:
    """查找文件中的 MOCK 数据"""
    mock_lines = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        for i, line in enumerate(lines, 1):
            # 检查是否包含 MOCK 数据模式
            if any([
                re.search(r'mock[A-Z]', line, re.IGNORECASE),
                re.search(r'set\w+\(\[.*?\]\)', line),
                'Mock data' in line,
                'mock data' in line,
                '// Mock' in line,
                '/* Mock' in line,
            ]):
                mock_lines.append((i, line.strip()))
                
    except Exception as e:
        print(f"  ❌ 读取文件失败: {e}")
        
    return mock_lines


def generate_api_call(api_name: str, method: str = "GET") -> str:
    """生成 API 调用代码"""
    api_info = API_MAPPINGS.get(api_name)
    if not api_info:
        return ""
    
    endpoint = api_info["endpoint"]
    
    if method == "GET":
        return f"""
  useEffect(() => {{
    const fetchData = async () => {{
      try {{
        const response = await fetch(`${{API_BASE_URL}}{endpoint}`);
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        // 处理返回数据
        console.log('API 返回:', data);
      }} catch (error) {{
        console.error('API 调用失败:', error);
        toast.error('数据加载失败');
      }}
    }};
    
    fetchData();
  }}, []);
"""
    elif method == "POST":
        return f"""
  const handleSubmit = async (formData: any) => {{
    try {{
      const response = await fetch(`${{API_BASE_URL}}{endpoint}`, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(formData)
      }});
      
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      toast.success('操作成功');
      return data;
    }} catch (error) {{
      console.error('API 调用失败:', error);
      toast.error('操作失败');
    }}
  }};
"""
    
    return ""


def scan_frontend_files():
    """扫描所有前端文件，识别 MOCK 数据"""
    print("=" * 80)
    print("前端 MOCK 数据扫描报告")
    print("=" * 80)
    print()
    
    total_files = 0
    files_with_mock = 0
    total_mock_lines = 0
    
    results = []
    
    for file_rel in TARGET_FILES:
        file_path = FRONTEND_SRC / file_rel
        
        if not file_path.exists():
            print(f"⚠️  文件不存在: {file_rel}")
            continue
        
        total_files += 1
        mock_lines = find_mock_data(file_path)
        
        if mock_lines:
            files_with_mock += 1
            total_mock_lines += len(mock_lines)
            
            results.append({
                "file": file_rel,
                "mock_count": len(mock_lines),
                "lines": mock_lines
            })
            
            print(f"📄 {file_rel}")
            print(f"   发现 {len(mock_lines)} 处 MOCK 数据:")
            for line_num, line_content in mock_lines[:5]:  # 只显示前5个
                print(f"     L{line_num}: {line_content[:80]}...")
            if len(mock_lines) > 5:
                print(f"     ... 还有 {len(mock_lines) - 5} 处")
            print()
    
    print("=" * 80)
    print(f"扫描完成:")
    print(f"  - 扫描文件: {total_files}")
    print(f"  - 包含 MOCK: {files_with_mock}")
    print(f"  - MOCK 行数: {total_mock_lines}")
    print("=" * 80)
    print()
    
    return results


def generate_fix_plan(scan_results: List[Dict]):
    """生成修复计划"""
    print("=" * 80)
    print("前后端对接修复计划")
    print("=" * 80)
    print()
    
    for result in scan_results:
        file_name = result["file"]
        mock_count = result["mock_count"]
        
        print(f"📋 {file_name} ({mock_count} 处需修复)")
        print()
        
        # 根据文件名推断需要对接的 API
        if "Home" in file_name:
            print("  需要对接的 API:")
            print("    - GET /api/knowledge/cards (获取卡片列表)")
            print("    - POST /api/knowledge/cards (创建新卡片)")
            print("    - GET /api/knowledge/stats (获取统计信息)")
            print("    - POST /api/knowledge/search (搜索卡片)")
            print()
            
        elif "DataManagement" in file_name:
            print("  需要对接的 API:")
            print("    - GET /api/data/activities (获取文件列表)")
            print("    - POST /api/data/activities (上传文件)")
            print()
            
        elif "BatchProcess" in file_name:
            print("  需要对接的 API:")
            print("    - POST /api/pdf/batch/process (批量处理)")
            print("    - GET /api/analysis/list-analyses (获取处理状态)")
            print()
            
        elif "ExcelAnalysis" in file_name:
            print("  需要对接的 API:")
            print("    - POST /api/analysis/upload-and-analyze (上传并分析)")
            print("    - POST /api/excel/export-analysis (导出分析结果)")
            print()
            
        elif "GTDSystem" in file_name:
            print("  需要对接的 API:")
            print("    - GET /api/data/gtd-tasks (获取任务列表)")
            print("    - POST /api/data/gtd-tasks (创建任务)")
            print("    - PUT /api/data/gtd-tasks/{task_id} (更新任务)")
            print("    - DELETE /api/data/gtd-tasks/{task_id} (删除任务)")
            print()
            
        elif "TeamCollaboration" in file_name:
            print("  需要对接的 API:")
            print("    - GET /api/mock/team/collaboration (团队协作数据)")
            print("    - GET /api/data/team-members (团队成员)")
            print()
            
        elif "AgentSystem" in file_name:
            print("  需要对接的 API:")
            print("    - GET /api/agent/status (Agent 状态)")
            print("    - POST /api/agent/analyze (Agent 分析)")
            print("    - GET /api/agent/stats (Agent 统计)")
            print()
            
        elif "NPU" in file_name:
            print("  需要对接的 API:")
            print("    - GET /api/npu/status (NPU 状态)")
            print("    - GET /api/npu/benchmark (NPU 基准测试)")
            print()
            
        elif "SkillCenter" in file_name:
            print("  需要对接的 API:")
            print("    - GET /api/skill/list (技能列表)")
            print("    - GET /api/skill/categories (技能分类)")
            print("    - POST /api/skill/execute (执行技能)")
            print()
            
        elif "ChatBot" in file_name:
            print("  需要对接的 API:")
            print("    - POST /api/chat/query (聊天查询)")
            print("    - GET /api/chat/cards (获取卡片)")
            print("    - POST /api/chat/search (搜索)")
            print()
            
        print()
    
    print("=" * 80)
    print()


def main():
    """主函数"""
    print()
    print("🚀 开始前端 MOCK 数据扫描与修复计划生成...")
    print()
    
    # 扫描前端文件
    scan_results = scan_frontend_files()
    
    # 生成修复计划
    if scan_results:
        generate_fix_plan(scan_results)
        
        print("✅ 扫描完成！")
        print()
        print("下一步操作:")
        print("  1. 启动后端服务: cd backend && python main.py")
        print("  2. 测试 API 端点: python test_api_endpoints.py")
        print("  3. 逐个修复前端页面，移除 MOCK 数据")
        print("  4. 测试前端功能，确保正常工作")
        print()
    else:
        print("✅ 未发现 MOCK 数据，前端已完全对接后端 API！")
        print()


if __name__ == "__main__":
    main()
