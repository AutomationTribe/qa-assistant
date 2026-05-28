import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from '@/components/ui/Button';
export default function ConfirmDialog({ open, title, description, cancelLabel = 'Cancel', confirmLabel = 'Confirm', isDestructive = false, loading = false, onCancel, onConfirm, }) {
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/40 z-50 flex items-center justify-center", children: _jsxs("div", { className: "bg-white rounded-xl shadow-lg p-6 w-full max-w-md", children: [_jsx("h2", { className: "text-lg font-semibold text-[#111] mb-2", children: title }), _jsx("p", { className: "text-sm text-[#666] mb-6", children: description }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "secondary", fullWidth: true, onClick: onCancel, disabled: loading, children: cancelLabel }), _jsx(Button, { fullWidth: true, loading: loading, onClick: onConfirm, className: isDestructive ? 'bg-[#EF4444] hover:bg-[#DC2626]' : '', children: confirmLabel })] })] }) }));
}
