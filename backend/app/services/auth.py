'''写一些用户身份验证相关的逻辑'''
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db import cruds
from app.core import security

def sign_up_verify(db,email,plain_password):
    # 检查email是否已经存在
    user = get_user_by_email(db,email)
    if user:
        return False
    return True



def authenticate_user(db: Session, email: str, password: str, username: Optional[str] = None):
    """
    通用认证入口：
    - 如果传了 username -> 视为注册 (Sign Up)
    - 没传 username -> 视为登录 (Login)
    """

    
    user = None # 用于存放最终认证成功的用户对象

    # 注册
    if username:
        if cruds.get_user_by_email(db, email):
             raise HTTPException(status_code=400, detail="Email already registered")
        
        user = cruds.insert_user(db, username=username, email=email, password=password)
        if not user:
            raise HTTPException(status_code=500, detail="Registration failed")

    else:
        user = cruds.get_user_by_email(db, email)
        
        if not user or not security.verify_password(password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = security.create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "username": user.username
    }