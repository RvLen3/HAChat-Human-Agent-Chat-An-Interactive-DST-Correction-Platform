import sys
import types
import importlib
import sklearn.svm
import os
import requests
from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import time
from typing import Dict, Any, Optional
import random
import asyncio
import torch
import copy 
# TODO 专家评审设置，现在的检测逻辑有问题,是从后端判断这个session_id有没有被处理
sys.modules['sklearn.svm.classes'] = sklearn.svm
try:
    import imp
except ImportError:
    fake_imp = types.ModuleType("imp")
    fake_imp.reload = importlib.reload
    fake_imp.import_module = importlib.import_module
    sys.modules["imp"] = fake_imp


try:
    from convlab.base_models.t5.nlu import T5NLU
    from convlab.base_models.t5.dst import T5DST
    from convlab.base_models.t5.nlg import T5NLG
    from convlab.policy.vector.vector_nodes import VectorNodes
    from convlab.policy.vtrace_DPT import VTRACE
except ImportError:
    print("Warning : Could not find ConvLab-3 models.")


def check_and_download_policy():
    """检查并下载 VTRACE 策略模型"""
    model_dir = "convlab/policy/vtrace_DPT"
    file_path = os.path.join(model_dir, "supervised.pol.mdl")
    if not os.path.exists(model_dir):
        os.makedirs(model_dir, exist_ok=True)
    if not os.path.exists(file_path):
        print("📥 正在下载 VTRACE 策略模型...")
        url = "https://huggingface.co/ConvLab/ddpt-policy-multiwoz21/resolve/main/supervised.pol.mdl"
        try:
            r = requests.get(url, allow_redirects=True)
            with open(file_path, 'wb') as f:
                f.write(r.content)
            print(" 下载完成")
        except Exception as e:
            print(f" 下载失败: {e}")
            raise e
    return os.path.join(model_dir, "supervised")

print("正在加载 ConvLab-3 模型 ...")
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f" 运行设备: {DEVICE}")

# NLU:语义理解，生成slot和intent
sys_nlu = T5NLU(speaker='user', context_window_size=0, 
                model_name_or_path='ConvLab/t5-small-nlu-multiwoz21', device=DEVICE)

# DST:对话状态追踪
sys_dst = T5DST(dataset_name='multiwoz21', speaker='user', context_window_size=100, 
                model_name_or_path='ConvLab/t5-small-dst-multiwoz21', device=DEVICE)

# Policy:对话策略，根据当前状态生成动作
policy_load_path = check_and_download_policy()
vectorizer = VectorNodes(dataset_name='multiwoz21', use_masking=True, 
                         manually_add_entity_names=True, seed=0, filter_state=True)
sys_policy = VTRACE(is_train=False, seed=0, vectorizer=vectorizer, load_path=policy_load_path)

# NLG:根据当前的动作生成自然语言回答
sys_nlg = T5NLG(speaker='system', context_window_size=0, 
                model_name_or_path='ConvLab/t5-small-nlg-multiwoz21', device=DEVICE)

print(" 所有模型加载完毕")

# ==========================================
# 3. 会话状态管理 (核心修复点)
# ==========================================
SESSION_MEMORY = {}
session_ids = []
def get_or_init_session(session_id: str):
    if session_id not in session_ids:
        # 初始化一个新的 DST 状态
        session_ids.append(session_id)
        sys_dst.init_session()
        # 初始化 Policy 状态
        sys_policy.init_session()
        
        # 
        # T5DST 需要 history 有值，但 'null' 会干扰语义，用空字符串更安全
        # if not sys_dst.state['history']:
        #     sys_dst.state['history'] = [['', '']] 
        
        # --- 修复 3: 使用 deepcopy 防止引用污染 ---
        SESSION_MEMORY[session_id] = {
            "dst_state": copy.deepcopy(sys_dst.state), # <--- Deepcopy
            "policy_state": None, 
            "history": [] 
        }
    return SESSION_MEMORY[session_id]

# ==========================================
# 4. FastAPI 定义
# ==========================================
app = FastAPI()
api_router = APIRouter(prefix="/api")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ChatRequest(BaseModel):
    text: str
    session_id: str
    slots: Dict[str, Any] = {}
    if_hard: bool = False  

class UserInputRequest(BaseModel):
    text: str
    debugMode: bool
    session_id: Optional[str] = None

class ExpertResolveRequest(BaseModel):
    session_id: str
    corrected_slots: Optional[Dict[str, Any]] = {}

pending_tasks_db = []
already_tasks_db = []

