'''核心业务逻辑层'''
import time
import random
import copy
import asyncio
from typing import Dict, Any

# 引入我们拆分出去的模块
from app.core.nlp.models import sys_nlu, sys_dst, sys_policy, sys_nlg
from app.core.nlp.session import get_or_init_session
from app.db.memory import pending_tasks_db, already_tasks_db

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