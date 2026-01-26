// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 引入页面
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import ExpertPage from './pages/Expert';

// 引入刚才新建的鉴权组件
import RequireAuth from './pages/RequireAuth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 首页 */}
        <Route path="/" element={<HomePage />} />

        {/* 登录页 */}
        <Route path="/login" element={<Login />} />

        {/* 专家页 */}
        <Route path="/expert" element={<ExpertPage />} />

        {/* --- 重点：聊天页 (受保护) --- */}
        {/* 这种写法是 V6 中最推荐的：直接把 RequireAuth 包在外面 */}
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;