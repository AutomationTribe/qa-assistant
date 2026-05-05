import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
export default function CreateProjectModal({ isOpen, onClose }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [style, setStyle] = useState('bdd');
    const [logins, setLogins] = useState([]);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { createProject } = useProjectStore();
    const handleAddLogin = () => {
        if (logins.length < 5) {
            setLogins([...logins, { username: '', password: '', role: '' }]);
        }
    };
    const handleRemoveLogin = (index) => {
        setLogins(logins.filter((_, i) => i !== index));
    };
    const handleLoginChange = (index, field, value) => {
        const updated = [...logins];
        updated[index] = { ...updated[index], [field]: value };
        setLogins(updated);
    };
    const handleCreate = async () => {
        setError(null);
        if (name.trim().length < 2) {
            setError('Project name must be at least 2 characters');
            return;
        }
        setIsSubmitting(true);
        try {
            await createProject({
                name: name.trim(),
                description: description.trim() || undefined,
                baseUrl: baseUrl.trim() || undefined,
                templateConfig: { style },
                logins: logins.length > 0 ? logins : undefined,
            });
            setName('');
            setDescription('');
            setBaseUrl('');
            setStyle('bdd');
            setLogins([]);
            onClose();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create project';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity", onClick: onClose }), _jsxs("div", { className: `fixed right-0 top-0 h-screen w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`, children: [_jsxs("div", { className: "p-6 border-b border-[#EBEBEB] flex items-center justify-between", children: [_jsx("h2", { className: "text-[15px] font-semibold text-[#111]", children: "Create New Project" }), _jsx("button", { onClick: onClose, className: "text-[#999] hover:text-[#111] text-2xl leading-none", disabled: isSubmitting, children: "\u00D7" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Project name", placeholder: "My project", value: name, onChange: (e) => setName(e.target.value), disabled: isSubmitting }), _jsx(Input, { label: "Description", placeholder: "What this project is about...", value: description, onChange: (e) => setDescription(e.target.value), optional: true, disabled: isSubmitting }), _jsx(Input, { label: "Base URL", type: "url", placeholder: "https://app.yourproduct.com", hint: "Helps the AI understand the context of your tests", value: baseUrl, onChange: (e) => setBaseUrl(e.target.value), optional: true, disabled: isSubmitting }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-xs font-medium text-[#333] block mb-3", children: "Testing Style" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: [
                                                { value: 'bdd', icon: '📋', label: 'BDD' },
                                                { value: 'step_by_step', icon: '🔢', label: 'Step by Step' },
                                                { value: 'exploratory', icon: '🔍', label: 'Exploratory' },
                                            ].map((option) => (_jsxs("button", { onClick: () => setStyle(option.value), disabled: isSubmitting, className: `py-3 px-2 rounded-lg text-center text-xs font-medium transition border-2 ${style === option.value
                                                    ? 'border-[#4F46E5] bg-[#EEEDF8] text-[#4F46E5]'
                                                    : 'border-[#DDDDD9] text-[#999] hover:border-[#4F46E5]/30'} disabled:opacity-50`, children: [_jsx("div", { className: "text-lg mb-1", children: option.icon }), option.label] }, option.value))) })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-[10.5px] font-semibold uppercase letter-spacing-[0.07em] text-[#999] block mb-3", children: "Test Logins" }), logins.map((login, idx) => (_jsxs("div", { className: "mb-3 p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAF8]", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("p", { className: "text-xs font-medium text-[#333]", children: ["Login ", idx + 1] }), _jsx("button", { onClick: () => handleRemoveLogin(idx), className: "text-[#EF4444] text-sm font-medium hover:opacity-80 disabled:opacity-50", disabled: isSubmitting, children: "Remove" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [_jsx("input", { type: "text", placeholder: "Username/Email", value: login.username, onChange: (e) => handleLoginChange(idx, 'username', e.target.value), className: "px-3 py-2 text-xs border border-[#DDDDD9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10", disabled: isSubmitting }), _jsx("input", { type: "password", placeholder: "Password", value: login.password, onChange: (e) => handleLoginChange(idx, 'password', e.target.value), className: "px-3 py-2 text-xs border border-[#DDDDD9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10", disabled: isSubmitting })] }), _jsx("input", { type: "text", placeholder: "Role (optional)", value: login.role || '', onChange: (e) => handleLoginChange(idx, 'role', e.target.value), className: "w-full px-3 py-2 text-xs border border-[#DDDDD9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10", disabled: isSubmitting })] }, idx))), logins.length < 5 && (_jsx("button", { onClick: handleAddLogin, disabled: isSubmitting, className: "w-full py-2 px-3 text-xs font-medium text-[#4F46E5] border border-dashed border-[#DDDDD9] rounded-lg hover:bg-[#FAFAF8] transition disabled:opacity-50", children: "+ Add another login" }))] }), error && (_jsx("div", { className: "bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs px-3 py-2 rounded-lg", children: error }))] }) }), _jsxs("div", { className: "p-6 border-t border-[#EBEBEB] flex gap-3", children: [_jsx(Button, { variant: "secondary", fullWidth: true, onClick: onClose, disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { fullWidth: true, loading: isSubmitting, onClick: handleCreate, children: "Create Project \u2192" })] })] })] }));
}
