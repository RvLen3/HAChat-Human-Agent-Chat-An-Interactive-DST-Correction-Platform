'''聊天界面相关的API接口，负责调用Service层的业务逻辑'''
from fastapi import APIRouter
from app.schemas.chat import UserInputRequest, ChatRequest
from app.services import chat as chat_service
from app.db.database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter()

@router.post("/classify")
async def chat_input(req: UserInputRequest,db:Session=Depends(get_db)):
    # db: Session, user_email: str, text: str, session_id: str, debug_mode: bool
    print(req)
    return await chat_service.process_chat_classify(db, req.email, req.text, req.session_id, req.debugMode)

@router.post('/answer')
async def chat_answer(req: ChatRequest,db:Session=Depends(get_db)):
    # 在这个函数内部将当前对话存到数据库中
    return await chat_service.process_chat_answer(db,req.session_id, req.slots, req.if_hard)

from fastapi import APIRouter, Depends, Query # 引入 Query

@router.get('/history') 
def get_user_chat_history(
    email: str = Query(..., description="用户的邮箱"), # 参数放这里
    db: Session = Depends(get_db)
): 
    '''根据用户id查询会话历史'''
    return chat_service.get_user_chat_history(db, email)

@router.post('/history/message') 
def insert_user_chat_history(
    req: UserInputRequest, 
    db: Session = Depends(get_db)
):
    return chat_service.insert_user_chat_history(
        db, 
        req.session_id, 
        req.email, 
        req.text,
        'user'
    )

# app/routers/history.py (假设你放在这里)

from app.db.models import ChatMessage # 记得导入模型
from sqlalchemy import asc

# 获取指定 Session 的所有消息详情
@router.get('/history/{session_id}/messages')
def get_session_details(session_id: str, db: Session = Depends(get_db)):
    # 按时间正序查询消息
    messages = db.query(ChatMessage)\
                 .filter(ChatMessage.session_id == session_id)\
                 .order_by(asc(ChatMessage.created_at))\
                 .all()
    
    if not messages:
        return []

    return [
        {
            "role": m.role,         
            "content": m.content,
            "source": "History",    # 历史记录统一标记来源
            "created_at": m.created_at
        }
        for m in messages
    ]