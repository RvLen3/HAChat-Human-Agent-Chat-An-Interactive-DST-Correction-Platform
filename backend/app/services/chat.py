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
from app.db.models import ChatSession,ChatMessage
import json
from datetime import datetime


async def process_chat_classify(db: Session, user_email: str, text: str, session_id: str, debug_mode: bool):
    print(f"\n[{text}] 收到分析请求...")
    
    # 1. 确保有 Session ID
    # 如果前端没传 session_id，后端生成一个新的
    current_session_id = f"session_{int(time.time())}_{random.randint(1,100)}" if not session_id else session_id
    

    save_chat_message(
        db=db,
        session_id=current_session_id, 
        content=text,
        role="user",
        user_email=user_email 
    )

    # 获取内存中的会话状态
    session_data = get_or_init_session(current_session_id)
    
    # 2. 恢复 DST 状态
    sys_dst.state = copy.deepcopy(session_data['dst_state'])
    sys_dst.state['history'].append(f"User:{text}")
    
    # 3. NLU 预测
    nlu_output = sys_nlu.predict(text)
    print(f"🔹 NLU 识别结果: {nlu_output}")
    
    # 4. DST 更新状态
    state = sys_dst.update()
    # print('dst_state:', state)
    
    # 5. 保存状态回内存
    session_data['dst_state'] = copy.deepcopy(state)
    
    # 6. 提取槽位
    print('state:',state)
    current_slots = state.get('belief_state', {})
    print(f"🔸 DST 提取槽位: {current_slots}")

    # 7. (兜底策略) NLU 补丁
    if not current_slots and nlu_output:
        print(" warning: DST 未提取到槽位，尝试从 NLU 结果构建临时展示数据...")
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



async def process_chat_answer(db: Session, session_id: str, slots: Dict[str, Any], if_hard: bool):
    
    # 1. 备份 Agent 原始生成的 Slots (用于存入数据库 agent_state)
    agent_original_slots = copy.deepcopy(slots)
    expert_final_slots = None # 初始化专家 Slot

    # 获取内存中的会话状态
    session_data = get_or_init_session(session_id)

    # --- 专家介入逻辑 ---
    if if_hard:
        timeout = 0
        key = False
        print(f"WAIT: 等待专家处理 Session: {session_id}")
        
        while not key and timeout < 60:
            await asyncio.sleep(1)
            # check_expert_completion 返回 (修正后的slots, True)
            current_slots, key = check_expert_completion(session_id) 
            timeout += 1

        if timeout >= 60:
            # 超时处理：这里也可以选择存一条错误消息到数据库，视需求而定
            return {"content": "专家响应超时，请稍后重试。", "source": "ERROR"}
        
        # 拿到专家提交的最终 Slots
        slots = current_slots 
        expert_final_slots = current_slots # 只有 Hard 模式下这个变量才会有值
        print(f"SUCC: 收到专家修正槽位: {slots}")

    # --- 生成回答逻辑 ---
    current_state = copy.deepcopy(session_data['dst_state'])
    
    # 如果是专家模式且有槽位，强行覆盖 DST 状态
    if if_hard and slots:
        current_state['belief_state'] = slots
        session_data['dst_state'] = copy.deepcopy(current_state)
    
    # Policy 决策
    sys_policy.vector.state = current_state
    sys_action = sys_policy.predict(current_state)
    print(f"Policy 决策: {sys_action}")
    
    # NLG 生成回复
    response_text = sys_nlg.generate(sys_action)
    print(f"System 回复: {response_text}")
    
    # 更新内存中的历史记录
    current_state['history'].append(f"System: {response_text}")
    session_data['dst_state'] = copy.deepcopy(current_state)

    
    save_chat_message(
        db=db,
        session_id=session_id,
        content=response_text,
        role="assistant",
        agent_slots=agent_original_slots,
        expert_slots=expert_final_slots if if_hard else None
        # user_email 不传，因为是系统回复且 Session 肯定存在
    )

    return {
        "content": response_text,
        "source": 'Export' if if_hard else 'AI-Agent',
        "session_id": session_id
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




def save_chat_message(
    db: Session, 
    session_id: str, 
    content: str, 
    role: str, 
    user_email: str = None, # 对于系统回复，如果会话已存在，email 可以不传
    agent_slots: dict = None, 
    expert_slots: dict = None,
):
    """
    通用的消息存储函数：既能存 User 消息，也能存 Agent/System 消息
    """
    current_time = datetime.utcnow()

    chat_session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()

    if not chat_session:
        if not user_email:
            print(f"Error: 无法创建新会话，缺少 user_email。SessionID: {session_id}")
            return False
            
        user = get_user_by_email(db, user_email)
        if not user:
            print(f"Error: User {user_email} not found.")
            return False

        # 创建新会话
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
        # 会话已存在，更新时间
        chat_session.updated_at = current_time

    try:
        # 处理 Slots 数据的序列化 (把这部分逻辑封装在这里)
        agent_state_str = None
        if agent_slots:
            agent_state_str = json.dumps(agent_slots, ensure_ascii=False)

        expert_state_str = None 
        if expert_slots:
            expert_state_str = json.dumps(expert_slots, ensure_ascii=False)
        else:
            expert_state_str = "No" # 这里不能用None,因为这样无法区分对于这条消息,专家是否修正过[比如消息是?这类无意义消息,可能真实的slot就是None]

        # 4. 创建消息
        new_message = ChatMessage(
            session_id=session_id, 
            role=role, 
            content=content,
            agent_state=agent_state_str,   # 新增
            expert_state=expert_state_str, # 新增
            created_at=current_time
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        return True

    except Exception as e:
        db.rollback()
        print(f"Database Insert Error: {e}")
        return False