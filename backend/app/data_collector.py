"""
数据收集器 - 存储人工回答和用户反馈数据到本地JSON文件
"""
import json
import os
from datetime import datetime
from typing import Dict, Any, List
from pathlib import Path


class DataCollector:
    """数据收集器 - 用于收集训练数据"""
    
    def __init__(self, data_dir: str = None):
        """
        初始化数据收集器
        
        Args:
            data_dir: 数据存储目录
        """
        if data_dir is None:
            # 默认存储在 backend/app/data 目录
            data_dir = os.path.join(os.path.dirname(__file__), "data")
        
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 数据文件路径
        self.human_answers_file = self.data_dir / "human_answers.json"
        self.negative_feedback_file = self.data_dir / "negative_feedback.json"
        self.positive_feedback_file = self.data_dir / "positive_feedback.json"
        
        # 确保文件存在
        for file_path in [self.human_answers_file, self.negative_feedback_file, self.positive_feedback_file]:
            if not file_path.exists():
                self._save_json(file_path, [])
    
    def _load_json(self, file_path: Path) -> List[Dict]:
        """加载JSON文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _save_json(self, file_path: Path, data: List[Dict]):
        """保存JSON文件"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def record_human_answer(self, question: str, answer: str, session_id: str):
        """
        记录人工回答
        
        Args:
            question: 用户问题
            answer: 人工回答
            session_id: 会话ID
        """
        data = self._load_json(self.human_answers_file)
        
        record = {
            "id": len(data) + 1,
            "session_id": session_id,
            "question": question,
            "answer": answer,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        data.append(record)
        self._save_json(self.human_answers_file, data)
        
        return record
    
    def record_negative_feedback(self, question: str, machine_answer: str, 
                                  session_id: str, message_id: int):
        """
        记录被踩的机器回答（用于优化判别器）
        
        Args:
            question: 用户问题
            machine_answer: 机器回答
            session_id: 会话ID
            message_id: 消息ID
        """
        data = self._load_json(self.negative_feedback_file)
        
        record = {
            "id": len(data) + 1,
            "session_id": session_id,
            "message_id": message_id,
            "question": question,
            "machine_answer": machine_answer,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        data.append(record)
        self._save_json(self.negative_feedback_file, data)
        
        return record
    
    def record_positive_feedback(self, question: str, answer: str, 
                                  answer_type: str, session_id: str, message_id: int):
        """
        记录正向反馈
        
        Args:
            question: 用户问题
            answer: 回答内容
            answer_type: 回答类型（machine/human）
            session_id: 会话ID
            message_id: 消息ID
        """
        data = self._load_json(self.positive_feedback_file)
        
        record = {
            "id": len(data) + 1,
            "session_id": session_id,
            "message_id": message_id,
            "question": question,
            "answer": answer,
            "answer_type": answer_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        data.append(record)
        self._save_json(self.positive_feedback_file, data)
        
        return record
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        human_answers = self._load_json(self.human_answers_file)
        negative_feedback = self._load_json(self.negative_feedback_file)
        positive_feedback = self._load_json(self.positive_feedback_file)
        
        return {
            "total_human_answers": len(human_answers),
            "total_negative_feedback": len(negative_feedback),
            "total_positive_feedback": len(positive_feedback),
            "data_directory": str(self.data_dir)
        }


# 全局数据收集器实例
data_collector = DataCollector()
