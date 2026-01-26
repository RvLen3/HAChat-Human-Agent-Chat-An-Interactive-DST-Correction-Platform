'''聊天界面相关的API接口，负责调用Service层的业务逻辑'''
from fastapi import APIRouter
from app.schemas.chat import UserInputRequest, ChatRequest
from app.services import chat as chat_service
from app.db.database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter()

@router.post("/classify")
async def chat_input(req: UserInputRequest):
    return await chat_service.process_chat_classify(req.text, req.session_id, req.debugMode)

@router.post('/answer')
async def chat_answer(req: ChatRequest):
    return await chat_service.process_chat_answer(req.session_id, req.slots, req.if_hard)

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