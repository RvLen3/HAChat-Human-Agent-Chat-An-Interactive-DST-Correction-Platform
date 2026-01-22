from sqlalchemy.orm import Session
from . import models, schemas
import uuid
from datetime import datetime


def get_or_create_conversation(db: Session, session_id: str = None):
    """获取或创建对话会话"""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    conversation = db.query(models.Conversation).filter(
        models.Conversation.session_id == session_id
    ).first()
    
    if not conversation:
        conversation = models.Conversation(session_id=session_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    return conversation


def discriminator(content: str) -> bool:
    """
    判别器：判断是否需要人工介入
    返回 True 表示需要人工，False 表示机器可以处理
    
    当前使用简单规则模拟，后续可以替换为机器学习模型
    """
    # 关键词检测
    human_keywords = ["投诉", "紧急", "经理", "人工", "转人工", "专家", "退款", "法律"]
    for keyword in human_keywords:
        if keyword in content:
            return True
    
    # 长度检测（超过100字的复杂问题）
    if len(content) > 100:
        return True
    
    # 问号数量（多个问题）
    if content.count("？") + content.count("?") >= 3:
        return True
    
    return False


def generate_auto_response(content: str) -> str:
    """生成自动回复（简单模拟）"""
    responses = {
        "你好": "您好！我是智能助手，很高兴为您服务。有什么可以帮您的吗？",
        "帮助": "我可以回答您的问题，提供信息查询等服务。如果问题复杂，我会为您转接人工专家。",
        "谢谢": "不客气！如果还有其他问题，随时可以问我。",
    }
    
    # 简单关键词匹配
    for key, response in responses.items():
        if key in content:
            return response
    
    # 默认回复
    return f"我了解到您的问题了。这是一个关于「{content[:20]}...」的询问，我会尽力帮您解答。"


def create_message(db: Session, content: str, session_id: str = None):
    """创建消息并处理回复逻辑"""
    # 获取或创建会话
    conversation = get_or_create_conversation(db, session_id)
    
    # 保存用户消息
    user_message = models.Message(
        conversation_id=conversation.id,
        role="user",
        content=content,
        needs_human=False
    )
    db.add(user_message)
    db.commit()
    
    # 判别是否需要人工介入
    needs_human = discriminator(content)
    
    if needs_human:
        # 需要人工介入
        assistant_message = models.Message(
            conversation_id=conversation.id,
            role="assistant",
            content="您的问题比较复杂，我已为您转接人工专家，请稍等片刻...",
            response_type=models.ResponseType.PENDING,
            needs_human=True
        )
    else:
        # 机器自动回复
        auto_response = generate_auto_response(content)
        assistant_message = models.Message(
            conversation_id=conversation.id,
            role="assistant",
            content=auto_response,
            response_type=models.ResponseType.AUTO,
            needs_human=False
        )
    
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)
    
    return conversation.session_id, assistant_message


def get_chat_history(db: Session, session_id: str):
    """获取对话历史"""
    conversation = db.query(models.Conversation).filter(
        models.Conversation.session_id == session_id
    ).first()
    
    if not conversation:
        return []
    
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation.id
    ).order_by(models.Message.created_at).all()
    
    # 检查每条消息是否有反馈
    result = []
    for msg in messages:
        msg_dict = schemas.MessageResponse.from_orm(msg)
        msg_dict.has_feedback = len(msg.feedbacks) > 0
        result.append(msg_dict)
    
    return result


def create_feedback(db: Session, message_id: int, feedback_type: models.FeedbackType):
    """创建反馈"""
    # 检查消息是否存在
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message:
        return None
    
    # 检查是否已经有反馈
    existing_feedback = db.query(models.Feedback).filter(
        models.Feedback.message_id == message_id
    ).first()
    
    if existing_feedback:
        # 更新现有反馈
        existing_feedback.feedback_type = feedback_type
        db.commit()
        db.refresh(existing_feedback)
        return existing_feedback
    
    # 创建新反馈
    feedback = models.Feedback(
        message_id=message_id,
        feedback_type=feedback_type
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    return feedback


def create_human_reply(db: Session, session_id: str, content: str):
    """人工专家回复"""
    conversation = db.query(models.Conversation).filter(
        models.Conversation.session_id == session_id
    ).first()
    
    if not conversation:
        return None
    
    # 查找最后一条 pending 消息并更新
    pending_message = db.query(models.Message).filter(
        models.Message.conversation_id == conversation.id,
        models.Message.response_type == models.ResponseType.PENDING
    ).order_by(models.Message.created_at.desc()).first()
    
    if pending_message:
        pending_message.content = content
        pending_message.response_type = models.ResponseType.HUMAN
        db.commit()
        db.refresh(pending_message)
        return pending_message
    
    # 如果没有 pending 消息，创建新的人工回复
    human_message = models.Message(
        conversation_id=conversation.id,
        role="assistant",
        content=content,
        response_type=models.ResponseType.HUMAN,
        needs_human=False
    )
    db.add(human_message)
    db.commit()
    db.refresh(human_message)
    
    return human_message
