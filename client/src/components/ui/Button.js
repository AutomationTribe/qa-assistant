import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Button({ variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, className, children, ...props }) {
    const baseStyles = 'font-medium transition rounded-lg focus:outline-none focus:ring-2';
    const variantStyles = {
        primary: 'bg-[#4F46E5] text-white hover:bg-[#4338CA] focus:ring-[#4F46E5]/20 disabled:opacity-50',
        secondary: 'bg-[#FAFAF8] text-[#111] border border-[#EBEBEB] hover:bg-[#F5F5F2] focus:ring-[#4F46E5]/20 disabled:opacity-50',
        danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444]/20 disabled:opacity-50',
        ghost: 'bg-transparent text-[#4F46E5] hover:bg-[#EEEDF8] focus:ring-[#4F46E5]/20 disabled:opacity-50',
    };
    const sizeStyles = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };
    return (_jsx("button", { disabled: disabled || loading, className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className || ''}`, ...props, children: loading ? (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("div", { className: "w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "Loading..." })] })) : (children) }));
}
