import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
const Input = forwardRef(({ label, hint, error, optional, className = '', ...props }, ref) => {
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [label && (_jsxs("label", { className: "text-[12px] font-medium text-[#333]", children: [label, optional && (_jsx("span", { className: "font-normal text-[#bbb] ml-1 text-[11px]", children: "optional" }))] })), _jsx("input", { ref: ref, className: [
                    'w-full border rounded-lg px-3 py-2 text-[13px] text-[#111]',
                    'bg-[#FAFAF8] font-sans outline-none transition-all',
                    'placeholder:text-[#C8C8C4]',
                    error
                        ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/10'
                        : 'border-[#DDDDD9] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10',
                    className,
                ]
                    .filter(Boolean)
                    .join(' '), ...props }), hint && !error && (_jsx("span", { className: "text-[11px] text-[#aaa]", children: hint })), error && (_jsx("span", { className: "text-[11px] text-red-500", children: error }))] }));
});
Input.displayName = 'Input';
export default Input;
