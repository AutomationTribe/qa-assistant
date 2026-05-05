import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
export default function Layout({ title, actions, children }) {
    const { user } = useAuthStore();
    const initials = user ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase() : 'U';
    const roleLabel = user?.role.replace(/_/g, ' ').toLowerCase() || 'User';
    const navItems = [
        { icon: '▣', label: 'Projects', path: '/projects', active: true },
        { icon: '🎫', label: 'Tickets', path: '/tickets', badge: 'soon' },
        { icon: '✓', label: 'Test Cases', path: '/testcases', badge: 'soon' },
        { icon: '↗', label: 'Export', path: '/export', badge: 'soon' },
        { icon: '⚙', label: 'Settings', path: '/settings', badge: 'soon' },
    ];
    return (_jsxs("div", { className: "flex h-screen bg-[#F0F0ED]", children: [_jsxs("div", { className: "w-52 bg-white border-r border-[#EBEBEB] flex flex-col", children: [_jsxs("div", { className: "px-4 py-6 flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-sm", children: "R" }), _jsx("span", { className: "text-[15px] font-semibold text-[#111]", children: "Regi" })] }), _jsx("nav", { className: "flex-1 px-3 space-y-1", children: navItems.map((item) => (_jsx("div", { children: item.active ? (_jsxs(NavLink, { to: item.path, className: ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive
                                    ? 'bg-[#EEEDF8] text-[#4F46E5] font-medium'
                                    : 'text-[#777] hover:bg-[#EFEFEB] hover:text-[#111]'}`, children: [_jsx("span", { className: "w-4", children: item.icon }), _jsx("span", { children: item.label }), item.badge && (_jsx("span", { className: "ml-auto text-[10px] font-medium text-[#999]", children: item.badge }))] })) : (_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#777] opacity-50 cursor-not-allowed", children: [_jsx("span", { className: "w-4", children: item.icon }), _jsx("span", { children: item.label }), item.badge && (_jsx("span", { className: "ml-auto text-[10px] font-medium text-[#999]", children: item.badge }))] })) }, item.label))) }), user && (_jsxs("div", { className: "px-4 py-6 border-t border-[#EBEBEB] flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-[#EEEDF8] flex items-center justify-center text-[#4F46E5] text-xs font-semibold", children: initials }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-medium text-[#111] truncate", children: user.name }), _jsx("p", { className: "text-[11px] text-[#999] truncate capitalize", children: roleLabel })] })] }))] }), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [_jsxs("div", { className: "h-14 bg-white border-b border-[#EBEBEB] flex items-center justify-between px-6", children: [_jsx("h1", { className: "text-[15px] font-semibold text-[#111]", children: title }), _jsx("div", { className: "flex items-center gap-3", children: actions })] }), _jsx("div", { className: "flex-1 overflow-auto p-6", children: children })] })] }));
}