def wait_for_export(session_id):
    for i in range(len(already_tasks_db)):
        if already_tasks_db[i]['session_id'] == session_id:
            slots = already_tasks_db[i]['predicted_slots']
            already_tasks_db.pop(i) # 一旦专家处理完成就将这个session从待处理页表拿出来，确保一个用于至多只有一个待处理
            return slots, True
    return None, False

# ==========================================
# 5. 接口实现
# ==========================================

@api_router.post("/chat/classify")
async def chat_input(req: UserInputRequest):
    print(f"\n[{req.text}] 收到分析请求...")
    
    # 获取会话
    current_session_id = f"session_{int(time.time())}_{random.randint(1,100)}" if not req.session_id else req.session_id
    session_data = get_or_init_session(current_session_id)
    # 1. 恢复 DST 状态 (使用 deepcopy)
    sys_dst.state = copy.deepcopy(session_data['dst_state']) # <--- Deepcopy

    sys_dst.state['history'].append(f"User:{req.text}")
    
    # 3. NLU 预测 :NLU仅作为前端展示，不参与T5DST计算！
    nlu_output = sys_nlu.predict(req.text)
    print(f"🔹 NLU 识别结果: {nlu_output}")
    
    # 4. DST 更新状态
    state = sys_dst.update()
    print('dst_state:',state)
    # 5. 保存状态回内存 (使用 deepcopy)
    session_data['dst_state'] = copy.deepcopy(state) # <--- Deepcopy
    
    # 6. 提取槽位
    current_slots = state.get('belief_state', {})
    print(f"🔸 DST 提取槽位: {current_slots}")  # <--- 调试：这里如果为空，说明DST没提取到

    # 7. (兜底策略) 如果 DST 为空但 NLU 识别到了，强行补丁一下给前端看
    # 注意：MultiWOZ 结构是 {Domain: {Slot: Value}}
    # NLU 输出格式通常是 [['inform', 'Restaurant', 'Food', 'chinese'], ...]
    # 这一步是为了让专家端不至于看到空白，方便调试
    if not current_slots and nlu_output:
        print("⚠️ 警告: DST 未提取到槽位，尝试从 NLU 结果构建临时展示数据...")
        # 简单转换逻辑 (仅用于可视化，不影响 DST 内部状态)
        temp_slots = {}
        for act in nlu_output:
            if len(act) >= 4: # ['inform', 'domain', 'slot', 'value']
                domain, slot, value = act[1].lower(), act[2].lower(), act[3].lower()
                if domain not in temp_slots: temp_slots[domain] = {}
                temp_slots[domain][slot] = value
        if temp_slots:
            print(f" 使用 NLU 补丁槽位: {temp_slots}")
            current_slots = temp_slots

    # 判别器逻辑
    if_hard = True if req.debugMode else (random.random() > 0.5)

    if if_hard:
        print(" 判定为困难任务 -> 转接专家")
        pending_tasks_db.append({
            'session_id': current_session_id,
            'predicted_slots': current_slots,
            'user_text': req.text,
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

@api_router.post('/chat/answer')
async def chat_answer(req: ChatRequest):
    hard = req.if_hard
    session_id = req.session_id
    slots = req.slots
    
    # 恢复会话
    session_data = get_or_init_session(session_id)
    
    if hard:
        timeout = 0
        key = False
        print(f" 等待专家处理 Session: {session_id}")
        while not key and timeout < 60:
            await asyncio.sleep(1) # 
            slots, key = wait_for_export(session_id)
            timeout += 1
        # TODO 这里暂定一旦专家处理完成就将这个session从待处理页表拿出来

        if timeout >= 60: return {"content": "专家超时", "source": "ERROR"}
        print(f" 收到专家修正槽位: {slots}")

    # ============================
    # 生成回答
    # ============================
    current_state = copy.deepcopy(session_data['dst_state']) # <--- Deepcopy
    
    # 强行覆盖 DST 状态 (专家修正生效)
    if hard and slots:
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
        "source": 'Export' if hard else 'AI-Agent'
    }

# 辅助接口
@api_router.get("/expert/tasks")
async def get_expert_tasks(): return {"tasks": pending_tasks_db}

@api_router.post("/expert/resolve")
async def expert_resolve(req: ExpertResolveRequest):
    global pending_tasks_db, already_tasks_db
    print(f" 专家提交修正: {req.session_id}")
    for i, task in enumerate(pending_tasks_db):
        if task['session_id'] == req.session_id:
            pending_tasks_db.pop(i)
            already_tasks_db.append({'session_id': req.session_id, 'predicted_slots': req.corrected_slots})
            return {"success": True}
    return {"success": False}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)