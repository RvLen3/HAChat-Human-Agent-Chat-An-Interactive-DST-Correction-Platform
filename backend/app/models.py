"""
数据模型定义 - 人机对话系统
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class MessageType(str, enum.Enum):
    """消息类型枚举"""
    USER = "user"           # 用户消息
    MACHINE = "machine"     # 机器回答
    HUMAN = "human"         # 人工回答
    WAITING = "waiting"     # 等待人工回答状态


class FeedbackType(str, enum.Enum):
    """反馈类型枚举"""
    LIKE = "like"           # 点赞
    DISLIKE = "dislike"     # 点踩


class Conversation(Base):
    """对话会话模型"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联消息
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """消息模型"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), nullable=False)  # user, machine, human, waiting
    needs_human = Column(Boolean, default=False)       # 是否需要人工介入
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联
    conversation = relationship("Conversation", back_populates="messages")
    feedback = relationship("Feedback", back_populates="message", uselist=False)


class Feedback(Base):
    """用户反馈模型"""
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), unique=True, nullable=False)
    feedback_type = Column(String(10), nullable=False)  # like or dislike
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联
    message = relationship("Message", back_populates="feedback")
