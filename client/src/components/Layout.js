import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/api/auth';
export default function Layout({ title, actions, children }) {
    const navigate = useNavigate();
    const { user, clearAuth } = useAuthStore();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
    const toggleSidebar = () => {
        const next = !sidebarCollapsed;
        setSidebarCollapsed(next);
        localStorage.setItem('sidebarCollapsed', String(next));
    };
    const handleLogout = async () => {
        try {
            await authAPI.logout();
        }
        catch {
            // Even if the server call fails, clear local auth state
        }
        finally {
            sessionStorage.removeItem('regi_session');
            clearAuth();
            navigate('/login');
        }
    };
    const navItems = [
        { icon: '▣', label: 'Projects', path: '/projects', active: true },
        { icon: '🎫', label: 'Tickets', path: '/tickets', badge: 'soon' },
        { icon: '✓', label: 'Test Cases', path: '/testcases', badge: 'soon' },
        { icon: '↗', label: 'Export', path: '/export', badge: 'soon' },
        { icon: '⚙', label: 'Settings', path: '/settings', badge: 'soon' },
    ];
    return (_jsxs("div", { className: "flex h-screen bg-[#F0F0ED]", children: [_jsxs("div", { className: `${sidebarCollapsed ? 'w-[48px]' : 'w-[208px]'} bg-white border-r border-[#EBEBEB] flex flex-col transition-all duration-200`, children: [_jsxs("div", { className: `${sidebarCollapsed ? 'px-2' : 'px-4'} py-6 flex items-center gap-2 justify-center`, children: [_jsx("div", { className: "w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-sm flex-shrink-0", children: "R" }), !sidebarCollapsed && _jsx("span", { className: "text-[15px] font-semibold text-[#111]", children: "Regi" })] }), _jsx("nav", { className: `flex-1 ${sidebarCollapsed ? 'px-1' : 'px-3'} space-y-1`, children: navItems.map((item) => (_jsx("div", { title: sidebarCollapsed ? item.label : undefined, children: item.active ? (_jsxs(NavLink, { to: item.path, className: ({ isActive }) => `flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg text-sm transition ${isActive
                                    ? 'bg-[#EEEDF8] text-[#4F46E5] font-medium'
                                    : 'text-[#777] hover:bg-[#EFEFEB] hover:text-[#111]'}`, children: [_jsx("span", { className: "w-4", children: item.icon }), !sidebarCollapsed && (_jsxs(_Fragment, { children: [_jsx("span", { children: item.label }), item.badge && (_jsx("span", { className: "ml-auto text-[10px] font-medium text-[#999]", children: item.badge }))] }))] })) : (_jsxs("div", { className: `flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg text-sm text-[#777] opacity-50 cursor-not-allowed`, children: [_jsx("span", { className: "w-4", children: item.icon }), !sidebarCollapsed && (_jsxs(_Fragment, { children: [_jsx("span", { children: item.label }), item.badge && (_jsx("span", { className: "ml-auto text-[10px] font-medium text-[#999]", children: item.badge }))] }))] })) }, item.label))) }), user && (_jsxs("div", { className: "mt-auto border-t border-[#EBEBEB] pt-3 pb-2", children: [!sidebarCollapsed && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 px-2 py-1.5 mb-1", children: [_jsx("div", { className: "w-7 h-7 rounded-full bg-[#4F46E5] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0", children: user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[12px] font-medium text-[#111] truncate", children: user?.name }), _jsx("div", { className: "text-[10px] text-[#aaa]", children: user?.role?.replace(/_/g, ' ') })] })] }), _jsxs("button", { onClick: handleLogout, className: "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-[#777] hover:bg-[#EFEFEB] hover:text-[#111] transition-all cursor-pointer", children: [_jsx("span", { className: "text-[13px] w-4 text-center", children: "\u2192" }), "Sign out"] })] })), _jsxs("button", { onClick: toggleSidebar, title: sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar', className: `w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2 px-2'} py-2 rounded-lg text-[12.5px] text-[#777] hover:bg-[#EFEFEB] hover:text-[#111] transition-all cursor-pointer`, children: [_jsx("span", { className: `text-[13px] transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`, children: "\u25C0" }), !sidebarCollapsed && 'Collapse'] })] }))] }), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [_jsxs("div", { className: "h-14 bg-white border-b border-[#EBEBEB] flex items-center justify-between px-6", children: [_jsx("h1", { className: "text-[15px] font-semibold text-[#111]", children: title }), _jsx("div", { className: "flex items-center gap-3", children: actions })] }), _jsx("div", { className: "flex-1 overflow-auto p-6", children: children })] })] }));
}
