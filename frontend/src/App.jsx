// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 引入两个不同的页面
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage'; // <--- 引入你刚写的根页面
import Login from './pages/Login'
import ExportPage from './pages/Expert'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 首页,不确定是否需要(直接跳转到聊天页面似乎也行)  
            最好是加一个判断，如果发现登录的cookie则直接跳转到Chat页面 */}
        <Route path="/" element={<HomePage />} />

        {/* 聊天页面的路径 */}
        <Route path="/chat" element={<ChatPage />} />

        {/* 登陆页面 */}
        <Route path="/login" element={<Login />} />

        {/* 专家页面 */}
        <Route path="/expert" element={<ExportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;