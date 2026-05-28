import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function Toast({ message, type = 'success', visible, onHide, }) {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(onHide, 3000);
            return () => clearTimeout(timer);
        }
    }, [visible, onHide]);
    return (_jsxs("div", { className: [
            'fixed top-5 right-5 z-50 flex items-center gap-3',
            'px-4 py-3 rounded-xl shadow-lg border',
            'font-sans text-[13px] font-medium',
            'transition-all duration-300',
            visible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-2 pointer-events-none',
            type === 'success'
                ? 'bg-white border-[#EBEBEB] text-[#111]'
                : 'bg-white border-red-200 text-red-600',
        ].join(' '), children: [type === 'success' ? (_jsx("div", { className: "w-5 h-5 rounded-full bg-[#ECFDF5] flex items-center justify-center flex-shrink-0", children: _jsx("span", { className: "text-[#059669] text-[11px] font-bold", children: "\u2713" }) })) : (_jsx("div", { className: "w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0", children: _jsx("span", { className: "text-red-500 text-[11px] font-bold", children: "\u2715" }) })), message] }));
}
