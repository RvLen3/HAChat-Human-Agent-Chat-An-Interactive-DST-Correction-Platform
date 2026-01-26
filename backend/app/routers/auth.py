'''用户登陆注册相关的API接口'''
from fastapi import APIRouter,Depends
from app.schemas.chat import UserInputRequest, ChatRequest,AuthRequest
from app.services import auth as auth_service
from app.db.database import get_db
from sqlalchemy.orm import Session

router = APIRouter()

@router.post('/auth_user')
def auth_user(req: AuthRequest, db: Session = Depends(get_db)):
    return auth_service.authenticate_user(
        db=db,
        email=req.email,
        password=req.password,
        username=req.username
    )