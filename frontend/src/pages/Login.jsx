import { registerUser } from '../services/authService';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // 引入动画库做切换效果
import { Mail, Lock, ArrowRight, Loader2, Bot, User } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();

    // === 1. 定义“模式开关” ===
    // true = 登录模式, false = 注册模式
    const [isLoginMode, setIsLoginMode] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    // 表单数据增加一个 name (注册时用)
    const [formData, setFormData] = useState({ name: '旅客1216', email: '', password: '' });
    const [error, setError] = useState('');



    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (isLoginMode) {
                // TODO 这一部分的API还没写，后续需要换成真实的API
                console.log("正在执行登录...", formData);

                await new Promise(resolve => setTimeout(resolve, 1000));

                if (formData.email && formData.password) {
                    // 1. 设置 Cookie
                    document.cookie = `user_token=mock-token; path=/`;

                    // 2. 准备用户信息对象
                    const loginUserInfo = {
                        name: formData.email.split('@')[0],
                        role: 'user'
                    };

                    // 3. 存入本地存储
                    localStorage.setItem('user_info', JSON.stringify(loginUserInfo));

                    // 4. 跳转 (带参数)
                    navigate('/chat', {
                        state: { userData: loginUserInfo }
                    });
                } else {
                    throw new Error('账号或密码错误');
                }

            } else {
                console.log("正在执行注册...", formData);

                // 1. 基础校验
                if (!formData.name || !formData.email || !formData.password) {
                    throw new Error('请填写完整注册信息');
                }

                // 2. 构造发送给后端的包 { ID, username, password }
                const payload = {
                    ID: Date.now().toString(), // 前端生成唯一ID
                    username: formData.name,   // 映射: name -> username
                    password: formData.password
                };

                // 3. await 等待后端响应 (这里会暂停，直到后端返回结果)
                const response = await registerUser(payload); //实际应该是一个结构体/json
                console.log("后端注册成功返回:", response);

                // 4. 注册成功后续处理
                if (response.success) {
                    document.cookie = `user_token=${response.cookie}; path=/`;


                    // 5. 定义用户信息对象 (修复了之前 userInfo 未定义的问题)
                    const newUserInfo = {
                        name: formData.name,
                        role: 'user'
                    };

                    // 6. 存入本地存储
                    localStorage.setItem('user_info', JSON.stringify(newUserInfo));

                    // 7. 跳转 (带参数)
                    navigate('/chat', {
                        state: { userData: newUserInfo }
                    });
                } else {
                    throw new Error('注册失败，这可能是我们的服务器出来点问题，请稍后再试');
                }
            }

        } catch (err) {
            // 捕获所有错误（包括 throw new Error 和 网络请求失败）
            console.error(err);
            setError(err.message || '操作失败，请检查网络或重试');
        } finally {
            // 无论成功失败，最后都要关闭 Loading 转圈
            setIsLoading(false);
        }
    };
    // 切换模式的函数
    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setError(''); // 切换时清空错误提示
        setFormData({ name: '', email: '', password: '' }); // 切换时清空表单(可选)
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">

            {/* 背景保持不变 */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
            </div>

            <motion.div
                // 这里的 layout 属性让卡片高度变化时有平滑动画
                layout
                transition={{ duration: 0.3 }}
                className="bg-white/80 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-white/50 p-8 relative z-10"
            >
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-600/30">
                        <Bot size={28} />
                    </div>
                    {/* 标题根据模式变化 */}
                    <h2 className="text-2xl font-bold text-slate-800">
                        {isLoginMode ? '欢迎回来' : '创建新账号'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-2">
                        {isLoginMode ? '登录您的 HA-Chat 账户' : '开启您的智能助手之旅'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* === 注册模式下才显示的字段：用户名 === */}
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

                    {/* 邮箱 (一直显示) */}
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

                    {/* 密码 (一直显示) */}
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

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                即将跳转 ……
                            </>
                        ) : (
                            <>
                                {/* 按钮文字根据模式变化 */}
                                {isLoginMode ? '立即登录' : '创建账号'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* 底部切换按钮 */}
                <div className="mt-8 text-center text-sm text-slate-500">
                    {isLoginMode ? '还没有账号? ' : '已有账号? '}

                    {/* 这里不使用 navigate，而是切换 state */}
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