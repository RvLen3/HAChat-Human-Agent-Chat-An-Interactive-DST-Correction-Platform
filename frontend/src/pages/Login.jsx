import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Bot, User } from 'lucide-react';

const CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api/auth', // 确保端口号和你后端一致
}

const apiService = {
    // 修复：直接接收处理好的 payload，不再在内部做字段映射，保持纯粹
    auth: async (payload) => {
        try {
            console.log("👉 发送给后端的 Payload:", payload); // Debug日志

            const response = await fetch(`${CONFIG.API_BASE_URL}/auth_user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("❌ API 报错详情:", data);
                throw new Error(data.detail || "请求失败");
            }

            return data;
        } catch (error) {
            console.error("❌ 网络或系统错误:", error);
            throw error;
        }
    }
}

export default function LoginPage() {
    const navigate = useNavigate();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log("🚀 开始提交, 当前模式:", isLoginMode ? "登录" : "注册");

            // 1. 基础校验
            if (!formData.email || !formData.password) {
                throw new Error('请填写邮箱和密码');
            }
            if (!isLoginMode && !formData.name) {
                throw new Error('注册模式下需要填写用户名');
            }

            // 2. 构造 Payload (根据后端逻辑：有 username=注册，无 username=登录)
            // 登录时只传 email 和 password
            // 注册时传 username, email, password
            const payload = {
                email: formData.email,
                password: formData.password,
                // 如果是注册模式，传入 name 作为 username；如果是登录，传入 null 或不传
                username: isLoginMode ? null : formData.name
            };

            // 3. 发送请求
            const response = await apiService.auth(payload);

            console.log("✅ 后端返回成功:", response);

            // 4. 处理成功的响应
            // 修正点：后端返回的是 access_token，不是 cookie，也不是 response.cookie
            if (response.access_token) {
                // 设置 Cookie (注意：这种手动设置不是最安全的，但在简单Demo中可用)
                document.cookie = `user_token=${response.access_token}; path=/; max-age=86400`; // 设置1天过期

                // 准备用户信息
                const userInfo = {
                    name: response.username || formData.name || 'User', // 优先用后端返回的名字
                    email: formData.email, // 补充 email 信息
                    role: 'user'
                };

                console.log("💾 正在保存用户信息并跳转:", userInfo);
                localStorage.setItem('user_info', JSON.stringify(userInfo));
                localStorage.setItem('user_token', response.access_token);

                console.log("存入 Token 成功，准备跳转...");
                // 5. 跳转
                navigate('/chat', {
                    state: { userData: userInfo }
                });
            } else {
                throw new Error("登录成功但未收到 Token");
            }

        } catch (err) {
            console.error("💀 捕获到错误:", err);
            setError(err.message || '操作失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setError('');
        // 切换模式时不一定要清空数据，看体验需求，这里保留不清空更友好
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* 背景动画 */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
            </div>

            <motion.div
                layout
                transition={{ duration: 0.3 }}
                className="bg-white/80 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-white/50 p-8 relative z-10"
            >
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-600/30">
                        <Bot size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {isLoginMode ? '欢迎回来' : '创建新账号'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-2">
                        {isLoginMode ? '登录您的 HA-Chat 账户' : '开启您的智能助手之旅'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 用户名输入框 (仅注册显示) */}
                    <AnimatePresence>
                        {!isLoginMode && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-2 mb-5">
                                    <label className="text-sm font-medium text-slate-700 ml-1">用户名</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            placeholder="您的称呼"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 邮箱 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">电子邮箱</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input
                                type="email"
                                required
                                placeholder="name@example.com"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 密码 */}
                    <div className="space-y-2">
                        <div className="flex justify-between ml-1">
                            <label className="text-sm font-medium text-slate-700">密码</label>
                            {isLoginMode && (
                                <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-medium">忘记密码?</a>
                            )}
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                处理中...
                            </>
                        ) : (
                            <>
                                {isLoginMode ? '立即登录' : '创建账号'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-500">
                    {isLoginMode ? '还没有账号? ' : '已有账号? '}
                    <button
                        onClick={toggleMode}
                        className="text-blue-600 font-semibold hover:text-blue-700 transition-colors underline-offset-4 hover:underline"
                    >
                        {isLoginMode ? '免费注册' : '直接登录'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}