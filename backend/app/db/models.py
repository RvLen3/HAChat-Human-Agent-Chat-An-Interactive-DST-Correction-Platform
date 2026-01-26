'''存放数据库模型'''
from sqlalchemy import Column, Integer, String
from app.db.database import Base 

class User(Base):
    __tablename__ = "users" 

    id = Column(Integer, primary_key=True, index=True) # 唯一分配的ID，目前先和email保持一致
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)