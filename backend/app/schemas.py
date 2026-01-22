"""
Pydantic Schemas - API请求/响应模型
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum


class MessageTypeEnum(str, Enum):
    """消息类型"""
    USER = "user"
    MACHINE = "machine"
    HUMAN = "human"
    WAITING = "waiting"


class FeedbackTypeEnum(str, Enum):
    """反馈类型"""
    LIKE = "like"
    DISLIKE = "dislike"


# ===== 请求模型 =====

class ChatRequest(BaseModel):
    """发送消息请求"""
    session_id: str
    content: str


class FeedbackRequest(BaseModel):
    """提交反馈请求"""
    message_id: int
    feedback_type: FeedbackTypeEnum


class HumanReplyRequest(BaseModel):
    """人工回复请求"""
    message_id: int  # 对应的等待消息ID
    content: str


# ===== 响应模型 =====

class MessageResponse(BaseModel):
    """消息响应"""
    id: int
    content: str
    message_type: str
    needs_human: bool
    created_at: datetime
    feedback: Optional[str] = None  # like / dislike / None
    
    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    """聊天响应"""
    user_message: MessageResponse
    reply_message: MessageResponse


class FeedbackResponse(BaseModel):
    """反馈响应"""
    success: bool
    message: str


class HistoryResponse(BaseModel):
    """历史记录响应"""
    session_id: str
    messages: List[MessageResponse]


class HumanReplyResponse(BaseModel):
    """人工回复响应"""
    success: bool
    message: MessageResponse
