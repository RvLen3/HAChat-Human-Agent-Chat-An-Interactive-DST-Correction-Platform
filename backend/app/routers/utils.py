'''一些通用的工具函数接口'''
from fastapi import APIRouter
from app.db.database import get_db
from sqlalchemy.orm import Session
from app.db.cruds import get_user_count
from fastapi import Depends


router = APIRouter()

@router.get('/get_user_num')
async def get_user_num(db:Session = Depends(get_db)):
    return {"user_num": get_user_count(db)}