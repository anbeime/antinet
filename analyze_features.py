"""
知易系统 - 缺失功能清单
对比用户场景需求，列出还需实现的功能
"""

MISSING_FEATURES = {
    "高优先级": [
        {
            "功能": "智能关联建议",
            "场景": "系统自动发现'二三线城市增速'+'短视频使用习惯'+'价格敏感度'可能有关联",
            "实现方案": "在wiki/semantic.py中添加相似度检测，当多张卡片多次同时被引用时提示可能关联",
            "文件": "需要新增 api/wiki/suggest-relations"
        },
        {
            "功能": "PPT模板生成", 
            "场景": "选择68张核心卡片，一键生成问题-解决方案-证据链PPT",
            "实现方案": "利用已安装的python-pptx，从卡片批量生成幻灯片",
            "文件": "需要新增 services/ppt_generator.py 或扩展 ppt_routes"
        },
        {
            "功能": "日历提醒提取", 
            "场景": "从卡片'周三竞品分析会''周五核心功能评审'自动生成日历提醒",
            "实现方案": "用正则提取时间短语，生成gtd_tasks带due_date",
            "文件": "wiki/compiler.py 中增强时间提取"
        }
    ],
    "中优先级": [
        {
            "功能": "思维导图生成",
            "场景": "点击'生成思维导图'，12张卡片作为初始节点自动排布",
            "实现方案": "使用D3.js force-directed layout",
            "文件": "src/components/MindMapView.tsx (新组件)"
        },
        {
            "功能": "卡片版本历史",
            "场景": "每个卡片显示修改历史、评论记录",
            "实现方案": "knowledge_cards已有updated_at，增加history表或versioning",
            "文件": "扩展 knowledge_routes"
        },
        {
            "功能": "项目知识包导出",
            "场景": "整个项目的卡片+专题+讨论+输出打包",
            "实现方案": "ZIP打包整个data/wiki/{project}/目录",
            "文件": "需要新增 api/wiki/export-package"
        }
    ],
    "低优先级": [
        {
            "功能": "API网页嵌入",
            "场景": "生成可嵌入iframe的网页版知识包",
            "实现方案": "静态HTML生成+内嵌播放器",
        },
        {
            "功能": "语音笔记转卡片",
            "场景": "语音输入直接生成卡片",
            "实现方案": "需要语音识别服务"
        }
    ]
}

# 快速实现建议
QUICK_WINS = """
1. 智能关联建议（1天）
   - 在wiki/semantic.py添加similarity_threshold检测
   - 当多卡片被同一专题引用时计算共现频率
   - 高于阈值则提示用户确认关联

2. PPT生成（2天）
   - 复用python-pptx已有库
   - 定义三套模板：问题-方案-证据、市场-产品-执行、故事-亮点-影响
   - 从选定卡片提取title/content填充幻灯片

3. 日历提醒（0.5天）
   - 在compile_page时用正则提取时间
   - r'(周[一二三四五六日]|今天|明天|后天|\d+月\d+日|\d+/\d+)'
   - 自动创建gtd_tasks带reminder
"""

print("=== 缺失功能清单 ===")
for priority, features in MISSING_FEATURES.items():
    print(f"\n{priority}:")
    for f in features:
        print(f"  - {f['功能']}: {f['场景'][:50]}...")