"""
聊天API路由 - 处理对话相关的所有请求
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from ..database import get_db
from ..models import Conversation, Message, Feedback
from ..schemas import (
    ChatRequest, ChatResponse, MessageResponse,
    FeedbackRequest, FeedbackResponse,
    HumanReplyRequest, HumanReplyResponse,
    HistoryResponse
)
from ..discriminator import discriminator
from ..data_collector import data_collector


router = APIRouter(prefix="/api", tags=["chat"])


def get_or_create_conversation(db: Session, session_id: str) -> Conversation:
    """获取或创建对话"""
    conversation = db.query(Conversation).filter(
        Conversation.session_id == session_id
    ).first()
    
    if not conversation:
        conversation = Conversation(session_id=session_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    return conversation


def message_to_response(message: Message) -> MessageResponse:
    """将Message模型转换为响应格式"""
    feedback = None
    if message.feedback:
        feedback = message.feedback.feedback_type
    
    return MessageResponse(
        id=message.id,
        content=message.content,
        message_type=message.message_type,
        needs_human=message.needs_human,
        created_at=message.created_at,
        feedback=feedback
    )


@router.post("/chat", response_model=ChatResponse)
async def send_message(request: ChatRequest, db: Session = Depends(get_db)):
    """
    发送消息并获取回复
    
    流程：
    1. 保存用户消息
    2. 使用判别器判断是否需要人工介入
    3. 如需人工 -> 返回等待状态
    4. 如不需要 -> 生成机器回答
    """
    # 获取或创建对话
    conversation = get_or_create_conversation(db, request.session_id)
    
    # 保存用户消息
    user_message = Message(
        conversation_id=conversation.id,
        content=request.content,
        message_type="user",
        needs_human=False
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # 使用判别器判断
    needs_human, confidence = discriminator.needs_human(request.content)
    
    if needs_human:
        # 需要人工介入 - 返回等待状态
        reply_message = Message(
            conversation_id=conversation.id,
            content="您的问题需要人工专家处理，请稍候...",
            message_type="waiting",
            needs_human=True
        )
    else:
        # 机器可以回答
        machine_response = discriminator.get_machine_response(request.content)
        reply_message = Message(
            conversation_id=conversation.id,
            content=machine_response,
            message_type="machine",
            needs_human=False
        )
    
    db.add(reply_message)
    db.commit()
    db.refresh(reply_message)
    
    return ChatResponse(
        user_message=message_to_response(user_message),
        reply_message=message_to_response(reply_message)
    )


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest, db: Session = Depends(get_db)):
    """
    提交用户反馈（点赞/点踩）
    
    如果机器回答被踩，收集数据用于优化判别器
    """
    # 查找消息
    message = db.query(Message).filter(Message.id == request.message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")
    
    # 检查是否已有反馈
    existing_feedback = db.query(Feedback).filter(
        Feedback.message_id == request.message_id
    ).first()
    
    if existing_feedback:
        # 更新现有反馈
        existing_feedback.feedback_type = request.feedback_type.value
        db.commit()
    else:
        # 创建新反馈
        feedback = Feedback(
            message_id=request.message_id,
            feedback_type=request.feedback_type.value
        )
        db.add(feedback)
        db.commit()
    
    # 获取对话信息
    conversation = db.query(Conversation).filter(
        Conversation.id == message.conversation_id
    ).first()
    
    # 获取用户问题（上一条消息）
    user_message = db.query(Message).filter(
        Message.conversation_id == message.conversation_id,
        Message.message_type == "user",
        Message.id < message.id
    ).order_by(Message.id.desc()).first()
    
    question = user_message.content if user_message else ""
    
    # 收集数据
    if request.feedback_type.value == "dislike" and message.message_type == "machine":
        # 机器回答被踩 -> 收集数据优化判别器
        data_collector.record_negative_feedback(
            question=question,
            machine_answer=message.content,
            session_id=conversation.session_id,
            message_id=message.id
        )
    elif request.feedback_type.value == "like":
        # 正向反馈
        data_collector.record_positive_feedback(
            question=question,
            answer=message.content,
            answer_type=message.message_type,
            session_id=conversation.session_id,
            message_id=message.id
        )
    
    return FeedbackResponse(
        success=True,
        message=f"反馈已记录：{'👍 点赞' if request.feedback_type.value == 'like' else '👎 点踩'}"
    )


@router.post("/human-reply", response_model=HumanReplyResponse)
async def human_reply(request: HumanReplyRequest, db: Session = Depends(get_db)):
    """
    人工专家回复
    """
    # 查找等待中的消息
    waiting_message = db.query(Message).filter(
        Message.id == request.message_id,
        Message.message_type == "waiting"
    ).first()
    
    if not waiting_message:
        raise HTTPException(status_code=404, detail="未找到等待回复的消息")
    
    # 获取对话
    conversation = db.query(Conversation).filter(
        Conversation.id == waiting_message.conversation_id
    ).first()
    
    # 获取用户问题
    user_message = db.query(Message).filter(
        Message.conversation_id == waiting_message.conversation_id,
        Message.message_type == "user",
        Message.id < waiting_message.id
    ).order_by(Message.id.desc()).first()
    
    # 创建人工回复消息
    human_message = Message(
        conversation_id=waiting_message.conversation_id,
        content=request.content,
        message_type="human",
        needs_human=True
    )
    db.add(human_message)
    
    # 更新等待消息状态
    waiting_message.content = "已由人工专家回复"
    
    db.commit()
    db.refresh(human_message)
    
    # 记录人工回答
    if user_message:
        data_collector.record_human_answer(
            question=user_message.content,
            answer=request.content,
            session_id=conversation.session_id
        )
    
    return HumanReplyResponse(
        success=True,
        message=message_to_response(human_message)
    )


@router.get("/history/{session_id}", response_model=HistoryResponse)
async def get_history(session_id: str, db: Session = Depends(get_db)):
    """
    获取对话历史
    """
    conversation = db.query(Conversation).filter(
        Conversation.session_id == session_id
    ).first()
    
    if not conversation:
        return HistoryResponse(session_id=session_id, messages=[])
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at).all()
    
    return HistoryResponse(
        session_id=session_id,
        messages=[message_to_response(m) for m in messages]
    )


@router.get("/statistics")
async def get_statistics():
    """
    获取数据收集统计信息
    """
    return data_collector.get_statistics()


@router.post("/new-session")
async def new_session():
    """
    创建新会话
    """
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}
