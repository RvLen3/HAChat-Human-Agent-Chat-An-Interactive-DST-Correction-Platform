import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bot, Sparkles, Zap, Shield,
    ArrowRight, UserCog
} from 'lucide-react';
// 1. 引入 Framer Motion
import { motion, AnimatePresence } from 'framer-motion';


import p1 from '../assets/UserPic1.webp';
import p2 from '../assets/UserPic2.webp';
import p3 from '../assets/UserPic3.webp';
import p4 from '../assets/UserPic4.webp';
import p5 from '../assets/UserPic5.webp';
import p6 from '../assets/UserPic6.webp';
import p7 from '../assets/UserPic7.webp';
import p8 from '../assets/UserPic8.webp';

// 定义头像数组
const AVATAR_LIST = [p1, p2, p3, p4, p5, p6, p7, p8];

export default function HomePage() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [startIndex, setStartIndex] = useState(0);
    const [userNum, setUserNum] = useState(1);

    // 滚动监听
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        // 定义获取数据的函数
        const fetchUserCount = async () => {
            try {
                // 假设你的后端接口是这个，请根据实际情况修改
                const response = await fetch('http://localhost:8000/api/utils/get_user_num');
                if (response.ok) {
                    const data = await response.json();
                    // 假设后端返回格式是 { count: 100 }
                    setUserNum(data.user_num);
                    console.log("用户数量已更新:", data.user_num);
                }
            } catch (error) {
                console.error("获取用户数量失败:", error);
            }
        };
        fetchUserCount();

        // 2. 设置定时器：每 10 分钟 (10 * 60 * 1000 毫秒) 执行一次
        const intervalId = setInterval(() => {
            fetchUserCount();
        }, 10 * 60 * 1000);

        // 3. 清理函数：组件卸载（比如跳到别的页面）时，停止计时器
        // 这是一个良好的编程习惯，防止后台一直跑报错
        return () => clearInterval(intervalId);

    }, []);

    // 轮播定时器
    useEffect(() => {
        const timer = setInterval(() => {
            setStartIndex((prevIndex) => (prevIndex + 1) % AVATAR_LIST.length);
        }, 1000); // 1秒切换一次
        return () => clearInterval(timer);
    }, []);

    const handleStartExperience = () => {
        const hasAuthToken = document.cookie.includes('user_token');
        if (hasAuthToken) {
            navigate('/chat');
        } else {
            // navigate('/login'); 
            navigate('/chat'); // 暂时跳到聊天
        }
    };

    const handleExpertLogin = () => {
        navigate('/expert');
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 text-slate-900 overflow-x-hidden">

            {/* 背景光效 */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow mix-blend-multiply" />
                <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-indigo-400/20 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[100px] animate-pulse-slow delay-2000" />
            </div>

            {/* 顶部导航 */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                            <Bot size={24} />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                            HA-Chat
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="hidden md:block text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">功能介绍</button>
                        <button className="hidden md:block text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">解决方案</button>
                        <button
                            onClick={handleExpertLogin}
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-full hover:bg-blue-50"
                        >
                            <UserCog size={16} />
                            <span>专家通道</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero 主视觉区域 */}
            <main className="relative z-10 pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

                    {/* 左侧文字区 */}
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 text-blue-700 text-xs font-semibold border border-blue-200">
                            <Sparkles size={12} />
                            <span>全新一代人机对话系统 v1.0</span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                            这是一个 <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                巨大Title
                            </span>
                        </h1>

                        <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
                            基于大语言模型与人工专家协同的混合架构。AI自动识别意图并为您分配最合适的专家进行人工服务。
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={handleStartExperience}
                                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95"
                            >
                                立即开启体验
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
                            </button>

                            <button className="px-8 py-4 text-base font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all hover:shadow-sm">
                                查看演示视频
                            </button>
                        </div>

                        {/* === 动态头像轮播区域 (你之前报错可能就是这里嵌套错了) === */}
                        <div className="flex items-center gap-4 text-sm text-slate-500 pt-2">
                            <div className="flex -space-x-2 pl-1 h-8 overflow-hidden">
                                <AnimatePresence mode='popLayout' initial={false}>
                                    {[0, 1, 2, 3].map((offset) => {
                                        const index = (startIndex + offset) % AVATAR_LIST.length;
                                        const imgSource = AVATAR_LIST[index];
                                        return (
                                            <motion.img
                                                key={`${imgSource}-${index}`} // 组合 Key
                                                src={imgSource}
                                                alt="User"
                                                layout
                                                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -20, scale: 0.8 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                className="w-8 h-8 rounded-full border-2 border-white object-cover bg-slate-200 shadow-sm relative z-10"
                                            />
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                            <p>已有 {userNum} 用户正在使用</p>
                        </div>

                    </div>

                    {/* 右侧装饰区 */}
                    <div className="relative lg:h-[500px] flex items-center justify-center">
                        <div className="relative w-full max-w-md aspect-square">
                            <div className="absolute inset-0 border border-slate-200 rounded-full opacity-50 scale-125 animate-spin-slow-reverse" />
                            <div className="absolute inset-0 border border-dashed border-blue-200 rounded-full opacity-50 scale-150 animate-spin-slow" />

                            <div className="absolute top-0 right-0 p-4 bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 w-64 transform rotate-6 animate-float">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Bot size={18} />
                                    </div>
                                    <div className="h-2 w-20 bg-slate-100 rounded"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-slate-100 rounded"></div>
                                    <div className="h-2 w-4/5 bg-slate-100 rounded"></div>
                                </div>
                            </div>

                            <div className="absolute top-1/4 left-4 p-6 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-80 transform -rotate-3 z-10 animate-float delay-1000">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-800">智能分析中...</h3>
                                    <span className="flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-2.5 bg-slate-100 rounded-full w-3/4"></div>
                                    <div className="h-2.5 bg-slate-100 rounded-full w-full"></div>
                                    <div className="h-2.5 bg-slate-100 rounded-full w-5/6"></div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button className="flex-1 py-2 bg-blue-600 rounded-lg text-white text-xs font-medium">查看详情</button>
                                    <button className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600 text-xs font-medium">人工介入</button>
                                </div>
                            </div>

                            <div className="absolute bottom-0 right-8 p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 text-white w-56 transform rotate-3 animate-float delay-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <UserCog size={20} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">人工专家</div>
                                        <div className="text-xs text-indigo-200">已接入会话</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main> {/* <-- 这里的闭合标签是你之前可能漏掉的 */}

            {/* Features 特性区 */}
            <section className="relative z-10 py-20 bg-white/50 backdrop-blur-sm border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Bot size={24} className="text-blue-600" />}
                            title="智能意图识别"
                            desc="利用先进的 NLP 模型，精准识别用户意图，区分简单咨询与复杂业务。"
                        />
                        <FeatureCard
                            icon={<Zap size={24} className="text-amber-500" />}
                            title="极速响应"
                            desc="90% 的常规问题由 AI 秒级回复，无需等待，提升用户体验效率。"
                        />
                        <FeatureCard
                            icon={<Shield size={24} className="text-indigo-600" />}
                            title="专家无缝衔接"
                            desc="遇到复杂难题，自动平滑流转至人工专家，上下文完整保留。"
                        />
                    </div>
                </div>
            </section>

        </div>
    );
}

// 子组件
function FeatureCard({ icon, title, desc }) {
    return (
        <div className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:bg-blue-50">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}