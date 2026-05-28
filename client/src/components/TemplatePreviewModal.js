import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from '@/components/ui/Button';
const getPlaceholderValue = (field) => {
    switch (field.type) {
        case 'TEXT':
            return '[AI will generate a concise text value]';
        case 'TEXTAREA':
            return '[AI will generate a detailed paragraph]';
        case 'STEPS':
            return '1. [First step]\n2. [Second step]\n3. [Third step]';
        case 'SELECT':
            return field.options ? `[One of: ${field.options.join(', ')}]` : '[Select value]';
        case 'MULTISELECT':
            return field.options ? `[Multiple of: ${field.options.join(', ')}]` : '[Multiple select values]';
        case 'BOOLEAN':
            return 'Yes / No';
        case 'NUMBER':
            return '[Numeric value]';
        default:
            return '[Value]';
    }
};
export default function TemplatePreviewModal({ fields, onClose }) {
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-white border-b p-6", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Template Preview" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "This is how a generated test case will appear" })] }), _jsx("div", { className: "p-6 space-y-6", children: fields.map((field) => (_jsxs("div", { className: "border-l-4 border-indigo-200 pl-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("h3", { className: "font-semibold text-gray-900", children: field.name }), _jsx("span", { className: "text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded", children: field.type }), field.required && _jsx("span", { className: "text-xs text-red-600 font-medium", children: "Required" })] }), field.description && _jsx("p", { className: "text-sm text-gray-600 mb-2", children: field.description }), _jsx("div", { className: "bg-gray-50 p-3 rounded text-sm text-gray-600 whitespace-pre-wrap font-mono", children: getPlaceholderValue(field) })] }, field.id))) }), _jsx("div", { className: "sticky bottom-0 bg-gray-50 border-t p-6 flex justify-end", children: _jsx(Button, { variant: "primary", onClick: onClose, children: "Close" }) })] }) }));
}
