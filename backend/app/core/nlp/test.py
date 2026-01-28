# common import: convlab.$module.$model.$dataset
from convlab.base_models.t5.nlu import T5NLU
from convlab.base_models.t5.dst import T5DST
from convlab.base_models.t5.nlg import T5NLG
from convlab.policy.vector.vector_nodes import VectorNodes
from convlab.policy.vtrace_DPT import VTRACE
from convlab.dialog_agent import PipelineAgent, BiSession
from convlab.evaluator.multiwoz_eval import MultiWozEvaluator
from pprint import pprint
import random
import numpy as np
import torch
# go to README.md of each model for more information
sys_nlu = T5NLU(speaker='user', context_window_size=0, model_name_or_path='ConvLab/t5-small-nlu-multiwoz21')
sys_dst = T5DST(dataset_name='multiwoz21', speaker='user', context_window_size=100, model_name_or_path='ConvLab/t5-small-dst-multiwoz21')
# Download pre-trained DDPT model
# ! wget https://huggingface.co/ConvLab/ddpt-policy-multiwoz21/resolve/main/supervised.pol.mdl --directory-prefix="convlab/policy/vtrace_DPT"
vectorizer = VectorNodes(dataset_name='multiwoz21',
                         use_masking=True,
                         manually_add_entity_names=True,
                         seed=0,
                         filter_state=True)
sys_policy = VTRACE(is_train=False,
              seed=0,
              vectorizer=vectorizer,
              load_path="E:\H_AChat\ConvLab-3\convlab\policy\vtrace_DPT\supervised")
sys_nlg = T5NLG(speaker='system', context_window_size=0, model_name_or_path='ConvLab/t5-small-nlg-multiwoz21')
# assemble
sys_agent = PipelineAgent(sys_nlu, sys_dst, sys_policy, sys_nlg, name='sys')