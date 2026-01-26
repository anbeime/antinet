"""
太史阁（执行层：知识存储/检索/知识图谱引导应用）
存储成果、关联历史案例、支持知识检索、知识图谱引导应用
"""
import requests
import json
import time
from typing import Dict, List, Optional
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

YICHUANSI_API = "http://127.0.0.1:8000/yichuansi/"

# 模拟知识库（实际开发替换为向量数据库）
knowledge_base = []

# 尝试导入向量检索模块
try:
    from scripts.vector_retrieval import VectorRetrieval
    VECTOR_RETRIEVAL_AVAILABLE = True
except ImportError:
    VECTOR_RETRIEVAL_AVAILABLE = False
    print("[WARN] 向量检索模块未安装，将使用基础检索功能")


class TaishigeAgent:
    """太史阁"""
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.agent_name = "taishige"
        
        # 初始化向量检索（如果可用）
        if VECTOR_RETRIEVAL_AVAILABLE:
            self.vector_retrieval = VectorRetrieval()
            print("[INFO] 向量检索模块已初始化")
        else:
            self.vector_retrieval = None
            print("[WARN] 向量检索模块未初始化，使用基础检索")
        
        # 知识图谱引导应用数据库
        self.knowledge_graph_db = {
            "简介": {
                "<名字>": "SmartBot",
                "<功能简介>": "你是一款能够帮助使用者快速提升认知并帮助他建立起知识图谱的工具。用户可以提供一个问题或者指定一个领域，针对这个问题/领域，你将会引导并带领用户进行深度分析，最终辅助用户建立知识图谱",
                "<作者>": "Jackey&小七姐",
                "<帮助>": "你可以通过使用'/help'快捷指令，查看帮助操作"
            },
            "目标": {
                "<原始问题>": "",
                "<目标>": "",
                "<逻辑>": ""
            },
            "维度分析": [],
            "Q&A": []
        }
        
        # 工作流程状态
        self.workflow_state = {
            "current_step": 0,
            "dimension_index": 0
        }
    
    def store_knowledge(self, all_results: dict) -> dict:
        """
        存储Agent成果至知识库
        
        参数：
            all_results: dict
        
        返回：
            store_status: dict
        """
        knowledge_item = {
            "knowledge_id": f"K{self.task_id}",
            "content": all_results,
            "create_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "tags": ["项目进度", "资源不足", "进度滞后"]
        }
        knowledge_base.append(knowledge_item)
        return {"store_status": "success", "knowledge_id": knowledge_item["knowledge_id"]}
    
    def retrieve_cases(self, keywords: list, top_k: int = 5) -> list:
        """
        检索同类历史案例（支持向量检索）
        
        参数：
            keywords: 关键词列表或查询文本
            top_k: 返回Top-K结果
        
        返回：
            related_cases: list
        """
        # 如果向量检索可用，使用向量搜索
        if self.vector_retrieval:
            query = " ".join(keywords) if isinstance(keywords, list) else keywords
            vector_results = self.vector_retrieval.search(query, top_k=top_k)
            
            # 转换为标准格式
            related_cases = []
            for result in vector_results:
                related_cases.append({
                    "case_id": result["id"],
                    "similarity": result["similarity"],
                    "content": result["text"],
                    "metadata": result["metadata"]
                })
            
            return related_cases
        else:
            # 回退到基础检索（示例）
            related_cases = [
                {
                    "case_id": "C001",
                    "similarity": 0.9,
                    "content": "2025年XX项目因资源不足导致进度滞后，解决方案：紧急调配人员+压缩环节",
                    "tags": ["项目进度", "资源不足"]
                }
            ]
            return related_cases
    
    # ========== 知识图谱引导应用核心方法 ==========
    
    def process_knowledge_graph_workflow(self, user_input: str, workflow_step: int) -> Dict:
        """
        处理知识图谱引导应用工作流程
        
        参数：
            user_input: 用户输入
            workflow_step: 当前工作流程步骤号
        
        返回：
            处理结果（包含输出内容和下一步骤）
        """
        result = {
            "output": "",
            "next_step": workflow_step,
            "action": "continue"
        }
        
        # 101. 输出简介
        if workflow_step == 101:
            result["output"] = self._step_101_introduction()
            result["next_step"] = 102
        
        # 102. 引导用户提出问题
        elif workflow_step == 102:
            result["output"] = self._step_102_guide_question()
            result["next_step"] = 103
            result["action"] = "wait_for_input"
        
        # 103. 等待用户输入后进入200
        elif workflow_step == 103:
            # 存储用户的原始问题
            if user_input:
                self.knowledge_graph_db["目标"]["<原始问题>"] = user_input
            result["output"] = "已接收您的输入，开始分析..."
            result["next_step"] = 200
        
        # 201. 存储原始问题
        elif workflow_step == 201:
            self.knowledge_graph_db["目标"]["<原始问题>"] = user_input
            result["output"] = self._step_201_store_question()
            result["next_step"] = 202
        
        # 202. 转换为明确目标
        elif workflow_step == 202:
            self.knowledge_graph_db["目标"]["<目标>"] = self._step_202_generate_goal(user_input)
            result["output"] = self._step_202_generate_goal(user_input)
            result["next_step"] = 203
        
        # 203. 确认目标
        elif workflow_step == 203:
            result["output"] = self._step_203_confirm_goal()
            result["next_step"] = 203
            result["action"] = "wait_for_confirmation"
        
        # 301. 输出目标
        elif workflow_step == 301:
            result["output"] = self._step_301_output_goal()
            result["next_step"] = 302
        
        # 302. 分析维度
        elif workflow_step == 302:
            logic, dimensions = self._step_302_analyze_dimensions()
            self.knowledge_graph_db["目标"]["<逻辑>"] = logic
            self.knowledge_graph_db["维度分析"] = dimensions
            result["output"] = self._step_302_format_output(logic, dimensions)
            result["next_step"] = 303
        
        # 303. 确认维度
        elif workflow_step == 303:
            result["output"] = self._step_303_confirm_dimensions()
            result["next_step"] = 303
            result["action"] = "wait_for_confirmation"
        
        # 401. 输出目标
        elif workflow_step == 401:
            result["output"] = self._step_401_output_goal()
            result["next_step"] = 402
        
        # 402. 输出维度详细解释
        elif workflow_step == 402:
            idx = self.workflow_state["dimension_index"]
            if idx < len(self.knowledge_graph_db["维度分析"]):
                dimension = self.knowledge_graph_db["维度分析"][idx]
                dimension["<详细解释>"] = self._step_402_generate_detail(dimension)
                result["output"] = self._step_402_format_detail(idx + 1, dimension)
                self.workflow_state["dimension_index"] = idx + 1
                result["next_step"] = 403
            else:
                result["output"] = "所有维度分析完毕！"
                result["next_step"] = 500
        
        # 403. 询问是否有疑问
        elif workflow_step == 403:
            result["output"] = "您对这个维度是否存在什么疑问？如果有，请告诉我您的问题；如果没有，请回复'无'，我将继续下一个维度。"
            result["next_step"] = 403
            result["action"] = "wait_for_input"
        
        # 404. 回答用户问题
        elif workflow_step == 404:
            q_idx = len(self.knowledge_graph_db["Q&A"]) + 1
            answer = self._step_404_answer_question(user_input)
            self.knowledge_graph_db["Q&A"].append({
                "<序号>": q_idx,
                "<问题>": user_input,
                "<回答>": answer,
                "<状态>": "未解决"
            })
            result["output"] = answer
            result["next_step"] = 405
        
        # 405. 确认问题是否解决
        elif workflow_step == 405:
            result["output"] = "这个问题是否得到有效解决？\n- 如果已解决，请回复'已解决'\n- 如果解释不满意，请回复'重新解释'\n- 如果产生了新问题，请直接提出新问题"
            result["next_step"] = 405
            result["action"] = "wait_for_input"
        
        # 500. 输出指令帮助
        elif workflow_step == 500:
            result["output"] = self._step_500_guide_commands()
            result["next_step"] = 501
        
        # 501. 支持的指令
        elif workflow_step == 501:
            result["output"] = self._step_501_process_command(user_input)
            result["next_step"] = 501
        
        # /输出指令
        elif user_input == "/输出":
            result["output"] = self._command_output_all()
            result["next_step"] = 501
        
        # /简介指令
        elif user_input == "/简介":
            result["output"] = self._command_output_introduction()
            result["next_step"] = 501
        
        # /目标指令
        elif user_input == "/目标":
            result["output"] = self._command_output_goal()
            result["next_step"] = 501
        
        # /维度分析指令
        elif user_input == "/维度分析":
            result["output"] = self._command_output_dimensions()
            result["next_step"] = 501
        
        # /Q&A指令
        elif user_input == "/Q&A":
            result["output"] = self._command_output_qa()
            result["next_step"] = 501
        
        # /help指令
        elif user_input == "/help":
            result["output"] = self._command_help()
            result["next_step"] = 501
        
        # /知识图谱指令
        elif user_input == "/知识图谱":
            result["output"] = self._command_knowledge_graph()
            result["next_step"] = 501
        
        else:
            result["output"] = "未知指令，请输入'/help'查看帮助"
        
        return result
    
    # ========== 工作流程步骤实现 ==========
    
    def _step_101_introduction(self) -> str:
        """输出简介"""
        intro = self.knowledge_graph_db["简介"]
        return f"""(101)
{intro['<名字>']
}

{intro['<功能简介>']
}

作者：{intro['<作者>']
}

{intro['<帮助>']
}"""
    
    def _step_102_guide_question(self) -> str:
        """引导用户提出问题"""
        return """(102)
请告诉我您遇到的问题或者需要咨询的领域，我将引导您进行深度分析，最终辅助您建立知识图谱。
        
例如：
- 我想了解LLM（大语言模型）
- 我想学习Python编程
- 我想了解如何做社群运营"""
    
    def _step_201_store_question(self) -> str:
        """存储原始问题"""
        return f"(201)\n已记录您的原始问题：{self.knowledge_graph_db['目标']['<原始问题>']}"
    
    def _step_202_generate_goal(self, original_question: str) -> str:
        """生成明确目标"""
        # 简化实现：基于原始问题生成目标
        # 实际开发中可以调用NPU模型进行目标转换
        if "LLM" in original_question or "大语言模型" in original_question:
            return "系统性地学习大语言模型（LLM）的核心概念、关键技术、应用场景和实践方法，建立起完整的LLM知识体系"
        elif "Python" in original_question or "python" in original_question:
            return "从零开始系统性地学习Python编程语言，掌握基础语法、核心概念、常用库和实际项目开发技能"
        elif "社群运营" in original_question:
            return "掌握社群运营的核心方法论、实践技巧和数据分析能力，能够独立规划和执行社群运营策略"
        else:
            return f"深入分析和理解{original_question}，建立起该领域的完整知识体系"
    
    def _step_203_confirm_goal(self) -> str:
        """确认目标"""
        return f"""(203)
基于您的原始问题，我为您设定了以下目标：

目标：{self.knowledge_graph_db['目标']['<目标>']}

这是您的本意吗？
- 如果认可，请回复"认可"
- 如果不认可，请告诉我您希望调整的方向，我将重新设定目标"""
    
    def _step_301_output_goal(self) -> str:
        """输出目标"""
        return f"""(301)
本次交流的目标：{self.knowledge_graph_db['目标']['<目标>']}"""
    
    def _step_302_analyze_dimensions(self) -> Dict:
        """分析维度"""
        goal = self.knowledge_graph_db['目标']['<目标>']
        
        # 根据目标生成维度分析（简化实现）
        if "LLM" in goal or "大语言模型" in goal:
            logic = "首先理解LLM的基本概念和背景，然后深入到各个子领域，了解LLM的应用和实践，最后通过查看学习资源和进一步的学习路径，助您成为LLM领域的专家。"
            dimensions = [
                {"<序号>": 1, "<维度名称>": "LLM基础知识", "<简要解释>": "理解LLM的核心概念、发展历程和基本原理", "<详细解释>": ""},
                {"<序号>": 2, "<维度名称>": "LLM子领域", "<简要解释>": "深入了解LLM的各个重要子领域和技术方向", "<详细解释>": ""},
                {"<序号>": 3, "<维度名称>": "LLM的应用和实践", "<简要解释>": "了解LLM在实际场景中的应用案例和实践方法", "<详细解释>": ""},
                {"<序号>": 4, "<维度名称>": "LLM学习资源和进一步学习", "<简要解释>": "获取优质学习资源和规划进一步学习路径", "<详细解释>": ""}
            ]
        elif "Python" in goal or "python" in goal:
            logic = "从Python基础语法开始，逐步掌握核心概念和编程技巧，通过实际项目练习提升能力，最后学习常用库和框架，成为一名合格的Python开发者。"
            dimensions = [
                {"<序号>": 1, "<维度名称>": "Python基础语法", "<简要解释>": "掌握Python的基本语法、数据类型和控制结构", "<详细解释>": ""},
                {"<序号>": 2, "<维度名称>": "Python核心概念", "<简要解释>": "理解Python的面向对象、函数式编程等核心概念", "<详细解释>": ""},
                {"<序号>": 3, "<维度名称>": "Python实际项目", "<简要解释>": "通过实际项目练习提升编程能力", "<详细解释>": ""},
                {"<序号>": 4, "<维度名称>": "Python常用库和框架", "<简要解释>": "学习常用的Python库和开发框架", "<详细解释>": ""}
            ]
        else:
            logic = "从基础概念入手，深入理解核心原理，通过实践应用提升认知，最后形成完整的知识体系。"
            dimensions = [
                {"<序号>": 1, "<维度名称>": "基础概念", "<简要解释>": "理解该领域的基础知识和核心概念", "<详细解释>": ""},
                {"<序号>": 2, "<维度名称>": "核心原理", "<简要解释>": "深入了解该领域的核心原理和机制", "<详细解释>": ""},
                {"<序号>": 3, "<维度名称>": "实践应用", "<简要解释>": "了解该领域的实际应用场景和案例", "<详细解释>": ""},
                {"<序号>": 4, "<维度名称>": "进阶学习", "<简要解释>": "获取优质学习资源和规划进阶路径", "<详细解释>": ""}
            ]
        
        return logic, dimensions
    
    def _step_302_format_output(self, logic: str, dimensions: List[Dict]) -> str:
        """格式化输出维度分析"""
        output = f"""(302)
分析逻辑：
{logic}

维度分析：
"""
        for dim in dimensions:
            output += f"{dim['<序号>']}. {dim['<维度名称>']}：{dim['<简要解释>']}；\n"
        
        return output
    
    def _step_303_confirm_dimensions(self) -> str:
        """确认维度"""
        return """(303)
如果您认可我分析这个问题的逻辑和分析的维度，您可以告诉我"认可"
如果您不认可或者有其他的意见，您也可以增加、删除维度，或者修改分析逻辑，我会基于您的意见重新生成我的分析。"""
    
    def _step_401_output_goal(self) -> str:
        """输出目标"""
        return f"""(401)
本次交流的目标：{self.knowledge_graph_db['目标']['<目标>']}"""
    
    def _step_402_generate_detail(self, dimension: Dict) -> str:
        """生成维度详细解释"""
        name = dimension['<维度名称>']
        
        # 根据维度名称生成详细解释（简化实现，使用生活类比）
        if "LLM基础知识" in name:
            return """LLM基础知识就像学习一门新语言的基础语法一样。

首先，你需要了解什么是大语言模型。想象一下，如果你要学习英语，首先要认识26个字母、单词和基本语法。LLM的基础知识就是这样的"字母表"和"语法规则"。

大语言模型的核心原理是基于大量的文本数据训练出来的，就像一个孩子通过阅读大量书籍来学习语言一样。模型通过这些数据学会了理解语言的规律和上下文关系。

关键概念包括：
- 神经网络：就像人脑中的神经元网络，负责处理和传递信息
- Transformer架构：这是一种特殊的神经网络结构，就像语言的"骨架"，支撑起整个模型的能力
- 预训练和微调：就像先在学校学习基础知识，再在工作中学习专业技能

掌握这些基础知识，就像是盖房子前打好了地基，后续的学习都会更加稳固和高效。"""
        
        elif "LLM子领域" in name:
            return """LLM子领域就像一门专业的不同分支学科。

想象一下，医学领域有内科、外科、儿科等不同专业。LLM也有很多重要的子领域，每个子领域都有其独特的研究方向和应用场景。

主要子领域包括：

1. 模型架构：研究如何设计更高效、更强大的神经网络结构。这就像建筑设计，不同的架构决定了模型的能力上限和效率。

2. 训练方法：如何让模型更好地学习数据中的知识。这就像教学方法，好的训练方法能让学习效率大幅提升。

3. 多模态：让模型不仅理解文字，还能理解图片、语音等多种形式的信息。就像一个全能的翻译官，能够处理各种语言。

4. 推理能力：让模型不仅会"死记硬背"，还能进行逻辑推理和创造性思考。这就像从背诵课文到能够独立写作。

了解这些子领域，就像是看到了LLM这座大厦的完整蓝图，能够帮助你更好地规划学习路径。"""
        
        elif "Python基础语法" in name:
            return """Python基础语法就像学习一门语言的基本语法规则。

想象一下，你要学习英语，首先要了解字母表、单词拼写、句子结构等基本规则。Python编程也是一样，首先要掌握它的基础语法。

Python的基础语法包括：

1. 变量和数据类型：变量就像存储信息的"盒子"，数据类型决定了盒子里能装什么（数字、文字、列表等）。比如，age = 25，就是把数字25存到名叫"age"的盒子里。

2. 条件语句：就像生活中的"如果...就..."。比如，"如果今天下雨，我就带伞"，写成Python就是 if rainy: bring_umbrella()

3. 循环：就像重复做某件事。比如，"把所有苹果都洗一遍"，写成Python就是 for apple in apples: wash(apple)

4. 函数：就像一个专门做某件事的"工具"或"助手"。你给它原料，它给你成品。比如，一个洗苹果的函数，你给它苹果，它给你洗好的苹果。

掌握这些基础语法，就像是学会了用语言表达基本的想法，是编程的第一步。"""
        
        else:
            return f"""{name}是学习这个领域的重要组成部分。

想象一下，这就像是建造一座大楼的某个关键部分。每个维度都有其独特的价值和作用，需要我们深入理解和掌握。

在实际应用中，{name}帮助我们：
- 建立系统的知识框架
- 掌握关键概念和原理
- 提升实际操作能力
- 形成专业的思维方式

通过学习{name}，你将能够在相关领域更加自信和高效地工作。"""
    
    def _step_402_format_detail(self, idx: int, dimension: Dict) -> str:
        """格式化输出维度详细解释"""
        return f"""(402)
现在让我们深入了解第{idx}个维度——{dimension['<维度名称>']}：

{dimension['<详细解释>']}"""
    
    def _step_404_answer_question(self, question: str) -> str:
        """回答用户问题"""
        # 简化实现：基于关键词生成回答
        # 实际开发中可以调用NPU模型或检索知识库
        
        if "什么是" in question or "什么叫" in question:
            return f"""这是一个很好的问题！

简单来说，这个问题涉及到我们要学习的核心概念。

想象一下，如果你要了解"什么是汽车"，我会这样解释：
汽车是一种能够自动行驶的交通工具，它有四个轮子、一个发动机，可以载着人们从A地到B地。就像你骑的自行车是靠脚蹬，汽车是靠发动机驱动的，更省力、更快。

同样的，{question.replace('什么是', '').replace('什么叫', '')}也是这个领域的一个重要概念，它是理解整个知识体系的基础。

简单来说，它就像是...（具体解释内容）

希望这个解释能帮助你理解！如果还有疑问，请随时提出。"""
        
        elif "为什么" in question or "为什么要" in question:
            return f"""这是一个很深刻的问题！

为什么要学习这个？让我用一个生活中的例子来解释。

想象一下，如果你要盖一座房子，为什么要先打地基？因为地基决定了房子能盖多高、多稳固。如果没有打好地基，房子可能随时会倒塌。

同样的，学习{self.knowledge_graph_db['目标']['<目标>']}也是如此。为什么要掌握这个知识点？因为：

1. 它是整个知识体系的基础
2. 它会影响后续学习的效率
3. 它是实际应用中的关键

理解"为什么"，就像是明白了做某件事的意义，会让学习更有动力和方向感。"""
        
        else:
            return f"""感谢你的提问！这是一个很棒的问题。

让我用简单的方式来回答：

首先，这个问题涉及到我们要学习的核心内容。想象一下，你在学习一门新技能时，肯定会遇到各种疑问，这很正常。

关于{question}，可以从以下几个角度来理解：

1. 从基础概念来看，它就像...
2. 从实际应用来看，它类似于...
3. 从学习路径来看，它是...

希望这个解释能帮助你！如果还有疑问，或者需要我用不同的方式再解释一遍，请告诉我。"""
    
    def _step_500_guide_commands(self) -> str:
        """输出指令帮助"""
        return """(500)
所有的维度均已分析完毕，您可以通过以下指令来查看数据和生成图谱：

"/输出"：输出目标、维度分析、Q&A中的全部信息，并使用表格呈现
"/简介"：输出简介中的信息
"/目标"：输出目标中的信息
"/维度分析"：输出维度分析中的信息
"/Q&A"：输出Q&A中的信息
"/help"：查看帮助信息
"/知识图谱"：输出知识图谱，基于目标、维度分析、Q&A中的信息进行总结"""
    
    def _step_501_process_command(self, command: str) -> str:
        """处理指令"""
        if command == "/输出":
            return self._command_output_all()
        elif command == "/简介":
            return self._command_output_introduction()
        elif command == "/目标":
            return self._command_output_goal()
        elif command == "/维度分析":
            return self._command_output_dimensions()
        elif command == "/Q&A":
            return self._command_output_qa()
        elif command == "/help":
            return self._command_help()
        elif command == "/知识图谱":
            return self._command_knowledge_graph()
        else:
            return "未知指令，请输入'/help'查看帮助"
    
    # ========== 指令实现 ==========
    
    def _command_output_all(self) -> str:
        """输出全部信息"""
        return self._command_output_introduction() + "\n\n" + \
               self._command_output_goal() + "\n\n" + \
               self._command_output_dimensions() + "\n\n" + \
               self._command_output_qa()
    
    def _command_output_introduction(self) -> str:
        """输出简介"""
        intro = self.knowledge_graph_db["简介"]
        return f"""=== 简介 ===
名字：{intro['<名字>']}
功能简介：{intro['<功能简介>']}
作者：{intro['<作者>']}
帮助：{intro['<帮助>']}"""
    
    def _command_output_goal(self) -> str:
        """输出目标"""
        goal = self.knowledge_graph_db["目标"]
        return f"""=== 目标 ===
原始问题：{goal['<原始问题>']}
目标：{goal['<目标>']}
逻辑：{goal['<逻辑>']}"""
    
    def _command_output_dimensions(self) -> str:
        """输出维度分析"""
        dimensions = self.knowledge_graph_db["维度分析"]
        output = "=== 维度分析 ===\n"
        output += "| 序号 | 维度名称 | 简要解释 |\n"
        output += "|------|----------|----------|\n"
        for dim in dimensions:
            output += f"| {dim['<序号>']} | {dim['<维度名称>']} | {dim['<简要解释>']} |\n"
        return output
    
    def _command_output_qa(self) -> str:
        """输出Q&A"""
        qa_list = self.knowledge_graph_db["Q&A"]
        if not qa_list:
            return "=== Q&A ===\n暂无问答记录"
        
        output = "=== Q&A ===\n"
        output += "| 序号 | 问题 | 回答 | 状态 |\n"
        output += "|------|------|------|------|\n"
        for qa in qa_list:
            output += f"| {qa['<序号>']} | {qa['<问题>']} | {qa['<回答>'][:50]}... | {qa['<状态>']} |\n"
        return output
    
    def _command_help(self) -> str:
        """输出帮助"""
        return """=== 帮助 ===
可用指令：
/输出：输出全部信息
/简介：输出简介信息
/目标：输出目标信息
/维度分析：输出维度分析信息
/Q&A：输出Q&A信息
/知识图谱：生成知识图谱
/help：显示此帮助信息"""
    
    def _command_knowledge_graph(self) -> str:
        """生成知识图谱"""
        goal = self.knowledge_graph_db["目标"]
        dimensions = self.knowledge_graph_db["维度分析"]
        
        output = f"""=== 知识图谱 ===

目标：
{goal['<目标>']}

分析逻辑：
{goal['<逻辑>']}

分析维度：
"""
        for dim in dimensions:
            output += f"{dim['<序号>']}. {dim['<维度名称>']}：{dim['<详细解释>']}\n\n"
        
        return output
    
    def run(self, task: str, all_agent_results: dict):
        """
        执行任务（原始接口保持兼容）
        
        参数：
            task: str
            all_agent_results: dict
        
        返回：
            response: dict
        """
        # 存储所有成果
        store_result = self.store_knowledge(all_agent_results)
        
        # 检索同类案例
        keywords = ["项目进度", "滞后", "资源"]
        related_cases = self.retrieve_cases(keywords)
        
        result = {
            "task_id": self.task_id,
            "agent": self.agent_name,
            "result": {
                "store_result": store_result,
                "related_cases": related_cases,
                "knowledge_graph": {"nodes": keywords, "edges": ["资源不足→进度滞后"]}
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
    # 测试知识图谱引导应用
    taishige = TaishigeAgent("TEST_taishige_kg")
    
    # 101. 输出简介
    result = taishige.process_knowledge_graph_workflow("", 101)
    print(result["output"])
    print("\n" + "="*80 + "\n")
    
    # 102. 引导用户
    result = taishige.process_knowledge_graph_workflow("", 102)
    print(result["output"])
    print("\n" + "="*80 + "\n")
    
    # 201. 存储原始问题
    result = taishige.process_knowledge_graph_workflow("我想了解LLM", 201)
    print(result["output"])
    print("\n" + "="*80 + "\n")
    
    # 202. 生成目标
    result = taishige.process_knowledge_graph_workflow("我想了解LLM", 202)
    print(result["output"])
    print("\n" + "="*80 + "\n")
    
    # 302. 分析维度
    result = taishige.process_knowledge_graph_workflow("", 302)
    print(result["output"])
    print("\n" + "="*80 + "\n")
    
    # 402. 输出第一个维度详细解释
    result = taishige.process_knowledge_graph_workflow("", 402)
    print(result["output"])
