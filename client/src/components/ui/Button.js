import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
const sizeClasses = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-4 py-2 text-[13px]',
    lg: 'px-5 py-2.5 text-[14px]',
};
const variantClasses = {
    primary: 'bg-[#4F46E5] hover:bg-[#4338CA] text-white border-transparent',
    secondary: 'bg-white hover:bg-[#FAFAF8] text-[#444] border-[#D0D0CC]',
    danger: 'bg-[#EF4444] hover:bg-red-600 text-white border-transparent',
    ghost: 'bg-transparent hover:bg-[#EFEFEB] text-[#444] border-transparent',
};
const Button = forwardRef(({ variant = 'primary', size = 'md', loading = false, fullWidth = false, className = '', children, disabled, ...props }, ref) => {
    return (_jsxs("button", { ref: ref, disabled: disabled || loading, className: [
            'inline-flex items-center justify-center gap-2',
            'font-medium rounded-lg border transition-all font-sans',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            variantClasses[variant],
            fullWidth ? 'w-full' : '',
            className,
        ]
            .filter(Boolean)
            .join(' '), ...props, children: [loading && (_jsxs("svg", { className: "animate-spin h-4 w-4", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8v8H4z" })] })), children] }));
});
Button.displayName = 'Button';
export default Button;
