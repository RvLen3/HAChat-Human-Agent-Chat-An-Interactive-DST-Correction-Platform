import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, Settings, LogOut,
    Bell, Clock, AlertCircle, X,
    PanelLeftClose, PanelLeftOpen,
    CheckCircle // <--- 修复：加回了这个丢失的图标
} from 'lucide-react';

const CONFIG = {
    API_BASE_URL: "http://localhost:8000/api",
};

export default function ExpertPage() {
    const [tasks, setTasks] = useState([]);
    // const [isLoading, setIsLoading] = useState(false); 
    const [selectedTask, setSelectedTask] = useState(null); // 当前正在处理的任务
    const [editSlots, setEditSlots] = useState(""); // 编辑框里的 JSON 字符串
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // 控制侧边栏开关

    // 1. 获取任务列表
    const fetchTasks = async () => {
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/expert/tasks`);
            const data = await res.json();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error("获取任务失败", error);
        }
    };

    // 页面加载时获取一次，并在之后每2秒轮询一次
    useEffect(() => {
        fetchTasks();
        const timer = setInterval(fetchTasks, 2000);
        return () => clearInterval(timer);
    }, []);

    // 2. 点击卡片，打开处理弹窗
    const handleCardClick = (task) => {
        setSelectedTask(task);
        setEditSlots(JSON.stringify(task.predicted_slots, null, 4));
    };

    // 3. 提交修正
    const handleSubmitFix = async () => {
        if (!selectedTask) return;
        try {
            const fixedSlots = JSON.parse(editSlots);

            await fetch(`${CONFIG.API_BASE_URL}/expert/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: selectedTask.session_id,
                    corrected_slots: fixedSlots
                })
            });

            alert("处理成功！用户对话将自动继续。");
            setSelectedTask(null);
            fetchTasks();
        } catch (e) {
            alert("JSON 格式错误，请检查输入！");
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden">

            {/* --- 左侧侧边栏 (Sidebar) --- */}
            <div
                className={`
                    flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out
                    ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'}
                `}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 min-w-[256px]">
                    <span className="text-xl font-bold text-indigo-600">Expert<span className="text-gray-800">Console</span></span>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <PanelLeftClose size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 min-w-[256px]">
                    <NavItem icon={<LayoutDashboard size={20} />} label="任务概览" active />
                    <NavItem icon={<Users size={20} />} label="历史记录" />
                    <NavItem icon={<Settings size={20} />} label="系统设置" />
                </nav>

                <div className="p-4 border-t border-gray-100 min-w-[256px]">
                    <button className="flex items-center gap-3 text-gray-500 hover:text-red-500 transition-colors px-4 py-2 w-full">
                        <LogOut size={20} />
                        <span>退出登录</span>
                    </button>
                </div>
            </div>

            {/* --- 右侧主体内容 --- */}
            <div className="flex-1 flex flex-col h-full relative w-full">

                {/* 顶部 Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-indigo-600">
                                <PanelLeftOpen size={24} />
                            </button>
                        )}
                        <h2 className="text-lg font-medium text-gray-700">工作台 / 待处理任务</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <Bell size={20} className="text-gray-500 hover:text-indigo-600 cursor-pointer" />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-medium">Dr. Wang</div>
                                <div className="text-xs text-gray-500">NLP Specialist</div>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                W
                            </div>
                        </div>
                    </div>
                </header>

                {/* 任务卡片区域 */}
                <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">实时任务池</h1>
                            <p className="text-gray-500 text-sm mt-1">当前队列中有 <span className="text-indigo-600 font-bold">{tasks.length}</span> 个复杂会话正在等待介入</p>
                        </div>
                        <button onClick={fetchTasks} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors shadow-sm">
                            刷新列表
                        </button>
                    </div>

                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                            {/* 这里之前报错，因为 CheckCircle 没导入 */}
                            <CheckCircle size={48} className="mb-4 text-green-500" />
                            <p>所有任务已清空，喝杯咖啡吧！</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tasks.map((task, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleCardClick(task)}
                                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Users size={20} className="text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">Session User</div>
                                                <div className="text-xs text-gray-400 font-mono">{task.session_id}</div>
                                            </div>
                                        </div>
                                        <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold">Waiting</span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm text-gray-500">
                                            <span className="flex items-center gap-1"><Clock size={14} /> 等待时长: </span>
                                            <span className="text-gray-800 font-medium">刚刚</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            <span className="flex items-center gap-1"><AlertCircle size={14} /> 问题类型: </span>
                                            <span className="text-gray-800 font-medium">意图模糊 / 缺槽</span>
                                        </div>
                                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2 truncate">
                                            "{task.user_text || '无文本内容'}"
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Click to handle</span>
                                        <span className="text-indigo-600 font-medium group-hover:translate-x-1 transition-transform">处理 &rarr;</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* --- 处理弹窗 (Modal) --- */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white w-[600px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">人工介入纠偏(历史对话还没做)</h3>
                                <p className="text-sm text-gray-500">ID: {selectedTask.session_id}</p>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-gray-200 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-4 bg-gray-100 p-3 rounded-lg">
                                <span className="text-xs font-bold text-gray-500 uppercase">User Query</span>
                                <div className="text-gray-800 font-medium mt-1">{selectedTask.user_text || "用户未输入文本"}</div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">修正模型槽位 (JSON)</label>
                                <textarea
                                    value={editSlots}
                                    onChange={(e) => setEditSlots(e.target.value)}
                                    className="w-full h-64 font-mono text-sm bg-gray-50 border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmitFix}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                提交修正 & 恢复对话
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function NavItem({ icon, label, active }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${active ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
            {icon}
            <span>{label}</span>
        </div>
    )
}