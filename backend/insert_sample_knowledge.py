#!/usr/bin/env python3
"""
插入示例知识卡片到数据库
为聊天机器人提供基础知识库
"""
import sqlite3
from pathlib import Path
from datetime import datetime
import json

# 数据库路径
DB_PATH = Path(__file__).parent.parent / "data" / "antinet.db"

# 示例知识卡片数据
sample_cards = [
    {
        "title": "Antinet系统核心功能",
        "content": json.dumps({
            "description": "知易智能知识管家是一个基于骁龙X Elite AIPC平台的端侧智能数据中枢与协同分析平台。核心功能包括：1. 自然语言驱动的数据分析 - 通过NPU加速的轻量化大模型实现智能分析；2. 四色卡片知识管理 - 事实(蓝)、解释(绿)、风险(黄)、行动(红)分类管理；3. NPU性能监控 - 实时监控推理延迟、吞吐量等指标；4. 团队协作 - 支持多人协作、任务管理、知识共享。所有数据处理在本地完成，保障数据隐私，符合数据不出域原则。",
            "details": ["8-Agent系统协作", "NPU加速推理", "本地数据处理", "知识图谱可视化"]
        }),
        "type": "blue",
        "category": "事实"
    },
    {
        "title": "如何启动Antinet系统",
        "content": json.dumps({
            "description": "启动Antinet系统需要以下步骤：1. 确保Python 3.12已安装；2. 安装QAI AppBuilder 2.31.0；3. 安装所有依赖包（pip install -r backend/requirements.txt）；4. 启动后端服务（cd backend && python main.py）；5. 启动前端服务（在项目根目录运行 pnpm dev）。启动成功后，前端访问 http://localhost:5173，后端API访问 http://localhost:8000。",
            "steps": ["验证Python环境", "安装依赖", "启动后端", "启动前端"]
        }),
        "type": "blue",
        "category": "事实"
    },
    {
        "title": "NPU推理性能优化",
        "content": json.dumps({
            "description": "NPU（Neural Processing Unit）是专门为AI推理设计的处理器，相比CPU和GPU具有显著优势：1. 专用硬件加速 - 专门为神经网络运算优化；2. 低功耗 - 功耗远低于GPU（< 5W vs > 100W）；3. 低延迟 - 推理时间通常在100-500ms；4. 高吞吐量 - 可达20+ tokens/s。Antinet使用Qwen2.0-7B-SSD模型，通过INT8量化，在NPU上运行可达到4x以上的CPU加速比。",
            "optimization": ["模型量化", "算子融合", "批处理优化", "Burst模式"]
        }),
        "type": "green",
        "category": "解释"
    },
    {
        "title": "NPU vs CPU性能对比",
        "content": json.dumps({
            "description": "在骁龙X Elite AIPC上实测数据：1. Qwen2.0-7B-SSD模型推理延迟：NPU ~400ms，CPU ~1700ms（加速比4.2x）；2. llama3.2-3b推理延迟：NPU ~280ms，CPU ~1500ms（加速比5.3x）；3. llama3.1-8b推理延迟：NPU ~520ms，CPU ~2000ms（加速比3.8x）。内存占用方面：NPU约1.5GB，CPU约2.5GB。NPU的优势在端侧推理场景下非常明显，能够满足<500ms的实时响应要求。",
            "metrics": {
                "qwen_npu": 400,
                "qwen_cpu": 1700,
                "speedup": 4.2
            }
        }),
        "type": "blue",
        "category": "事实"
    },
    {
        "title": "四色卡片系统设计",
        "content": json.dumps({
            "description": "四色卡片系统是Antinet的核心知识管理方式，通过颜色分类来管理不同类型的信息：蓝色(事实) - 客观事实、数据指标、系统功能；绿色(解释) - 原因分析、原理说明、技术细节；黄色(风险) - 潜在问题、风险预警、注意事项；红色(行动) - 行动建议、操作步骤、待办事项。这种分类方式帮助用户快速识别和处理信息，提高决策效率。",
            "color_meaning": {
                "blue": "事实 - 客观事实和数据",
                "green": "解释 - 原因和原理",
                "yellow": "风险 - 潜在问题和警告",
                "red": "行动 - 建议和操作步骤"
            }
        }),
        "type": "green",
        "category": "解释"
    },
    {
        "title": "如何创建和管理知识卡片",
        "content": json.dumps({
            "description": "创建知识卡片可以通过以下方式：1. 通过数据分析自动生成 - 上传Excel/CSV数据，系统自动分析生成四色卡片；2. 手动创建 - 在知识管理页面选择卡片类型，填写标题和内容；3. PDF导入 - 上传PDF文档，系统自动提取知识点生成卡片；4. PPT导入 - 从PowerPoint演示文稿中提取知识卡片。管理功能包括：搜索、过滤、编辑、删除、导出等。卡片支持标签分类、相似度计算和知识图谱可视化。",
            "creation_methods": ["数据分析生成", "手动创建", "PDF导入", "PPT导入"]
        }),
        "type": "red",
        "category": "行动"
    },
    {
        "title": "团队协作功能",
        "content": json.dumps({
            "description": "Antinet支持完整的团队协作功能：1. 团队成员管理 - 添加/移除成员，设置角色和权限；2. 知识空间共享 - 创建共享知识空间，成员可以共同管理和查看知识；3. 协作活动记录 - 记录所有协作活动，包括创建、编辑、评论等；4. 评论和讨论 - 支持对知识卡片、报告等进行评论和讨论；5. 任务分配 - 通过GTD系统分配和跟踪任务。所有协作数据保存在本地数据库，支持多人同时使用。",
            "features": ["成员管理", "知识共享", "活动记录", "评论系统", "任务管理"]
        }),
        "type": "blue",
        "category": "事实"
    },
    {
        "title": "数据安全与隐私保护",
        "content": json.dumps({
            "description": "Antinet严格遵循'数据不出域'原则，所有数据处理在本地完成：1. 数据存储 - 所有数据保存在本地SQLite数据库；2. 推理本地化 - NPU模型推理在本地设备执行，无需云端调用；3. 无第三方依赖 - 不使用第三方数据分析或存储服务；4. 端侧部署 - 模型和应用部署在本地AIPC设备上。这种架构确保了敏感数据不会离开用户设备，符合数据隐私保护法规（如GDPR、个人信息保护法等）。",
            "security_measures": ["本地存储", "本地推理", "无第三方", "端侧部署"]
        }),
        "type": "yellow",
        "category": "风险"
    },
    {
        "title": "支持的数据格式",
        "content": json.dumps({
            "description": "Antinet支持多种数据格式的导入和分析：1. Excel (.xlsx, .xls) - 支持多工作表、公式的Excel文件导入，自动生成四色卡片；2. CSV - 逗号分隔值文件，适合结构化数据；3. PDF - 支持文本提取、表格识别、知识点自动提取；4. PPT/PPTX - PowerPoint演示文稿，支持从幻灯片中提取知识点；5. 文本文件 - .txt, .md等纯文本格式；6. 数据库 - 支持SQLite数据库直接查询。导入的数据会自动进行分类和分析，生成相应的知识卡片。",
            "formats": ["Excel", "CSV", "PDF", "PPT", "文本", "数据库"]
        }),
        "type": "blue",
        "category": "事实"
    },
    {
        "title": "如何进行数据分析",
        "content": json.dumps({
            "description": "Antinet提供智能数据分析功能，步骤如下：1. 上传数据 - 支持Excel、CSV等格式的数据文件；2. 数据预览 - 系统自动识别数据结构和类型；3. NPU分析 - 使用本地NPU模型进行数据分析和推理；4. 生成报告 - 自动生成四色卡片分析报告（事实、解释、风险、行动）；5. 可视化 - 提供图表可视化（折线图、柱状图、饼图等）；6. 导出结果 - 支持导出为PPT、PDF、Excel等格式。整个分析过程在本地完成，推理延迟<500ms，数据不出域。",
            "steps": ["上传数据", "数据预览", "NPU分析", "生成报告", "可视化", "导出结果"]
        }),
        "type": "red",
        "category": "行动"
    },
    {
        "title": "系统API接口文档",
        "content": json.dumps({
            "description": "Antinet提供丰富的RESTful API接口：1. 数据分析 - /api/analysis/analyze-existing, /api/analysis/upload-and-analyze；2. 知识管理 - /api/knowledge/cards, /api/knowledge/search, /api/knowledge/import；3. NPU性能 - /api/npu/benchmark, /api/npu/status, /api/npu/analyze；4. 聊天机器人 - /api/chat/query, /api/chat/search, /api/chat/health；5. 技能系统 - /api/skill/list, /api/skill/execute, /api/skill/stats；6. 团队协作 - /api/data/team-members, /api/data/activities, /api/data/comments。完整的API文档可以通过访问 http://localhost:8000/docs 查看。",
            "api_categories": ["数据分析", "知识管理", "NPU性能", "聊天机器人", "技能系统", "团队协作"]
        }),
        "type": "blue",
        "category": "事实"
    },
    {
        "title": "常见问题排查",
        "content": json.dumps({
            "description": "常见问题和解决方案：1. 后端启动失败 - 检查Python版本是否为3.12，检查QAI AppBuilder是否安装；2. NPU推理失败 - 确认NPU驱动已安装，检查模型路径是否正确；3. 前端无法连接后端 - 确认后端服务运行在8000端口，检查CORS配置；4. 数据库连接失败 - 检查数据库文件权限，确认目录存在；5. 性能不达标 - 尝试切换到Burst模式，减少生成的token数量；6. 知识卡片未生成 - 检查数据格式是否正确，确认有足够的数据量。",
            "common_issues": {
                "backend": "检查Python环境和依赖",
                "npu": "确认NPU驱动和模型",
                "frontend": "检查后端连接和CORS",
                "database": "检查文件权限",
                "performance": "切换Burst模式",
                "cards": "检查数据格式"
            }
        }),
        "type": "yellow",
        "category": "风险"
    }
]

