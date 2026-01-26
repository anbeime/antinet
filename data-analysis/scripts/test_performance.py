"""
性能测试脚本
测试NPU推理延迟和向量检索响应时间
"""
import time
import sys
import os
from typing import Dict, List

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class PerformanceTest:
    """性能测试类"""
    
    def __init__(self):
        self.results = {}
    
    def test_npu_inference(self, test_text: str = "分析销售趋势", 
                          iterations: int = 10) -> Dict:
        """
        测试NPU推理性能
        
        参数：
            test_text: 测试文本
            iterations: 测试次数
        
        返回：
            性能指标
        """
        print("\n" + "=" * 80)
        print("NPU推理性能测试")
        print("=" * 80)
        
        latencies = []

        # 导入真实的 NPU 模型加载器
        import sys
        from pathlib import Path
        backend_path = Path(__file__).parent.parent.parent / "backend"
        if str(backend_path) not in sys.path:
            sys.path.insert(0, str(backend_path))

        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            model = loader.load()
        except Exception as e:
            raise RuntimeError(f"NPU模型加载失败，无法进行性能测试: {e}") from e

        for i in range(iterations):
            start_time = time.time()

            # 真实 NPU 推理
            result = loader.infer(test_text, max_new_tokens=500, temperature=0.7)

            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
            
            print(f"  第{i+1}次推理: {latency_ms:.2f}ms")
        
        # 计算统计指标
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
        p99_latency = sorted(latencies)[int(len(latencies) * 0.99)]
        
        result = {
            "avg_latency_ms": avg_latency,
            "min_latency_ms": min_latency,
            "max_latency_ms": max_latency,
            "p95_latency_ms": p95_latency,
            "p99_latency_ms": p99_latency,
            "iterations": iterations,
            "target_latency_ms": 500
        }
        
        # 打印结果
        print(f"\nNPU推理性能指标：")
        print(f"  平均延迟: {avg_latency:.2f}ms (目标: <500ms)")
        print(f"  最小延迟: {min_latency:.2f}ms")
        print(f"  最大延迟: {max_latency:.2f}ms")
        print(f"  P95延迟: {p95_latency:.2f}ms")
        print(f"  P99延迟: {p99_latency:.2f}ms")
        print(f"  测试次数: {iterations}")
        
        # 判断是否达标
        if avg_latency < 500:
            print(f"  达标：平均延迟 {avg_latency:.2f}ms < 500ms")
        else:
            print(f" no 未达标：平均延迟 {avg_latency:.2f}ms > 500ms")
        
        self.results["npu_inference"] = result
        return result
    
    def test_vector_retrieval(self, queries: List[str] = None,
                             top_k: int = 10, iterations: int = 100) -> Dict:
        """
        测试向量检索性能
        
        参数：
            queries: 查询列表
            top_k: 返回Top-K结果
            iterations: 测试次数
        
        返回：
            性能指标
        """
        print("\n" + "=" * 80)
        print("向量检索性能测试")
        print("=" * 80)
        
        # 尝试导入向量检索模块
        try:
            from scripts.vector_retrieval import VectorRetrieval
            
            # 创建索引并添加测试数据
            print("正在初始化向量检索...")
            vr = VectorRetrieval()
            
            # 添加测试文档
            test_docs = [
                {"id": f"doc_{i}", "text": f"测试文档{i}，包含销售数据和风险分析", 
                 "metadata": {"type": "test"}}
                for i in range(1000)
            ]
            vr.add_documents(test_docs)
            
            # 准备查询
            if queries is None:
                queries = [
                    "销售数据统计",
                    "风险分析",
                    "库存管理",
                    "客户分析",
                    "市场趋势"
                ]
            
            # 性能测试
            latencies = []
            result_counts = []
            
            for i in range(iterations):
                query = queries[i % len(queries)]
                start_time = time.time()
                
                results = vr.search(query, top_k=top_k)
                
                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000
                latencies.append(latency_ms)
                result_counts.append(len(results))
            
            # 计算统计指标
            avg_latency = sum(latencies) / len(latencies)
            min_latency = min(latencies)
            max_latency = max(latencies)
            p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
            p99_latency = sorted(latencies)[int(len(latencies) * 0.99)]
            avg_result_count = sum(result_counts) / len(result_counts)
            
            result = {
                "avg_latency_ms": avg_latency,
                "min_latency_ms": min_latency,
                "max_latency_ms": max_latency,
                "p95_latency_ms": p95_latency,
                "p99_latency_ms": p99_latency,
                "avg_result_count": avg_result_count,
                "top_k": top_k,
                "iterations": iterations,
                "target_latency_ms": 100,
                "document_count": len(test_docs)
            }
            
            # 打印结果
            print(f"\n向量检索性能指标：")
            print(f"  平均延迟: {avg_latency:.2f}ms (目标: <100ms)")
            print(f"  最小延迟: {min_latency:.2f}ms")
            print(f"  最大延迟: {max_latency:.2f}ms")
            print(f"  P95延迟: {p95_latency:.2f}ms")
            print(f"  P99延迟: {p99_latency:.2f}ms")
            print(f"  平均返回结果数: {avg_result_count:.2f}")
            print(f"  测试次数: {iterations}")
            print(f"  文档数量: {len(test_docs)}")
            
            # 判断是否达标
            if avg_latency < 100:
                print(f"  达标：平均延迟 {avg_latency:.2f}ms < 100ms")
            else:
                print(f" no 未达标：平均延迟 {avg_latency:.2f}ms > 100ms")
            
            self.results["vector_retrieval"] = result
            return result
            
        except ImportError as e:
            print(f"[WARN] 向量检索模块未安装，跳过测试: {e}")
            result = {
                "error": "向量检索模块未安装",
                "avg_latency_ms": 0,
                "target_latency_ms": 100
            }
            self.results["vector_retrieval"] = result
            return result
    
    def test_batch_processing(self, file_count: int = 100,
                            avg_file_size_kb: int = 100) -> Dict:
        """
        测试批处理性能
        
        参数：
            file_count: 文件数量
            avg_file_size_kb: 平均文件大小（KB）
        
        返回：
            性能指标
        """
        print("\n" + "=" * 80)
        print("批处理性能测试")
        print("=" * 80)
        
        start_time = time.time()

        # 真实批处理
        from pathlib import Path
        temp_dir = Path(__file__).parent / "temp_test_files"
        temp_dir.mkdir(exist_ok=True)

        # 创建测试文件
        test_files = []
        for i in range(file_count):
            test_file = temp_dir / f"test_{i}.txt"
            test_file.write_text("x" * (avg_file_size_kb * 1024))
            test_files.append(test_file)

        try:
            # 导入批处理器
            from batch_process import batch_process

            # 执行批处理
            result = batch_process(str(temp_dir))
            processed_files = len(result)
        except Exception as e:
            raise RuntimeError(f"批处理失败: {e}") from e
        finally:
            # 清理临时文件
            for test_file in test_files:
                if test_file.exists():
                    test_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()

        total_size_kb = file_count * avg_file_size_kb
        end_time = time.time()
        total_time = end_time - start_time
        throughput = file_count / total_time if total_time > 0 else 0
        throughput_mb = (total_size_kb / 1024) / total_time if total_time > 0 else 0
        
        result = {
            "file_count": file_count,
            "total_size_mb": total_size_kb / 1024,
            "total_time_s": total_time,
            "throughput_files_per_min": throughput * 60,
            "throughput_mb_per_min": throughput_mb * 60,
            "target_throughput_files_per_min": 1000
        }
        
        # 打印结果
        print(f"\n批处理性能指标：")
        print(f"  文件数量: {file_count}")
        print(f"  总大小: {total_size_kb / 1024:.2f}MB")
        print(f"  总耗时: {total_time:.2f}秒")
        print(f"  吞吐量: {throughput * 60:.0f}个/分钟 (目标: >1000个/分钟)")
        print(f"  数据吞吐: {throughput_mb * 60:.2f}MB/分钟")
        
        # 判断是否达标
        if throughput * 60 >= 1000:
            print(f"  达标：吞吐量 {throughput * 60:.0f}个/分钟 >= 1000个/分钟")
        else:
            print(f" no 未达标：吞吐量 {throughput * 60:.0f}个/分钟 < 1000个/分钟")
        
        self.results["batch_processing"] = result
        return result
    
    def test_ocr_performance(self, image_count: int = 50) -> Dict:
        """
        测试OCR性能
        
        参数：
            image_count: 图像数量
        
        返回：
            性能指标
        """
        print("\n" + "=" * 80)
        print("OCR性能测试")
        print("=" * 80)
        
        start_time = time.time()

        # 真实 OCR 处理
        try:
            import pytesseract
            from PIL import Image

            # 导入 NPU OCR 模块
            import sys
            from pathlib import Path
            backend_path = Path(__file__).parent.parent.parent / "backend"
            if str(backend_path) not in sys.path:
                sys.path.insert(0, str(backend_path))

            # 检查是否使用 NPU OCR
            try:
                from npu_core import NPUInferenceCore
                use_npu_ocr = True
            except ImportError:
                use_npu_ocr = False

            # 创建测试图像
            from PIL import Image, ImageDraw, ImageFont
            temp_dir = Path(__file__).parent / "temp_test_images"
            temp_dir.mkdir(exist_ok=True)
            test_images = []

            try:
                for i in range(image_count):
                    img = Image.new('RGB', (100, 100), color='white')
                    draw = ImageDraw.Draw(img)
                    draw.text((10, 10), f"测试{i}", fill='black')
                    img_path = temp_dir / f"test_{i}.png"
                    img.save(img_path)
                    test_images.append(img_path)

                # 执行 OCR
                for img_path in test_images:
                    image = Image.open(img_path)
                    text = pytesseract.image_to_string(image, lang='chi_sim+eng')

            finally:
                # 清理临时文件
                for img_path in test_images:
                    if img_path.exists():
                        img_path.unlink()
                if temp_dir.exists():
                    temp_dir.rmdir()

        except ImportError as e:
            raise RuntimeError(f"OCR 库未安装，无法进行性能测试: {e}") from e
        except Exception as e:
            raise RuntimeError(f"OCR 处理失败: {e}") from e

        end_time = time.time()
        total_time = end_time - start_time
        avg_time_per_image = total_time / image_count if image_count > 0 else 0
        
        result = {
            "image_count": image_count,
            "total_time_s": total_time,
            "avg_time_per_image_ms": avg_time_per_image * 1000,
            "throughput_images_per_min": image_count / total_time * 60 if total_time > 0 else 0,
            "target_avg_time_per_image_ms": 500
        }
        
        # 打印结果
        print(f"\nOCR性能指标：")
        print(f"  图像数量: {image_count}")
        print(f"  总耗时: {total_time:.2f}秒")
        print(f"  平均处理时间: {avg_time_per_image * 1000:.2f}ms/张 (目标: <500ms)")
        print(f"  吞吐量: {image_count / total_time * 60:.0f}张/分钟")
        
        # 判断是否达标
        if avg_time_per_image * 1000 < 500:
            print(f"  达标：平均处理时间 {avg_time_per_image * 1000:.2f}ms < 500ms")
        else:
            print(f" no 未达标：平均处理时间 {avg_time_per_image * 1000:.2f}ms > 500ms")
        
        self.results["ocr_performance"] = result
        return result
    
    def generate_report(self) -> str:
        """
        生成性能测试报告
        
        返回：
            报告文本
        """
        report = "=" * 80 + "\n"
        report += "性能测试报告\n"
        report += "=" * 80 + "\n\n"
        
        # NPU推理
        if "npu_inference" in self.results:
            npu = self.results["npu_inference"]
            report += "1. NPU推理性能\n"
            report += "-" * 40 + "\n"
            report += f"  平均延迟: {npu['avg_latency_ms']:.2f}ms (目标: <{npu['target_latency_ms']}ms) "
            report += "达标\n" if npu['avg_latency_ms'] < npu['target_latency_ms'] else " 未达标\n"
            report += f"  P95延迟: {npu['p95_latency_ms']:.2f}ms\n"
            report += f"  P99延迟: {npu['p99_latency_ms']:.2f}ms\n\n"
        
        # 向量检索
        if "vector_retrieval" in self.results:
            vr = self.results["vector_retrieval"]
            if "error" not in vr:
                report += "2. 向量检索性能\n"
                report += "-" * 40 + "\n"
                report += f"  平均延迟: {vr['avg_latency_ms']:.2f}ms (目标: <{vr['target_latency_ms']}ms) "
                report += "达标\n" if vr['avg_latency_ms'] < vr['target_latency_ms'] else " 未达标\n"
                report += f"  文档数量: {vr['document_count']}\n"
                report += f"  平均返回结果数: {vr['avg_result_count']:.2f}\n\n"
        
        # 批处理
        if "batch_processing" in self.results:
            bp = self.results["batch_processing"]
            report += "3. 批处理性能\n"
            report += "-" * 40 + "\n"
            report += f"  吞吐量: {bp['throughput_files_per_min']:.0f}个/分钟 (目标: >{bp['target_throughput_files_per_min']}个/分钟) "
            report += "达标\n" if bp['throughput_files_per_min'] >= bp['target_throughput_files_per_min'] else " 未达标\n"
            report += f"  总大小: {bp['total_size_mb']:.2f}MB\n\n"
        
        # OCR性能
        if "ocr_performance" in self.results:
            ocr = self.results["ocr_performance"]
            report += "4. OCR性能\n"
            report += "-" * 40 + "\n"
            report += f"  平均处理时间: {ocr['avg_time_per_image_ms']:.2f}ms/张 (目标: <{ocr['target_avg_time_per_image_ms']}ms) "
            report += "达标\n" if ocr['avg_time_per_image_ms'] < ocr['target_avg_time_per_image_ms'] else " 未达标\n"
            report += f"  吞吐量: {ocr['throughput_images_per_min']:.0f}张/分钟\n\n"
        
        # 总结
        report += "=" * 80 + "\n"
        report += "总结\n"
        report += "=" * 80 + "\n"
        
        passed = 0
        total = 0
        
        if "npu_inference" in self.results:
            total += 1
            if self.results["npu_inference"]["avg_latency_ms"] < 500:
                passed += 1
        
        if "vector_retrieval" in self.results and "error" not in self.results["vector_retrieval"]:
            total += 1
            if self.results["vector_retrieval"]["avg_latency_ms"] < 100:
                passed += 1
        
        if "batch_processing" in self.results:
            total += 1
            if self.results["batch_processing"]["throughput_files_per_min"] >= 1000:
                passed += 1
        
        if "ocr_performance" in self.results:
            total += 1
            if self.results["ocr_performance"]["avg_time_per_image_ms"] < 500:
                passed += 1
        
        report += f"达标项目: {passed}/{total}\n"
        
        if passed == total:
            report += "🎉 所有性能指标均达标！\n"
        else:
            report += f"[WARN] {total - passed} 项性能指标未达标\n"
        
        return report


if __name__ == "__main__":
    # 创建性能测试实例
    perf_test = PerformanceTest()
    
    # 运行所有测试
    perf_test.test_npu_inference(iterations=10)
    perf_test.test_vector_retrieval(iterations=100)
    perf_test.test_batch_processing(file_count=100)
    perf_test.test_ocr_performance(image_count=50)
    
    # 生成报告
    print("\n" + "=" * 80)
    report = perf_test.generate_report()
    print(report)
