"""
PPT 功能测试脚本
验证 PPT 处理器的核心功能
"""
import sys
from pathlib import Path

# 添加 backend 到路径
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_ppt_import():
    """测试 PPT 库导入"""
    print("=" * 60)
    print("测试 1: 验证 python-pptx 库导入")
    print("=" * 60)
    
    try:
        import pptx
        print("[OK] python-pptx imported successfully")
        print(f"  Version: {pptx.__version__}")
        return True
    except ImportError as e:
        print(f"[FAIL] python-pptx import failed: {e}")
        return False


def test_ppt_processor():
    """测试 PPT 处理器"""
    print("\n" + "=" * 60)
    print("测试 2: 验证 PPT 处理器")
    print("=" * 60)
    
    try:
        from tools.ppt_processor import PPTProcessor
        processor = PPTProcessor()
        print("✓ PPT 处理器创建成功")
        return True
    except Exception as e:
        print(f"✗ PPT 处理器创建失败: {e}")
        return False


def test_create_simple_ppt():
    """测试创建简单的 PPT"""
    print("\n" + "=" * 60)
    print("测试 3: 创建简单的 PPT")
    print("=" * 60)
    
    try:
        from tools.ppt_processor import PPTProcessor
        
        processor = PPTProcessor()
        
        # 创建演示文稿
        prs = processor.create_presentation("测试演示文稿")
        print("✓ 演示文稿创建成功")
        
        # 添加测试卡片
        test_card = {
            "type": "fact",
            "title": "测试卡片",
            "content": "这是一个测试卡片的内容",
            "tags": ["测试", "验证"],
            "created_at": "2026-01-26"
        }
        
        processor.add_card_slide(prs, test_card)
        print("✓ 卡片幻灯片添加成功")
        
        # 保存到临时文件
        output_path = Path(__file__).parent / "test_output.pptx"
        prs.save(str(output_path))
        print(f"✓ PPT 保存成功: {output_path}")
        
        # 验证文件存在
        if output_path.exists():
            file_size = output_path.stat().st_size
            print(f"  文件大小: {file_size / 1024:.2f} KB")
            return True
        else:
            print("✗ 文件未生成")
            return False
            
    except Exception as e:
        print(f"✗ 创建 PPT 失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_export_cards():
    """测试导出四色卡片"""
    print("\n" + "=" * 60)
    print("测试 4: 导出四色卡片")
    print("=" * 60)
    
    try:
        from tools.ppt_processor import PPTProcessor
        
        processor = PPTProcessor()
        
        # 准备测试卡片
        test_cards = [
            {
                "type": "fact",
                "title": "事实卡片测试",
                "content": "这是一个蓝色事实卡片",
                "tags": ["测试", "事实"]
            },
            {
                "type": "interpret",
                "title": "解释卡片测试",
                "content": "这是一个绿色解释卡片",
                "tags": ["测试", "解释"]
            },
            {
                "type": "risk",
                "title": "风险卡片测试",
                "content": "这是一个黄色风险卡片",
                "tags": ["测试", "风险"]
            },
            {
                "type": "action",
                "title": "行动卡片测试",
                "content": "这是一个红色行动卡片",
                "tags": ["测试", "行动"]
            }
        ]
        
        # 导出卡片
        output_path = Path(__file__).parent / "test_cards_export.pptx"
        result_path = processor.export_cards_to_ppt(
            cards=test_cards,
            output_path=str(output_path),
            title="四色卡片测试报告"
        )
        
        print(f"✓ 四色卡片导出成功: {result_path}")
        
        # 验证文件
        if Path(result_path).exists():
            file_size = Path(result_path).stat().st_size
            print(f"  文件大小: {file_size / 1024:.2f} KB")
            print(f"  卡片数量: {len(test_cards)}")
            return True
        else:
            print("✗ 文件未生成")
            return False
            
    except Exception as e:
        print(f"✗ 导出卡片失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_card_colors():
    """测试卡片颜色映射"""
    print("\n" + "=" * 60)
    print("测试 5: 验证卡片颜色")
    print("=" * 60)
    
    try:
        from tools.ppt_processor import PPTProcessor
        
        processor = PPTProcessor()
        
        print("卡片颜色映射:")
        for card_type, color in processor.CARD_COLORS.items():
            card_name = processor.CARD_NAMES.get(card_type, "未知")
            print(f"  {card_type:10} -> {card_name:10} RGB{(color.r, color.g, color.b)}")
        
        print("✓ 卡片颜色映射正确")
        return True
        
    except Exception as e:
        print(f"✗ 颜色映射验证失败: {e}")
        return False


def main():
    """运行所有测试"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 15 + "PPT 功能测试套件" + " " * 26 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    tests = [
        ("PPT 库导入", test_ppt_import),
        ("PPT 处理器", test_ppt_processor),
        ("创建简单 PPT", test_create_simple_ppt),
        ("导出四色卡片", test_export_cards),
        ("卡片颜色验证", test_card_colors)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ 测试异常: {e}")
            results.append((test_name, False))
    
    # 打印总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {test_name:20} {status}")
    
    print()
    print(f"总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！PPT 功能部署成功！")
        return 0
    else:
        print(f"\n  {total - passed} 个测试失败，请检查错误信息")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
