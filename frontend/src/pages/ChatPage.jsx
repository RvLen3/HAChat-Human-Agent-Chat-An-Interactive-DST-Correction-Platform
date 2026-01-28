import React, { useState, useEffect, useRef } from 'react';
import {
    Send, Plus, User, Bot, ThumbsUp, ThumbsDown,
    Settings, Zap, PanelLeftClose, PanelLeftOpen,
    BotIcon, MessageSquare
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

/* ===========================================================================
   1. API 服务层
   =========================================================================== */
const CONFIG = {
    // 请确保这里的地址和你后端运行的地址一致
    API_BASE_URL: "http://localhost:8000/api",
};

const apiService = {

    getHistoryList: async (email) => {
        try {
            const url = `${CONFIG.API_BASE_URL}/chat/history?email=${encodeURIComponent(email)}`;
            console.log("Fetching history from:", url); // Debug log

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error("Failed to fetch history");
            return await response.json();
        } catch (error) {
            console.error("History List Error:", error);
            return [];
        }
    },

    // 获取指定会话的详细消息
    getSessionMessages: async (session_id) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/history/${session_id}/messages`);
            if (!response.ok) throw new Error("Failed to fetch session messages");
            return await response.json();
        } catch (error) {
            console.error("Session Details Error:", error);
            return [];
        }
    },

    // 意图分析
    classify: async (text, debugMode, session_id) => {
        try {
            const userEmail = localStorage.getItem('user_email') || '';
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/classify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    debugMode: debugMode,
                    session_id: session_id,
                    email: userEmail
                })
            });
            if (!response.ok) throw new Error("Classify API Error");
            return await response.json();
        } catch (error) {
            console.error("Classify Error:", error);
            throw error;
        }
    },

    // 生成回答
    getAnswer: async (if_hard, session_id, slots) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/chat/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: "QUERY_ANSWER",
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

    // 反馈
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
    // 尝试从 localStorage 获取用户信息，如果没有则为空对象
    const storedUser = JSON.parse(localStorage.getItem('user_info') || '{}');
    const currentUser = location.state?.userData || storedUser || { name: '', role: 'visitor' };

    // 默认欢迎语
    const welcomeMsg = {
        id: 'welcome',
        role: 'assistant',
        source: 'AI-Agent',
        content: `你好 ${currentUser.name || 'Guest'} ！我是智能对话Agent。有什么可以帮你的吗？`,
        feedback: null
    };

    const [messages, setMessages] = useState([welcomeMsg]);
    const [historyList, setHistoryList] = useState([]); // 左侧历史记录列表

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [debugMode, setDebugMode] = useState(0);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);

    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    const currentSessionIdRef = useRef(null);

    // --- [核心修复] Effect: 初始化加载历史记录 ---
    useEffect(() => {
        const fetchHistory = async () => {
            // 1. 获取邮箱
            const email = localStorage.getItem('user_email');
            console.log("初始化加载历史记录, User Email:", email);

            if (email) {
                // 2. 调用 API
                const list = await apiService.getHistoryList(email);
                console.log("后端返回的历史记录:", list);

                // 3. 更新状态
                if (list && list.length > 0) {
                    setHistoryList(list);
                }
            } else {
                console.warn("未找到 user_email，无法加载历史记录。请检查是否已登录。");
            }
        };
        fetchHistory();
    }, []); // 空依赖数组，确保只在组件挂载时执行一次

    // --- Effect: 自动滚动 ---
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loadingStatus]);

    // --- Effect: 输入框高度 ---
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    // --- Actions ---

    const handleNewChat = () => {
        currentSessionIdRef.current = null;
        setMessages([welcomeMsg]);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        setTimeout(() => {
            if (textareaRef.current) textareaRef.current.focus();
        }, 100);
    };

    const loadSession = async (sessionId) => {
        if (isLoading) return;
        if (currentSessionIdRef.current === sessionId) return;

        setIsLoading(true);
        setLoadingStatus('正在加载历史记录...');
        setMessages([]);

        try {
            currentSessionIdRef.current = sessionId;
            const historyMsgs = await apiService.getSessionMessages(sessionId);

            // 格式化后端消息
            const formattedMsgs = historyMsgs.map((m, index) => ({
                id: `hist-${index}-${Date.now()}`,
                role: m.role,
                source: m.source || (m.role === 'user' ? 'User' : 'AI-Agent'),
                content: m.content,
                feedback: null
            }));

            setMessages(formattedMsgs.length > 0 ? formattedMsgs : [welcomeMsg]);

        } catch (err) {
            console.error(err);
            setMessages([welcomeMsg]);
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
            if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input;
        const isNewSession = !currentSessionIdRef.current;

        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsLoading(true);

        setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'user',
            content: userText
        }]);

        try {
            setLoadingStatus('AI 正在分析意图...');
            const isDebug = debugMode === 1;

            const classifyRes = await apiService.classify(userText, isDebug, currentSessionIdRef.current);
            const isHard = classifyRes.action === 'WAIT_FOR_EXPORT';
            const sessionData = classifyRes.data || {};

            if (sessionData.session_id) {
                currentSessionIdRef.current = sessionData.session_id;

                // 如果是新产生的会话，动态更新左侧列表，避免刷新才能看到
                if (isNewSession) {
                    const newHistoryItem = {
                        session_id: sessionData.session_id,
                        title: userText.length > 15 ? userText.substring(0, 15) + '...' : userText,
                    };
                    setHistoryList(prev => [newHistoryItem, ...prev]);
                }
            }

            setLoadingStatus(isHard ? '问题较复杂，正在邀请专家回答...' : 'Agent 生成中...');

            const answerRes = await apiService.getAnswer(
                isHard,
                sessionData.session_id || "session_default",
                sessionData.predicted_slots || {}
            );

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
            source: source,
            content: content,
            feedback: null
        }]);
    };

    const handleFeedback = (msg, isLike) => {
        setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, feedback: isLike ? 'up' : 'down' } : m
        ));
        const msgIndex = messages.findIndex(m => m.id === msg.id);
        const relatedQuestion = msgIndex > 0 ? messages[msgIndex - 1].content : "";
        apiService.sendFeedback(msg.id, isLike, relatedQuestion, msg.content);
    };

    /* ===========================================================================
       3. 渲染视图
       =========================================================================== */
    return (
        <div className="flex h-screen bg-white text-gray-800 font-sans overflow-hidden">

            {/* --- Sidebar --- */}
            <div className={`flex-shrink-0 bg-[#0f0f0f] text-gray-200 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'}`}>
                <div className="p-3 flex items-center justify-between">
                    <button
                        onClick={handleNewChat}
                        className="flex-1 flex items-center gap-2 px-3 py-3 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors text-sm text-gray-200"
                    >
                        <Plus size={16} />
                        <span className="font-medium">New chat</span>
                    </button>
                    <button onClick={() => setIsSidebarOpen(false)} className="ml-2 p-2 rounded-lg hover:bg-gray-800 text-gray-400">
                        <PanelLeftClose size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                    <div className="text-xs font-semibold text-gray-500 px-3 mb-2">History</div>

                    {historyList.length === 0 && (
                        <div className="text-gray-600 text-xs px-3 italic mt-4">
                            {/* 如果加载不出来，检查一下 F12 的 Console */}
                            暂无历史记录
                        </div>
                    )}

                    {historyList.map((item) => (
                        <button
                            key={item.session_id}
                            onClick={() => loadSession(item.session_id)}
                            className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors group
                                ${currentSessionIdRef.current === item.session_id ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'}
                            `}
                        >
                            <MessageSquare size={14} className="flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                        </button>
                    ))}
                </div>

                <div className="p-3 border-t border-gray-800">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded bg-green-700 flex items-center justify-center text-white font-bold text-xs">
                            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 text-sm overflow-hidden">
                            <div className="font-medium truncate">{currentUser.name || 'User'}</div>
                            <div className="text-xs text-gray-500 truncate">{debugMode === 0 ? 'Auto Mode' : 'Hard Mode'}</div>
                        </div>
                        <Settings size={16} className="text-gray-500" />
                    </div>
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

            {/* --- Main Chat Area --- */}
            <div className="flex-1 flex flex-col h-full relative bg-white">
                <header className="flex items-center p-2 md:p-4 absolute top-0 left-0 w-full z-10 bg-white/80 backdrop-blur-sm">
                    {!isSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <PanelLeftOpen size={20} />
                        </button>
                    )}
                    <span className="text-lg font-semibold text-gray-700 ml-2">Customer Support Bot v1.0</span>
                </header>

                <div className="flex-1 overflow-y-auto w-full pt-20 pb-40">
                    <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-8">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className="flex gap-4 md:gap-6 group"
                                onMouseEnter={() => setHoveredMessageId(msg.id)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 
                                    ${msg.role === 'user' ? 'bg-gray-200' :
                                        (msg.source === 'Export' || msg.source === 'Human-Expert' ? 'bg-indigo-600' : 'bg-green-500')}
                                `}>
                                    {msg.role === 'user' ? <User size={16} className="text-gray-600" /> :
                                        (msg.source === 'Export' || msg.source === 'Human-Expert' ? <Zap size={16} className="text-white" /> : <BotIcon size={16} className="text-white" />)}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                        {msg.role === 'user' ? 'You' : (msg.source === 'Export' || msg.source === 'Human-Expert' ? 'Human Expert' : 'AI Agent')}
                                        {(msg.source === 'Export' || msg.source === 'Human-Expert') && (
                                            <span className="text-[10px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Intervention</span>
                                        )}
                                        {/* 显示来源标记 */}
                                        {msg.source === 'History' && <span className="text-xs text-gray-400 font-normal">(History)</span>}
                                    </div>
                                    <div className="prose prose-slate max-w-none text-[15px] text-gray-800 leading-7 whitespace-pre-wrap">
                                        {msg.content}
                                    </div>

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

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6">
                    <div className="max-w-3xl mx-auto px-4 md:px-0">
                        <div className="relative flex items-end gap-2 bg-gray-100 rounded-[26px] p-2 pr-2 focus-within:ring-1 focus-within:ring-gray-300 focus-within:bg-white focus-within:shadow-md transition-all duration-200 border border-transparent">
                            <button onClick={() => alert("功能开发中")} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
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
                    </div>
                </div>
            </div>
        </div>
    );
}