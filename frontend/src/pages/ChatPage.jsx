import React, { useState, useEffect, useRef } from 'react';
import {
    Send, Plus, User, Bot, ThumbsUp, ThumbsDown,
    Settings, Zap, MessageSquare, PanelLeftClose, PanelLeftOpen,
    BotIcon
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

/* ===========================================================================
   1. 后端配置与 API 服务
   =========================================================================== */
const CONFIG = {
    USE_MOCK_API: false,
    API_BASE_URL: "http://localhost:8000/api",
};

const apiService = {
    // 接口 A: 意图分析
    classify: async (text, debugMode, session_id) => {
        try {
            const userEmail = localStorage.getItem('user_email');
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/classify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    debugMode: debugMode,// 对应后端 UserInputRequest.debugMode (bool)
                    session_id: session_id,
                    email: userEmail // email需要在登录时存到前端
                })
            });
            if (!response.ok) throw new Error("Classify API Error");
            return await response.json();
        } catch (error) {
            console.error("Classify Error:", error);
            throw error;
        }
    },

    // 接口 B: 生成回答
    // 注意：这里传参要对应后端 ChatRequest 的字段
    getAnswer: async (if_hard, session_id, slots) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: "QUERY_ANSWER", // 后端 ChatRequest 需要 text 字段，虽然可能不用，但为了验证通过给一个占位符
                    session_id: session_id,
                    slots: slots,
                    if_hard: if_hard
                })
            });
            if (!response.ok) throw new Error("Answer API Error");
            return await response.json();
        } catch (error) {
            console.error("GetAnswer Error:", error);
            throw error;
        }
    },

    // 接口 D: 反馈
    sendFeedback: async (messageId, isLike, userQuestion, botAnswer) => {
        try {
            fetch(`${CONFIG.API_BASE_URL}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: String(messageId),
                    isLike: isLike,
                    userQuestion: userQuestion,
                    botAnswer: botAnswer
                })
            });
        } catch (e) {
            console.error(e);
        }
        return true;
    }
};

/* ===========================================================================
   2. 主页面组件
   =========================================================================== */

export default function ChatPage() {
    const location = useLocation();

    // --- State 定义 ---
    const storedUser = JSON.parse(localStorage.getItem('user_info') || '{}');
    const currentUser = location.state?.userData || storedUser || { name: '', role: 'visitor' };
    // const CurrentSession_id = useRef(null) //初始为None,后续根据后端的返回来修正currentid
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            source: 'AI-Agent',
            content: `你好 ${currentUser.name || 'Guest'} ！我是智能对话Agent。有什么可以帮你的吗？`,
            feedback: null
        }
    ]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(''); // 用于显示 "正在转接专家..."
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // debugMode: 0 = Auto, 1 = Debug(Hard)
    const [debugMode, setDebugMode] = useState(0);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);

    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    const currentSessionIdRef = useRef(null);

    // --- Effect: 自动滚动到底部 ---
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loadingStatus]);

    // --- Effect: 自动调整输入框高度 ---
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    // --- Handlers ---
    const handelSetting = async () => { alert('设置模块正在开发中，敬请期待'); }


    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input;

        const session_id = currentSessionIdRef.current;
        setInput(''); // 清空输入框
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        setIsLoading(true);

        // 1. 立即上屏用户消息
        const userMsgId = Date.now();
        setMessages(prev => [...prev, {
            id: userMsgId,
            role: 'user',
            content: userText
        }]);

        try {
            // --- Step 1: 调用分类接口 (Classify) ---
            setLoadingStatus('AI 正在分析意图...');

            // debugMode > 0 转为 true
            const isDebug = debugMode === 1;
            const classifyRes = await apiService.classify(userText, isDebug, session_id);

            // 后端返回结构: { action: '...', data: { session_id, predicted_slots } }
            // 你需要在后端把 if_hard 这个状态明确传回来，或者前端通过 action 判断
            const isHard = classifyRes.action === 'WAIT_FOR_EXPORT';
            const sessionData = classifyRes.data || {};

            if (sessionData.session_id) {
                currentSessionIdRef.current = sessionData.session_id;
                console.log('Updated session_id:', currentSessionIdRef.current);
            }
            // --- Step 2: 更新 UI 状态 ---
            if (isHard) {
                setLoadingStatus('问题较复杂，正在邀请专家回答 (可能需要几十秒)...');
            } else {
                setLoadingStatus('Agent 生成中...');
            }

            // --- Step 3: 带着分类结果去请求回答 (Answer) ---
            // 后端 answer 接口里有 while 循环等待专家，所以这里 await 会卡住直到后端返回
            const answerRes = await apiService.getAnswer(
                isHard, // if_hard
                sessionData.session_id || "session_default",
                sessionData.predicted_slots || {}
            );

            // --- Step 4: 拿到最终结果上屏 ---
            addAssistantMessage(answerRes.content, answerRes.source);

        } catch (err) {
            addAssistantMessage(`请求失败: ${err.message}`, 'AI-Agent');
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    const addAssistantMessage = (content, source) => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'assistant',
            source: source, // 'AI-Agent' 或 'Export' (对应后端返回的 source)
            content: content,
            feedback: null
        }]);
    };

    const handleFeedback = (msg, isLike) => {
        setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, feedback: isLike ? 'up' : 'down' } : m
        ));
        // 找到上一条用户消息
        const msgIndex = messages.findIndex(m => m.id === msg.id);
        const relatedQuestion = msgIndex > 0 ? messages[msgIndex - 1].content : "";

        apiService.sendFeedback(msg.id, isLike, relatedQuestion, msg.content);
    };

    const AddFile = () => { alert("📎 文件上传功能正在开发中..."); }

    /* ===========================================================================
       3. 渲染视图 (UI)
       =========================================================================== */
    return (
        <div className="flex h-screen bg-white text-gray-800 font-sans overflow-hidden">

            {/* --- 左侧侧边栏 (Sidebar) --- */}
            <div className={`flex-shrink-0 bg-[#0f0f0f] text-gray-200 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'}`}>
                <div className="p-3 flex items-center justify-between">
                    <button
                        onClick={() => { setMessages([]); }}
                        className="flex-1 flex items-center gap-2 px-3 py-3 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors text-sm text-gray-200"
                    >
                        <Plus size={16} />
                        <span className="font-medium">New chat</span>
                    </button>
                    <button onClick={() => setIsSidebarOpen(false)} className="ml-2 p-2 rounded-lg hover:bg-gray-800 text-gray-400">
                        <PanelLeftClose size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
                    <div className="text-xs font-semibold text-gray-500 px-3 mb-2">History</div>
                    {/* 静态演示历史记录 */}
                    {['如何重置密码?', '转人工测试'].map((item, i) => (
                        <button key={i} className="w-full text-left truncate px-3 py-2 rounded-lg hover:bg-gray-800 text-sm transition-colors text-gray-300">
                            {item}
                        </button>
                    ))}
                </div>

                {/* 底部用户信息栏 */}
                <div className="p-3 border-t border-gray-800">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800 cursor-pointer group transition-colors">
                        <div className="w-8 h-8 rounded bg-green-700 flex items-center justify-center text-white font-bold text-xs">
                            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 text-sm overflow-hidden">
                            <div className="font-medium truncate">{currentUser.name || 'User'}</div>
                            <div className="text-xs text-gray-500 truncate">{debugMode === 0 ? 'Auto Mode' : 'Hard Mode'}</div>
                        </div>
                        <Settings onClick={() => handelSetting()} size={16} className="text-gray-500" />
                    </div>
                    {/* Debug 切换按钮 */}
                    <div className="mt-2 flex bg-gray-900 border border-gray-700 p-1 rounded-lg">
                        <button
                            onClick={() => setDebugMode(0)}
                            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${debugMode === 0 ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Auto
                        </button>
                        <button
                            onClick={() => setDebugMode(1)}
                            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${debugMode === 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Debug
                        </button>
                    </div>
                </div>
            </div>

            {/* --- 右侧主聊天区 --- */}
            <div className="flex-1 flex flex-col h-full relative bg-white">

                {/* 顶部 Header */}
                <header className="flex items-center p-2 md:p-4 absolute top-0 left-0 w-full z-10 bg-white/80 backdrop-blur-sm">
                    {!isSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <PanelLeftOpen size={20} />
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors mx-auto md:mx-0">
                        <span className="text-lg font-semibold text-gray-700">Customer Support Bot v1.0</span>
                    </div>
                </header>

                {/* 消息列表区域 */}
                <div className="flex-1 overflow-y-auto w-full pt-20 pb-40">
                    <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-8">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className="flex gap-4 md:gap-6 group"
                                onMouseEnter={() => setHoveredMessageId(msg.id)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                            >
                                {/* 头像 */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 
                                    ${msg.role === 'user' ? 'bg-gray-200' : (msg.source === 'Export' || msg.source === 'Human-Expert' ? 'bg-indigo-600' : 'bg-green-500')}
                                `}>
                                    {msg.role === 'user' ? <User size={16} className="text-gray-600" /> :
                                        (msg.source === 'Export' || msg.source === 'Human-Expert' ? <Zap size={16} className="text-white" /> : <BotIcon size={16} className="text-white" />)}
                                </div>

                                {/* 消息内容 */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                        {msg.role === 'user' ? 'You' : (msg.source === 'Export' || msg.source === 'Human-Expert' ? 'Human Expert' : 'AI Agent')}
                                        {(msg.source === 'Export' || msg.source === 'Human-Expert') && (
                                            <span className="text-[10px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Intervention</span>
                                        )}
                                    </div>
                                    <div className="prose prose-slate max-w-none text-[15px] text-gray-800 leading-7 whitespace-pre-wrap">
                                        {msg.content}
                                    </div>

                                    {/* 反馈按钮 */}
                                    {msg.role === 'assistant' && (
                                        <div className={`flex items-center gap-2 mt-2 transition-opacity duration-200 ${hoveredMessageId === msg.id || msg.feedback ? 'opacity-100' : 'opacity-0'}`}>
                                            <button onClick={() => handleFeedback(msg, true)} className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${msg.feedback === 'up' ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}>
                                                <ThumbsUp size={15} />
                                            </button>
                                            <button onClick={() => handleFeedback(msg, false)} className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${msg.feedback === 'down' ? 'text-red-500 bg-red-50' : 'text-gray-400'}`}>
                                                <ThumbsDown size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading 状态指示器 */}
                        {isLoading && (
                            <div className="flex gap-4 md:gap-6 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
                                    <BotIcon size={16} className="text-white animate-spin-slow" />
                                </div>
                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                        {loadingStatus || 'Thinking...'}
                                    </div>
                                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* 底部输入框 */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6">
                    <div className="max-w-3xl mx-auto px-4 md:px-0">
                        <div className="relative flex items-end gap-2 bg-gray-100 rounded-[26px] p-2 pr-2 focus-within:ring-1 focus-within:ring-gray-300 focus-within:bg-white focus-within:shadow-md transition-all duration-200 border border-transparent">
                            <button onClick={AddFile} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                                <Plus size={20} />
                            </button>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder="输入您的问题..."
                                className="flex-1 max-h-[200px] min-h-[24px] bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-500 text-base resize-none py-2.5 outline-none"
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className={`p-2 rounded-full mb-0.5 transition-all duration-200 ${input.trim() && !isLoading ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-3 font-medium">
                            Agent may display inaccurate info, so double-check its responses.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}