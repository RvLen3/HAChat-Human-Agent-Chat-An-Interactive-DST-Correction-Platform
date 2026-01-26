'''核心业务逻辑层'''
import time
import random
import copy
import asyncio
from typing import Dict, Any

from app.core.nlp.models import sys_nlu, sys_dst, sys_policy, sys_nlg
from app.core.nlp.session import get_or_init_session
from app.db.memory import pending_tasks_db, already_tasks_db
from app.db.cruds import get_user_by_email
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.models import ChatSession

async def process_chat_classify(text: str, session_id: str, debug_mode: bool):
    print(f"\n[{text}] 收到分析请求...")
    
    # 获取会话
    current_session_id = f"session_{int(time.time())}_{random.randint(1,100)}" if not session_id else session_id
    session_data = get_or_init_session(current_session_id)
    
    # 1. 恢复 DST 状态
    sys_dst.state = copy.deepcopy(session_data['dst_state'])

    sys_dst.state['history'].append(f"User:{text}")
    
    # 2. NLU 预测
    nlu_output = sys_nlu.predict(text)
    print(f"🔹 NLU 识别结果: {nlu_output}")
    
    # 3. DST 更新状态
    state = sys_dst.update()
    print('dst_state:', state)
    
    # 4. 保存状态回内存
    session_data['dst_state'] = copy.deepcopy(state)
    
    # 5. 提取槽位
    current_slots = state.get('belief_state', {})
    print(f"🔸 DST 提取槽位: {current_slots}")

    # 6. (兜底策略) NLU 补丁
    if not current_slots and nlu_output:
        print("⚠️ 警告: DST 未提取到槽位，尝试从 NLU 结果构建临时展示数据...")
        temp_slots = {}
        for act in nlu_output:
            if len(act) >= 4:
                domain, slot, value = act[1].lower(), act[2].lower(), act[3].lower()
                if domain not in temp_slots: temp_slots[domain] = {}
                temp_slots[domain][slot] = value
        if temp_slots:
            print(f" 使用 NLU 补丁槽位: {temp_slots}")
            current_slots = temp_slots

    # 判别器逻辑
    if_hard = True if debug_mode else (random.random() > 0.5)

    if if_hard:
        print(" 判定为困难任务 -> 转接专家")
        pending_tasks_db.append({
            'session_id': current_session_id,
            'predicted_slots': current_slots,
            'user_text': text,
            'timestamp': time.time()
        })
        return {
            'action': 'WAIT_FOR_EXPORT',
            'message': '正在转接人工专家...',
            'data': {'session_id': current_session_id, 'predicted_slots': current_slots}
        }
    else:
        print(" 判定为简单任务 -> AI 回答")
        return {
            'action': 'AI_ANSWERING',
            'message': 'AI生成中...',
            'data': {'session_id': current_session_id, 'predicted_slots': current_slots}
        }

def check_expert_completion(session_id: str):
    """检查专家是否完成任务"""
    for i in range(len(already_tasks_db)):
        if already_tasks_db[i]['session_id'] == session_id:
            slots = already_tasks_db[i]['predicted_slots']
            already_tasks_db.pop(i)
            return slots, True
    return None, False

async def process_chat_answer(session_id: str, slots: Dict[str, Any], if_hard: bool):
    session_data = get_or_init_session(session_id)
    
    if if_hard:
        timeout = 0
        key = False
        print(f" 等待专家处理 Session: {session_id}")
        while not key and timeout < 60:
            await asyncio.sleep(1)
            slots, key = check_expert_completion(session_id)
            timeout += 1

        if timeout >= 60:
            return {"content": "专家超时", "source": "ERROR"}
        print(f" 收到专家修正槽位: {slots}")

    # 生成回答
    current_state = copy.deepcopy(session_data['dst_state'])
    
    # 强行覆盖 DST 状态 (专家修正生效)
    if if_hard and slots:
        current_state['belief_state'] = slots
        session_data['dst_state'] = copy.deepcopy(current_state)
    
    # Policy
    sys_policy.vector.state = current_state
    sys_action = sys_policy.predict(current_state)
    print(f" Policy 决策: {sys_action}")
    
    # NLG
    response_text = sys_nlg.generate(sys_action)
    print(f" System 回复: {response_text}")
    
    # 更新历史记录
    current_state['history'].append(f"System: {response_text}")
    session_data['dst_state'] = copy.deepcopy(current_state)
    
    return {
        "content": response_text,
        "source": 'Export' if if_hard else 'AI-Agent'
    }

# TODO 和数据库相关的操作不要用异步,后续做完后可能需要修改，目前先按这个来
# 获取用户的历史聊天记录用于展示
def get_user_chat_history(db: Session, user_email: str, limit: int = 20):
    """
    根据用户email查询会话历史,返回近期的几个对话
    
    参数:
    - limit: 限制返回的数量，默认最近20条
    """
    user = get_user_by_email(db, user_email)
    if not user:
        return [] # 或者抛出 HTTPException

    sessions = db.query(ChatSession)\
                 .filter(ChatSession.user_id == user.id)\
                 .order_by(desc(ChatSession.updated_at))\
                 .limit(limit)\
                 .all()
    
    return [
        {
            "session_id": s.session_id, 
            "title": s.title or "新会话"  # 这里还可以顺便处理一下空标题
        } 
        for s in sessions
    ]


# 1. 存聊天记录
def insert_user_chat_history(db: Session, session_id: str, user_email: str, content: str,role: str):
    """
    存入用户发送的消息
    参数 content: 即原代码中的 Message，改为 content 更符合语义
    """
    
    # 2. 统一获取一次时间，确保 session 和 message 的时间严格一致
    current_time = datetime.utcnow()

    # 查用户
    user = get_user_by_email(db, user_email)
    if not user:
        print(f"Error: User {user_email} not found.")
        return False

    try:
        # --- 处理会话 (Session) ---
        chat_session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        
        if not chat_session:
            # 如果是新会话，创建它
            # 处理标题：如果内容太长，截取前50个字符作为标题
            session_title = content[:50] + "..." if len(content) > 50 else content
            
            chat_session = ChatSession(
                session_id=session_id, 
                user_id=user.id, 
                title=session_title,
                created_at=current_time,
                updated_at=current_time
            )
            db.add(chat_session)
        else:
            # 如果会话已存在，仅更新时间
            chat_session.updated_at = current_time
            # SQLAlchemy 会自动追踪 chat_session 的变化，
            # 这里不需要再次 db.add(chat_session)，但写了也没错。

        # --- 处理消息 (Message) ---
        new_message = ChatMessage(
            session_id=session_id, 
            role=role, 
            content=content,
            created_at=current_time
            # agent_state 和 expert_state 默认为 None 或数据库默认值
        )
        db.add(new_message)

        # 3. 原子性提交：只 commit 一次
        db.commit()
        
        # 刷新对象以获取数据库生成的 ID (可选，如果你后续需要用到 new_message.id)
        db.refresh(new_message) 
        
        return True

    except Exception as e:
        # 4. 异常处理：如果中间出错，回滚所有操作
        db.rollback()
        print(f"Database Insert Error: {e}")
        return False