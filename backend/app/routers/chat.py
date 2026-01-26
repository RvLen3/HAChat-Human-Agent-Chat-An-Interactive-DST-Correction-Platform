'''聊天界面相关的API接口，负责调用Service层的业务逻辑'''
from fastapi import APIRouter
from app.schemas.chat import UserInputRequest, ChatRequest
from app.services import chat as chat_service

router = APIRouter()

@router.post("/classify")
async def chat_input(req: UserInputRequest):
    return await chat_service.process_chat_classify(req.text, req.session_id, req.debugMode)

@router.post('/answer')
async def chat_answer(req: ChatRequest):
    return await chat_service.process_chat_answer(req.session_id, req.slots, req.if_hard)