def insert_sample_knowledge():
    """插入示例知识卡片到数据库"""
    try:
        # 连接数据库
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 清空现有数据（可选）
        cursor.execute("DELETE FROM knowledge_cards")
        print(f"已清空 knowledge_cards 表")

        # 插入示例卡片
        inserted_count = 0
        for card_data in sample_cards:
            cursor.execute("""
                INSERT INTO knowledge_cards (title, content, card_type, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                card_data["title"],
                card_data["content"],
                card_data["type"],
                card_data["category"],
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            inserted_count += 1
            print(f"[OK] Inserted: {card_data['title']} ({card_data['category']} - {card_data['type']})")

        # 提交更改
        conn.commit()

        # 验证插入
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total = cursor.fetchone()[0]

        conn.close()

        print(f"\n[SUCCESS] Successfully inserted {inserted_count} knowledge cards")
        print(f"[SUCCESS] Total cards in database: {total}")
        print("\nSample card topics:")
        for i, card in enumerate(sample_cards[:5], 1):
            print(f"  {i}. {card['title']}")
        if len(sample_cards) > 5:
            print(f"  ... and {len(sample_cards) - 5} more cards")

        print("\n[SUCCESS] Knowledge base initialized. Chatbot is now ready!")

    except Exception as e:
        print(f"[ERROR] Failed to insert knowledge cards: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("Antinet 知识库初始化脚本")
    print("=" * 60)
    print(f"数据库路径: {DB_PATH}")
    print()

    insert_sample_knowledge()
