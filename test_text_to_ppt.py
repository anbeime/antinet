"""
测试从文本生成 PPT 功能
"""
import sys
import os

# 添加 backend 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from tools.ppt_processor import PPTProcessor

# 测试内容（Markdown 格式）
test_content = """
# 产品发布计划

欢迎参加我们的产品发布会

## 项目概述

### 背景
我们正在开发一款创新的产品

### 目标
- 提升用户体验
- 增加市场份额
- 实现可持续增长

## 核心功能

### 功能一：智能分析
使用 AI 技术进行数据分析

### 功能二：自动化流程
- 自动生成报告
- 智能推荐
- 实时监控

### 功能三：协作平台
团队可以实时协作，共享资源

## 时间规划

1. 第一阶段：需求分析（2周）
2. 第二阶段：开发实现（6周）
3. 第三阶段：测试优化（2周）
4. 第四阶段：正式发布（1周）

## 总结

感谢大家的支持！
"""

def test_text_to_ppt():
    """测试文本转 PPT"""
    print("开始测试文本转 PPT 功能...")
    
    try:
        # 创建处理器
        processor = PPTProcessor()
        print("✓ PPT 处理器初始化成功")
        
        # 生成 PPT
        output_path = "C:\\test\\test_generated_presentation.pptx"
        result_path = processor.create_from_text(
            content=test_content,
            output_path=output_path,
            title="产品发布计划",
            theme="professional"
        )
        
        print(f"✓ PPT 生成成功: {result_path}")
        
        # 测试不同主题
        themes = ["creative", "minimal"]
        for theme in themes:
            theme_output = f"C:\\test\\test_generated_{theme}.pptx"
            processor.create_from_text(
                content=test_content,
                output_path=theme_output,
                title=f"产品发布计划 - {theme.upper()}",
                theme=theme
            )
            print(f"✓ {theme} 主题 PPT 生成成功: {theme_output}")
        
        print("\n所有测试通过！")
        return True
        
    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_text_to_ppt()
    sys.exit(0 if success else 1)
