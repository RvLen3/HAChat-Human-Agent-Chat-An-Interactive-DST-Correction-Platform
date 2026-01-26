
# HA-Chat 🤖

HA-Chat 是一个基于 **React** 和 **FastAPI** 构建的全栈智能对话助手系统。项目集成了安全的用户身份验证、动态交互界面以及可扩展的后端架构。

## ✨ 主要功能

* **用户认证系统**：支持用户注册与登录，使用 JWT (JSON Web Token) 进行安全验证。
* **现代化 UI/UX**：基于 Tailwind CSS 设计的响应式界面，配合 Framer Motion 实现丝滑的动画效果。
* **智能对话**：提供实时聊天界面（Chat Page）。
* **权限管理**：前端路由守卫（RequireAuth），保护隐私页面不被未登录访问。
* **后台管理**：集成 SQLAlchemy ORM，支持用户数据管理。

## 🛠 技术栈

### 前端 (Frontend)

* **React 18**
* **React Router v6**: 路由管理
* **Tailwind CSS**: 样式框架
* **Framer Motion**: 动画库
* **Lucide React**: 图标库

### 后端 (Backend)

* **FastAPI**: 高性能 Python Web 框架
* **SQLAlchemy**: 数据库 ORM
* **Pydantic**: 数据验证
* **Python-Jose**: JWT 生成与解析
* **Passlib (Bcrypt)**: 密码哈希加密

## 🚀 快速开始

### 1. 环境准备

确保你的本地已安装：

* Node.js & npm
* Python 3.8+
* Git

### 2. 后端设置 (Backend)

```bash
cd backend

# 创建虚拟环境 (可选但推荐)
python -m venv venv
# Windows 激活虚拟环境: venv\Scripts\activate
# Mac/Linux 激活虚拟环境: source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
# 请在 backend 目录下新建 .env 文件，并填入以下内容:
# SECRET_KEY=你的密钥
# DATABASE_URL=sqlite:///./sql_app.db

# 启动服务器
uvicorn app.main:app --reload

```

*后端服务将运行在: `http://localhost:8000*`

### 3. 前端设置 (Frontend)

```bash
cd frontend  # (或者你的前端文件夹名字)

# 安装依赖
npm install

# 启动开发服务器
npm run dev

```

*前端页面将运行在: `http://localhost:5173*`

## 📂 项目结构

```
H_AChat/
├── backend/
│   ├── app/
│   │   ├── core/       # 核心配置 (Security, Config)
│   │   ├── db/         # 数据库模型与 CRUD
│   │   ├── routers/    # API 路由 (Auth, Chat, Expert)
│   │   ├── services/   # 业务逻辑层
│   │   └── main.py     # 入口文件
│   ├── requirements.txt
│   └── .env            # (不要上传此文件到 GitHub)
├── frontend/
│   ├── src/
│   │   ├── components/ # 公共组件
│   │   ├── pages/      # 页面 (Login, Chat, Home)
│   │   └── App.js      # 路由配置
│   └── package.json
└── README.md
```

## 📝 开发者日志

* **v0.1**: 完成了前端页面以及API接口的初步设计，实现了最基本的对话以及slot修改功能。
* **v0.2**: 完成了登录部分以及用户cookie信息的检查，实现了数据库相关模块和一些小细节的完善。
