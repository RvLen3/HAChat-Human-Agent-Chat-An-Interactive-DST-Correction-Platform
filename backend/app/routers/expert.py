'''专家端相关的API'''
from fastapi import APIRouter
from app.schemas.chat import ExpertResolveRequest
from app.db.memory import pending_tasks_db, already_tasks_db

router = APIRouter()

@router.get("/tasks")
async def get_expert_tasks():
    return {"tasks": pending_tasks_db}

@router.post("/resolve")
async def expert_resolve(req: ExpertResolveRequest):
    print(f" 专家提交修正: {req.session_id}")
    for i, task in enumerate(pending_tasks_db):
        if task['session_id'] == req.session_id:
            pending_tasks_db.pop(i)
            # 放入已完成队列
            already_tasks_db.append({'session_id': req.session_id, 'predicted_slots': req.corrected_slots})
            return {"success": True}
    return {"success": False}