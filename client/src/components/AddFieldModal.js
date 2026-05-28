import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
const FIELD_TYPES = ['TEXT', 'TEXTAREA', 'STEPS', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'NUMBER'];
const TYPE_LABELS = {
    TEXT: { label: 'Text', icon: 'T', description: 'short single line' },
    TEXTAREA: { label: 'Long Text', icon: '¶', description: 'multi-line paragraph' },
    STEPS: { label: 'Steps', icon: '#', description: 'numbered list of steps' },
    SELECT: { label: 'Select', icon: '▼', description: 'pick one from a list' },
    MULTISELECT: { label: 'Multi-select', icon: '☑', description: 'pick multiple from a list' },
    BOOLEAN: { label: 'Yes/No', icon: '✓', description: 'boolean toggle' },
    NUMBER: { label: 'Number', icon: '0', description: 'numeric value' },
};
const generateKeyFromName = (name) => {
    return name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
};
export default function AddFieldModal({ onSubmit, onCancel, initialField, isEditing }) {
    const [name, setName] = useState(initialField?.name ?? '');
    const [key, setKey] = useState(initialField?.key ?? '');
    const [type, setType] = useState(initialField?.type ?? 'TEXT');
    const [description, setDescription] = useState(initialField?.description ?? '');
    const [required, setRequired] = useState(initialField?.required ?? true);
    const [options, setOptions] = useState(initialField?.options ?? []);
    const [optionInput, setOptionInput] = useState('');
    useEffect(() => {
        if (name && !initialField?.key) {
            setKey(generateKeyFromName(name));
        }
    }, [name, initialField?.key]);
    const handleAddOption = () => {
        if (optionInput.trim()) {
            setOptions([...options, optionInput.trim()]);
            setOptionInput('');
        }
    };
    const handleRemoveOption = (index) => {
        setOptions(options.filter((_, i) => i !== index));
    };
    const handleSubmit = () => {
        if (!name.trim() || !key.trim()) {
            return;
        }
        const field = {
            name: name.trim(),
            key: key.trim(),
            type,
            description: description.trim() || undefined,
            required,
            ...(['SELECT', 'MULTISELECT'].includes(type) && { options: options.length > 0 ? options : undefined }),
        };
        onSubmit(field);
    };
    const isValid = name.trim() && key.trim() && !/[^a-z0-9_]/.test(key);
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: [_jsx("div", { className: "sticky top-0 bg-white border-b p-6", children: _jsx("h2", { className: "text-xl font-semibold", children: isEditing ? 'Edit Field' : 'Add Field' }) }), _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Field name *" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Test Steps, Expected Result, Priority", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Field key *" }), _jsx("input", { type: "text", value: key, onChange: (e) => setKey(e.target.value), placeholder: "auto-generated from name", className: "w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Used by the AI to identify this field. Letters, numbers, underscores only." }), !isValid && key && /[^a-z0-9_]/.test(key) && _jsx("p", { className: "text-xs text-red-500 mt-1", children: "Invalid characters in key" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-3", children: "Field type *" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: FIELD_TYPES.map((fieldType) => (_jsxs("button", { onClick: () => setType(fieldType), className: `p-3 border-2 rounded-lg text-left transition-all ${type === fieldType ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`, children: [_jsx("div", { className: "font-semibold text-lg", children: TYPE_LABELS[fieldType].icon }), _jsx("div", { className: "font-medium", children: TYPE_LABELS[fieldType].label }), _jsx("div", { className: "text-xs text-gray-500", children: TYPE_LABELS[fieldType].description })] }, fieldType))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Describe what the AI should put in this field" }), _jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), placeholder: "e.g. List each step the tester needs to perform, numbered from 1. Be specific and actionable.", maxLength: 200, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none", rows: 3 }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "This is read by the AI \u2014 the better you describe it, the better the output" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setRequired(!required), className: `flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${required
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`, children: "Required" }), _jsx("button", { onClick: () => setRequired(!required), className: `flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${!required ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`, children: "Optional" })] }), ['SELECT', 'MULTISELECT'].includes(type) && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Options" }), _jsxs("div", { className: "flex gap-2 mb-3", children: [_jsx("input", { type: "text", value: optionInput, onChange: (e) => setOptionInput(e.target.value), onKeyDown: (e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddOption();
                                                }
                                            }, placeholder: "e.g. High, Medium, Low", className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" }), _jsx(Button, { variant: "secondary", size: "md", onClick: handleAddOption, children: "Add" })] }), options.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: options.map((option, idx) => (_jsxs("div", { className: "bg-indigo-100 text-indigo-900 px-3 py-1 rounded-full flex items-center gap-2 text-sm", children: [option, _jsx("button", { onClick: () => handleRemoveOption(idx), className: "text-indigo-600 hover:text-indigo-900 font-bold cursor-pointer", children: "\u00D7" })] }, idx))) }))] }))] }), _jsxs("div", { className: "sticky bottom-0 bg-gray-50 border-t p-6 flex justify-between gap-3", children: [_jsx(Button, { variant: "ghost", onClick: onCancel, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSubmit, disabled: !isValid, children: isEditing ? 'Save Changes' : 'Add Field' })] })] }) }));
}
