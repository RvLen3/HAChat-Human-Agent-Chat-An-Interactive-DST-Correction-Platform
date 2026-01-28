'''存放sklearn补丁，下载模型，初始化模型。单例模式，保证模型只加载一次'''

import sys
import types
import importlib
import sklearn.svm
import os
import requests
import torch
import torch.nn as nn

# ==========================================
# 1. Monkey Patching (必须最先执行)
# ==========================================
sys.modules['sklearn.svm.classes'] = sklearn.svm
try:
    import imp
except ImportError:
    fake_imp = types.ModuleType("imp")
    fake_imp.reload = importlib.reload
    fake_imp.import_module = importlib.import_module
    sys.modules["imp"] = fake_imp

# ==========================================
# 2. ConvLab Imports & Download
# ==========================================
try:
    from convlab.base_models.t5.nlu import T5NLU
    from convlab.base_models.t5.dst import T5DST
    from convlab.base_models.t5.nlg import T5NLG
    from convlab.policy.vector.vector_nodes import VectorNodes
    from convlab.policy.vtrace_DPT import VTRACE
except ImportError:
    print("Warning : Could not find ConvLab-3 models.")

def check_and_download_policy():
    """
    检查并下载 VTRACE 策略模型
    返回: 文件的完整路径 (例如 .../supervised.pol.mdl)
    """
    model_dir = "convlab/policy/vtrace_DPT"
    file_name = "supervised.pol.mdl"
    file_path = os.path.join(model_dir, file_name)
    
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
    return file_path

# ==========================================
# 3. Initialize Models
# ==========================================
print("正在加载 ConvLab-3 模型 ...")
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f" 运行设备: {DEVICE}")

# 3.1 初始化 NLU, DST, NLG
sys_nlu = T5NLU(
    speaker='user',
    context_window_size=0, 
    model_name_or_path='ConvLab/t5-small-nlu-multiwoz21',
    device=DEVICE
)

sys_dst = T5DST(
    dataset_name='multiwoz21',
    speaker='user',
    context_window_size=100, 
    model_name_or_path='ConvLab/t5-small-dst-multiwoz21',
    device=DEVICE
)

sys_nlg = T5NLG(
    speaker='system',
    context_window_size=0, 
    model_name_or_path='ConvLab/t5-small-nlg-multiwoz21',
    device=DEVICE
)

# 3.2 初始化 VectorNodes
vectorizer = VectorNodes(
    dataset_name='multiwoz21',
    use_masking=True, 
    manually_add_entity_names=True,
    seed=0,
    filter_state=True
)

# 3.3 初始化 Policy（保留你原来的能成功加载方式）
print("⚡ 正在初始化 Policy 模型...")


sys_policy = VTRACE(is_train=False,
              seed=0,
              vectorizer=vectorizer,
              load_path="E:\H_AChat\ConvLab-3\convlab\policy\vtrace_DPT\supervised")
print("✅ Policy 模型加载完成")
print(" 所有模型加载完毕")
