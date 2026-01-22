"""
数据库配置
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 数据库文件路径
DATABASE_DIR = os.path.dirname(__file__)
DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'data', 'chat.db')}"

# 确保数据目录存在
os.makedirs(os.path.join(DATABASE_DIR, 'data'), exist_ok=True)

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}  # SQLite需要此配置
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """初始化数据库表"""
    from . import models  # 导入模型以注册表
    Base.metadata.create_all(bind=engine)
