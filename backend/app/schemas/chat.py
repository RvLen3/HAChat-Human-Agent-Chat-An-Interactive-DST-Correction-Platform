'''存放所有用户聊天相关的BaseModel定义
算了,偷个懒，将所有的BaseModel都放在一起了[反正也没几个^^]'''
from pydantic import BaseModel
from typing import Dict, Any, Optional

class ChatRequest(BaseModel):
    text: str
    session_id: str
    slots: Dict[str, Any] = {}
    if_hard: bool = False  

class UserInputRequest(BaseModel):
    text: str
    debugMode: bool
    session_id: Optional[str] = None

class ExpertResolveRequest(BaseModel):
    session_id: str
    corrected_slots: Optional[Dict[str, Any]] = {}

# 登陆注册共用同一个Model
class AuthRequest(BaseModel):
    username: Optional[str] = None # 可选,注册页面提交时有username,登录时没有，直接根据email从从后端返回
    email: str
    password: str
