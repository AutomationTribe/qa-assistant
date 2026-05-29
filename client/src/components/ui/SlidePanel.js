import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
export default function SlidePanel({ open, onClose, title, subtitle, children, footer, width = '420px', }) {
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);
    useEffect(() => {
        if (open) {
            setVisible(true);
            setClosing(false);
        }
    }, [open]);
    const handleClose = () => {
        setClosing(true);
        setTimeout(() => {
            setVisible(false);
            setClosing(false);
            onClose();
        }, 250);
    };
    if (!visible)
        return null;
    return (_jsx("div", { className: `fixed inset-0 z-50 flex justify-end ${closing ? 'overlay-fade-out' : 'overlay-fade-in'}`, style: { background: 'rgba(0,0,0,0.2)' }, onClick: e => {
            if (e.target === e.currentTarget)
                handleClose();
        }, children: _jsxs("div", { className: `bg-white flex flex-col border-l border-[#EBEBEB] shadow-xl h-full ${closing ? 'panel-slide-out' : 'panel-slide-in'}`, style: { width }, children: [_jsxs("div", { className: "px-6 pt-6 pb-0 relative flex-shrink-0", children: [_jsx("button", { onClick: handleClose, className: "absolute top-5 right-5 w-7 h-7 rounded-lg border border-[#D8D8D4] bg-white flex items-center justify-center cursor-pointer text-[13px] text-[#888] hover:bg-[#F5F5F3] transition-colors", children: "\u2715" }), _jsx("h2", { className: "text-[16px] font-semibold text-[#111] mb-1", children: title }), subtitle && (_jsx("p", { className: "text-[13px] text-[#999] mb-6", children: subtitle }))] }), _jsx("div", { className: "flex-1 overflow-y-auto px-6 pb-4", children: children }), _jsx("div", { className: "px-6 py-4 border-t border-[#EBEBEB] flex gap-3 flex-shrink-0", children: footer })] }) }));
}
