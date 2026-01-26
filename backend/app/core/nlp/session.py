'''管理session的初始化和获取'''
import copy
from app.db.memory import SESSION_MEMORY, session_ids
from app.core.nlp.models import sys_dst, sys_policy # 引入初始化好的模型

def get_or_init_session(session_id: str):
    if session_id not in session_ids:
        # 初始化一个新的 DST 状态
        session_ids.append(session_id)
        sys_dst.init_session()
        # 初始化 Policy 状态
        sys_policy.init_session()
        
        # 使用 deepcopy 防止引用污染
        SESSION_MEMORY[session_id] = {
            "dst_state": copy.deepcopy(sys_dst.state),
            "policy_state": None, 
            "history": [] 
        }
    return SESSION_MEMORY[session_id]