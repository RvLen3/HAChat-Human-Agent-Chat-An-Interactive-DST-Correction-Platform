"""
问题判别器 - 判断用户问题是否需要人工专家介入

初始版本使用关键词匹配，后续可替换为机器学习模型
"""
import re
from typing import Tuple


class Discriminator:
    """问题判别器"""
    
    # 需要人工介入的关键词
    HUMAN_KEYWORDS = [
        "专家", "人工", "客服", "真人", "帮助", "投诉",
        "退款", "法律", "紧急", "严重", "领导", "经理",
        "不满意", "转人工", "人类", "expert", "human",
        "help me", "urgent", "serious"
    ]
    
    # 复杂问题模式
    COMPLEX_PATTERNS = [
        r"如何.*解决.*问题",
        r"为什么.*不能",
        r"怎么办.*急",
        r"投诉.*",
        r"请.*帮.*处理"
    ]
    
    def __init__(self):
        """初始化判别器"""
        self.keywords = [kw.lower() for kw in self.HUMAN_KEYWORDS]
        self.patterns = [re.compile(p, re.IGNORECASE) for p in self.COMPLEX_PATTERNS]
    
    def needs_human(self, question: str) -> Tuple[bool, float]:
        """
        判断问题是否需要人工介入
        
        Args:
            question: 用户问题
            
        Returns:
            (需要人工, 置信度)
        """
        question_lower = question.lower()
        
        # 关键词匹配
        keyword_score = 0
        for keyword in self.keywords:
            if keyword in question_lower:
                keyword_score += 1
        
        # 模式匹配
        pattern_score = 0
        for pattern in self.patterns:
            if pattern.search(question):
                pattern_score += 1
        
        # 计算综合得分
        total_score = keyword_score * 0.3 + pattern_score * 0.5
        
        # 问题长度也是一个因素（过长的问题可能更复杂）
        if len(question) > 100:
            total_score += 0.2
        
        # 判断阈值
        needs_human = total_score >= 0.3
        confidence = min(total_score, 1.0)
        
        return needs_human, confidence
    
    def get_machine_response(self, question: str) -> str:
        """
        生成机器回答（模拟）
        
        实际使用时，这里可以接入大语言模型API
        """
        # 简单的模拟回答
        responses = {
            "你好": "您好！我是智能助手，很高兴为您服务。有什么可以帮助您的吗？",
            "hello": "Hello! I'm an AI assistant. How can I help you today?",
            "hi": "Hi there! How may I assist you?",
        }
        
        question_lower = question.lower().strip()
        
        # 检查是否有预设回答
        for key, response in responses.items():
            if key in question_lower:
                return response
        
        # 默认回答
        return f"感谢您的提问！关于「{question[:50]}{'...' if len(question) > 50 else ''}」，" \
               f"这是一个很好的问题。根据我的分析，我建议您可以从以下几个方面考虑：\n\n" \
               f"1. 首先，确认您的具体需求和目标\n" \
               f"2. 其次，收集相关的信息和资源\n" \
               f"3. 最后，制定合适的行动计划\n\n" \
               f"如果您需要更专业的建议，请告诉我，我可以为您转接人工服务。"


# 全局判别器实例
discriminator = Discriminator()
