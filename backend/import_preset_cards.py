#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导入预设知识卡片到数据库
将原来硬编码的37张卡片导入到 knowledge_cards 表
"""
import sqlite3
from pathlib import Path
from datetime import datetime

# 数据库路径
DB_PATH = Path("C:/test/antinet/backend/data/antinet.db")

# 预设的四色卡片知识库（从原 chat_routes.py 复制）
PRESET_KNOWLEDGE_CARDS = [
    # 蓝色卡片 - 事实
    {
        "title": "Antinet系统概述",
        "content": "Antinet智能知识管家是一款部署于骁龙AIPC的端侧智能数据工作站，通过集成NPU加速的轻量化大模型，实现自然语言驱动的数据查询、自动数据分析与可视化、四色卡片知识沉淀、数据不出域、NPU加速推理等功能。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "核心价值",
        "content": "效率提升70%（数据分析从数小时缩短到分钟级）、安全可控（端侧处理，企业数据不出域）、知识沉淀（分析结果可追溯、可协作、可复用）。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "技术架构",
        "content": "前端使用React 18 + TypeScript + Vite，后端使用FastAPI 0.109 + Python，AI推理使用QAI AppBuilder，模型为Qwen2-1.5B（INT8量化），数据库为SQLite + DuckDB。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "NPU性能指标",
        "content": "使用Qwen2.0-7B-SSD模型，推理延迟约450ms，目标延迟<500ms，运行在骁龙Hexagon NPU（HTP后端），CPU vs NPU加速比4.2x。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "异构计算架构",
        "content": "NPU负责核心模型推理（60-70%算力占用），CPU负责控制逻辑和数据预处理（20%），GPU负责图像处理和并行计算（10%）。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "8-Agent协作架构",
        "content": "包括锦衣卫总指挥使（任务分解与调度）、密卷房（数据预处理）、通政司（事实提取）、监察院（解释生成）、刑狱司（风险识别）、参谋司（行动建议）、太史阁（知识存储）、驿传司（结果整合）。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "四色卡片系统",
        "content": "蓝色卡片-事实（核心概念）、绿色卡片-解释（关联链接）、黄色卡片-风险（参考来源）、红色卡片-行动（索引关键词）。基于卢曼卡片盒笔记法实现知识管理。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "访问地址",
        "content": "前端首页http://localhost:3000、NPU智能分析http://localhost:3000/npu-analysis、后端API http://localhost:8000、API文档http://localhost:8000/docs",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "一键启动",
        "content": "运行start_all.bat可一键启动后端（8000端口）和前端（3000端口）服务，包括健康检查。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "数据本地化",
        "content": "所有数据存储在本地SQLite数据库中，数据不出域，企业数据完全在本地处理，保障隐私安全。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "比赛信息",
        "content": "参加2025骁龙人工智能创新应用大赛，AIPC赛道-通用赛，项目名称：Antinet智能知识管家。",
        "category": "事实",
        "card_type": "blue"
    },
    {
        "title": "团队成员管理",
        "content": "系统支持添加团队成员、分配角色（管理员/编辑/查看者）、设置权限，可以查看成员在线状态和贡献度。",
        "category": "事实",
        "card_type": "blue"
    },
    
    # 绿色卡片 - 解释
    {
        "title": "为什么使用Antinet",
        "content": "Antinet基于卢曼卡片盒笔记法，采用四色卡片（事实/解释/风险/行动）进行知识组织，帮助团队更好地管理和分享知识。通过NPU加速实现端侧智能处理，保障数据安全的同时提升效率。",
        "category": "解释",
        "card_type": "green"
    },
    {
        "title": "为什么选择NPU",
        "content": "NPU专用硬件带来性能提升4.2x（vs CPU）、功耗降低60%、延迟<500ms实时响应。相比CPU和GPU，NPU在AI推理任务上更加高效节能。",
        "category": "解释",
        "card_type": "green"
    },
    {
        "title": "为什么使用端侧AI",
        "content": "数据隐私保护（数据不出域）、实时响应能力（无需网络传输）、离线可用性（不依赖网络连接）、成本优势（无需云端计算费用）。",
        "category": "解释",
        "card_type": "green"
    },
    {
        "title": "8-Agent架构优势",
        "content": "通过模块化智能处理实现精准数据分析，包括数据提取模块（自动对接本地数据源）、分析推理模块（基于NPU生成四色卡片）、可视化生成模块（自动匹配图表类型）、质量校验模块（逻辑与数据双重校验）。",
        "category": "解释",
        "card_type": "green"
    },
    {
        "title": "四色卡片方法论",
        "content": "蓝色卡片记录客观事实（如销量、增长率），绿色卡片解释原因（如数据波动背后的原因），黄色卡片识别风险（如库存不足预警），红色卡片提供行动建议（如调整定价、补充库存）。",
        "category": "解释",
        "card_type": "green"
    },
    {
        "title": "技术选型理由",
        "content": "前端使用React/Vite获得快速开发和良好用户体验，后端使用FastAPI获得高性能异步API，使用SQLite获得简单可靠的本地存储，使用Qwen2模型获得端侧AI推理能力，使用NPU实现硬件加速。",
        "category": "解释",
        "card_type": "green"
    },
    {
        "title": "知识图谱优势",
        "content": "跨卡片语义分析构建知识网络（如销售下滑关联竞品降价），实现知识自动关联与图谱构建，支持检索优化（优先返回高关联度卡片）和归档整理（自动标记无效/重复卡片）。",
        "category": "解释",
        "card_type": "green"
    },
    {
        "title": "模型量化说明",
        "content": "Qwen2模型使用INT8量化在骁龙NPU上运行，相比FP16减少50%内存占用同时保持较高精度。通过QAI AppBuilder将模型转换为QNN格式，充分利用NPU硬件特性。",
        "category": "解释",
        "card_type": "green"
    },
    
    # 黄色卡片 - 风险
    {
        "title": "数据备份风险",
        "content": "当前版本数据存储在本地SQLite数据库中，请注意定期备份数据库文件（backend/data/antinet.db），否则可能造成数据丢失。风险等级：高",
        "category": "风险",
        "card_type": "yellow"
    },
    {
        "title": "后端API依赖",
        "content": "前端功能完全依赖于后端API，如果后端服务未启动（端口8000）或NPU未正确加载，前端将无法正常加载数据和使用AI功能。风险等级：高",
        "category": "风险",
        "card_type": "yellow"
    },
    {
        "title": "NPU环境依赖",
        "content": "NPU功能需要ARM64 Python环境、正确的QAI AppBuilder版本（2.38.0）、模型文件路径配置（C:/model/Qwen2.0-7B-SSD-8380-2.34/）和DLL路径配置，配置错误会导致NPU不可用。风险等级：中",
        "category": "风险",
        "card_type": "yellow"
    },
    {
        "title": "性能延迟风险",
        "content": "如果NPU推理延迟超过500ms目标，会影响用户体验。需要启用BURST性能模式或切换到更小的模型（如Qwen2-1.5B）。风险等级：中",
        "category": "风险",
        "card_type": "yellow"
    },
    {
        "title": "端口占用风险",
        "content": "如果8000或3000端口被其他程序占用，服务将无法启动。使用netstat -ano | findstr :8000检查端口占用情况。风险等级：低",
        "category": "风险",
        "card_type": "yellow"
    },
    {
        "title": "文件格式限制",
        "content": "当前仅支持Markdown和文本文件导入，PDF/Excel/Word文件需要后端API支持（开发中）。导入不支持的文件格式会导致解析失败。风险等级：低",
        "category": "风险",
        "card_type": "yellow"
    },
    {
        "title": "团队协作风险",
        "content": "知识空间的数据目前存储在本地，团队成员之间无法直接共享数据。需要手动导出导入或使用外部同步工具。风险等级：中",
        "category": "风险",
        "card_type": "yellow"
    },
    {
        "title": "模型加载失败风险",
        "content": "如果QNN库路径配置错误或DLL文件缺失，模型加载会失败。需要检查PATH环境变量和DLL依赖。风险等级：高",
        "category": "风险",
        "card_type": "yellow"
    },
    
    # 红色卡片 - 行动
    {
        "title": "启动后端服务",
        "content": "方法1：运行start_all.bat一键启动。方法2：cd backend && python main.py启动后端服务，默认运行在8000端口。启动后访问http://localhost:8000/api/health验证服务状态。优先级：高",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "启动前端服务",
        "content": "方法1：运行start_all.bat一键启动。方法2：在项目根目录运行npm run dev，默认运行在3000端口。访问http://localhost:3000查看前端界面。优先级：高",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "验证NPU环境",
        "content": "运行verify-npu-on-aipc.ps1脚本自动检查Python版本、QAI AppBuilder安装、模型文件存在性、QNN库文件完整性和NPU性能测试。或运行python simple_npu_test_v2.py手动测试。优先级：中",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "优化NPU性能",
        "content": "方案1（推荐）：启用BURST性能模式。方案2：切换到更小模型（Qwen2-1.5B或Llama3.2-3B）。方案3：减少max_tokens到16-32。方案4：使用INT4进一步量化。优先级：高",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "备份数据",
        "content": "定期备份backend/data/antinet.db数据库文件。可以手动复制到安全位置，或设置自动备份脚本。备份前停止后端服务以防数据损坏。优先级：高",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "检查API文档",
        "content": "访问http://localhost:8000/docs查看完整的Swagger API文档，了解所有可用的API端点和参数。在开发新功能前先阅读API文档确保正确使用。优先级：低",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "导入知识卡片",
        "content": "在前端点击导入按钮，选择Markdown或文本文件导入。系统会自动解析文件内容并生成知识卡片。导入前确保文件格式正确，内容清晰。优先级：中",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "使用聊天机器人",
        "content": "点击右下角机器人图标打开聊天窗口，输入问题如'如何启动系统'、'NPU性能如何'等，系统会基于知识库四色卡片回答您的问题。优先级：低",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "查看分析报告",
        "content": "在前端数据分析页面输入自然语言查询如'分析上个月的销售趋势'，系统会自动提取数据、生成四色卡片分析、创建可视化图表并生成完整报告。优先级：中",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "团队协作设置",
        "content": "在团队成员管理页面添加成员、分配角色（管理员/编辑/查看者）、设置空间权限。管理员可以查看成员在线状态和贡献度，监控团队活动。优先级：中",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "排查启动问题",
        "content": "如果服务启动失败：1.检查端口占用（netstat -ano | findstr :8000）2.查看后端日志（backend.log）3.验证Python环境（python --version）4.检查依赖安装（pip list）。优先级：高",
        "category": "行动",
        "card_type": "red"
    },
    {
        "title": "更新系统依赖",
        "content": "定期更新系统依赖：1.后端依赖（pip install -r requirements.txt --upgrade）2.前端依赖（npm update）3.检查QAI AppBuilder版本。优先级：低",
        "category": "行动",
        "card_type": "red"
    }
]

def import_cards():
    """导入预设卡片到数据库"""
    try:
        # 连接数据库
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 检查现有卡片数量
        cursor.execute('SELECT COUNT(*) FROM knowledge_cards')
        existing_count = cursor.fetchone()[0]
        print(f"数据库中现有卡片数量: {existing_count}")
        
        # 清空现有卡片（自动模式）
        if existing_count > 0:
            print(f"检测到现有 {existing_count} 张卡片，将追加导入新卡片")
            # 不清空，直接追加
        
        # 插入预设卡片
        inserted = 0
        for card in PRESET_KNOWLEDGE_CARDS:
            try:
                cursor.execute("""
                    INSERT INTO knowledge_cards (title, content, category, card_type, similarity, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    card['title'],
                    card['content'],
                    card['category'],
                    card['card_type'],
                    0.9,  # 默认相似度
                    datetime.now().isoformat()
                ))
                inserted += 1
            except Exception as e:
                print(f"插入卡片失败: {card['title']} - {e}")
        
        conn.commit()
        print(f"\n[OK] 成功导入 {inserted} 张卡片到数据库")
        
        # 验证导入结果
        cursor.execute('SELECT COUNT(*) FROM knowledge_cards')
        total_count = cursor.fetchone()[0]
        print(f"数据库中总卡片数量: {total_count}")
        
        # 显示各类型卡片数量
        cursor.execute("""
            SELECT card_type, COUNT(*) 
            FROM knowledge_cards 
            GROUP BY card_type
        """)
        print("\n各类型卡片数量:")
        for row in cursor.fetchall():
            type_name = {
                'blue': '蓝色（事实）',
                'green': '绿色（解释）',
                'yellow': '黄色（风险）',
                'red': '红色（行动）'
            }.get(row[0], row[0])
            print(f"  {type_name}: {row[1]}张")
        
        conn.close()
        
    except Exception as e:
        print(f"[ERROR] 导入失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("=" * 60)
    print("导入预设知识卡片到数据库")
    print("=" * 60)
    print()
    import_cards()
    print()
    print("=" * 60)
    print("导入完成！")
    print("=" * 60)
