from sqlalchemy.orm import Session
from app.db.models import User
from app.core.security import get_password_hash
from sqlalchemy.exc import IntegrityError # 专门捕获唯一性约束冲突(如重复注册)

def get_user_by_email(db: Session, email: str):
    """
    通用函数：根据邮箱查找用户
    返回：User 对象 OR None
    """
    return db.query(User).filter(User.email == email).first()


def get_user_count(db: Session) -> int:
    """
    查询数据库中用户的总数量
    """
    return db.query(User).count()

def insert_user(db: Session, username: str, email: str, password: str):
    db_user = User(
        username=username, 
        email=email, 
        hashed_password=get_password_hash(password)
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user) 
        return db_user
    except IntegrityError:
        db.rollback() # 回滚，清理现场
        print(f"注册失败: 用户名 {username} 或邮箱 {email} 已存在")
        return None 
        
    except Exception as e:
        # 捕获其他未知错误（如数据库断连）
        db.rollback() # 回滚
        print(f"数据库未知错误: {e}")
        raise e 
