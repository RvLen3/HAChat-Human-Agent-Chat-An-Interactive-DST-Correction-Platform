'''存放数据库模型'''
from sqlalchemy import Column, Integer, String,Boolean,ForeignKey,DateTime
from app.db.database import Base 
from datetime import datetime
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users" 

    id = Column(Integer, primary_key=True, index=True) 
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# 用户Session对应表[查近期对话]
# class UserSession(Base):
#     __tablename__ = "user_session"
#     '''具体流程:根据用户id查询所有的会话id,并根据created_time进行排序，将靠前的几个会话id以及第一句对话的内容返回给前端,前端点击后会更新当前的session_id,并根据session_id查询会话详情'''
#     session_id = Column(String, ForeignKey("chat_session.session_id"))
#     user_id = Column(String, ForeignKey("users.id"))
 

# 会话本身[宏观信息]
class ChatSession(Base):
    __tablename__ = "chat_session"
    user_id = Column(Integer, ForeignKey("users.id"),index=True)
    title = Column(String(100),nullable=True) # 会话标题，用户历史记录栏展示，通常是第一句话[更科学可以用AI生成摘要,这个回头再说吧~]
    session_id = Column(String,primary_key=True,index=True)
    user_rating = Column(Integer,default=0,comment="0:未评分, 1:满意, 2:不满意") # 注意不要传成Bool
    created_at = Column(DateTime,default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) # 更新时间(用户发新消息时更新这个时间，让会话顶到最上面)
    messages = relationship("ChatMessage", back_populates="session")

# 具体的对话    
class ChatMessage(Base): # 修正类名
    __tablename__ = "chat_messages" # 修正表名

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_session.session_id"))
    role = Column(String)
    content = Column(String)

    # dict: {"slot_name": "value"}
    # Agent生成的slot
    agent_state = Column(String, nullable=True) 
    
    # Expert修正的slot
    expert_state = Column(String, default='No', nullable=True) 

    created_at = Column(DateTime, default=datetime.utcnow) 

    session = relationship("ChatSession", back_populates="messages") 


    
    
    