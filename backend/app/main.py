from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, expert,auth,utils
from app.db import models
from app.db.database import engine,Base 

Base.metadata.create_all(bind=engine)
app = FastAPI()

# 跨域配置
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# 注册路由
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(expert.router, prefix="/api/expert", tags=["Expert"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(utils.router,prefix="/api/utils",tags=["Utils"])


if __name__ == "__main__":
    import uvicorn
    # 注意：如果目录结构改变，启动命令可能需要调整，建议在 backend 目录下运行
    uvicorn.run(app, host="0.0.0.0", port=8000)

# run this project : cd backend/   uvicorn app.main:app --reload