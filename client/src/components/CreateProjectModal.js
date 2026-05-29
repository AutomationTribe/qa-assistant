import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/projectStore';
import SlidePanel from '@/components/ui/SlidePanel';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
export default function CreateProjectModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [methodology, setMethodology] = useState(null);
    const [agileClicked, setAgileClicked] = useState(false);
    const [urlError, setUrlError] = useState('');
    const [logins, setLogins] = useState([]);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { createProject } = useProjectStore();
    const URL_PATTERN = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$|^https?:\/\/localhost(:\d+)?(\/.*)?$/;
    const validateBaseUrl = (value) => {
        if (!value.trim()) {
            setUrlError('');
            return true;
        }
        const valid = URL_PATTERN.test(value.trim());
        setUrlError(valid ? '' : 'invalid');
        return valid;
    };
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
        if (!name.trim() || name.trim().length < 3) {
            setError('Project name must be at least 3 characters');
            return;
        }
        if (baseUrl && !validateBaseUrl(baseUrl)) {
            return;
        }
        if (!methodology) {
            setError('Please select a development methodology');
            return;
        }
        const validLogins = logins
            .filter((login) => login.username.trim() && login.password.trim())
            .map((login) => ({
            username: login.username.trim(),
            password: login.password.trim(),
            role: login.role?.trim() || undefined,
        }));
        setIsSubmitting(true);
        try {
            const project = await createProject({
                name: name.trim(),
                description: description.trim() || undefined,
                baseUrl: baseUrl.trim() || undefined,
                templateConfig: { style: methodology },
                logins: validLogins.length > 0 ? validLogins : undefined,
            });
            setName('');
            setDescription('');
            setBaseUrl('');
            setMethodology(null);
            setAgileClicked(false);
            setLogins([]);
            onClose();
            navigate(`/projects/${project.id}/template`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create project';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx(SlidePanel, { open: isOpen, onClose: onClose, title: "Create New Project", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", fullWidth: true, onClick: onClose, disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { fullWidth: true, loading: isSubmitting, onClick: handleCreate, children: "Create Project \u2192" })] }), children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Project name", placeholder: "My project", value: name, onChange: (e) => setName(e.target.value), disabled: isSubmitting }), _jsx(Input, { label: "Description", placeholder: "What this project is about...", value: description, onChange: (e) => setDescription(e.target.value), optional: true, disabled: isSubmitting }), _jsxs("div", { children: [_jsxs("label", { className: "text-xs font-medium text-[#333] block mb-2", children: ["Base URL", _jsx("span", { className: "text-[11px] font-normal text-[#aaa] ml-1", children: "optional" })] }), _jsx("input", { type: "text", value: baseUrl, onChange: e => {
                                setBaseUrl(e.target.value);
                                if (urlError)
                                    validateBaseUrl(e.target.value);
                            }, onBlur: e => validateBaseUrl(e.target.value), placeholder: "www.yourapp.com or https://yourapp.com", className: [
                                'w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10',
                                urlError ? 'border-[#E24B4A]' : 'border-[#DDDDD9]',
                            ].join(' '), disabled: isSubmitting }), urlError && (_jsx("div", { className: "text-[11.5px] text-[#A32D2D] mt-1", children: "Enter a valid URL \u2014 e.g. www.test.com, https://www.test.com or https://test.com" })), _jsx("div", { className: "flex gap-1.5 mt-1.5 flex-wrap", children: ['www.test.com', 'https://www.test.com', 'https://test.com', 'http://localhost:3000'].map(f => (_jsx("span", { className: "text-[11px] px-2 py-0.5 rounded-full bg-[#F4F4F2] border border-[#EBEBEB] font-mono text-[#666]", children: f }, f))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-[#333] block mb-3", children: "Development methodology" }), _jsx("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [
                                {
                                    value: 'waterfall',
                                    label: 'Waterfall',
                                    desc: 'Sequential phases with defined milestones',
                                    icon: '↓',
                                },
                                {
                                    value: 'agile',
                                    label: 'Agile',
                                    desc: 'Iterative delivery with continuous feedback',
                                    icon: '↻',
                                },
                            ].map(opt => {
                                const isWaterfall = opt.value === 'waterfall';
                                const isSelected = isWaterfall
                                    ? methodology === 'waterfall'
                                    : methodology === 'agile_scrum' || methodology === 'agile_kanban';
                                return (_jsxs("div", { onClick: () => {
                                        if (isWaterfall) {
                                            setMethodology('waterfall');
                                            setAgileClicked(false);
                                        }
                                        else {
                                            setAgileClicked(true);
                                            setMethodology(null);
                                        }
                                    }, className: [
                                        'border rounded-xl p-3 cursor-pointer transition-all',
                                        isSelected
                                            ? 'border-[#534AB7] bg-[#EEEDFE]'
                                            : 'border-[#DDDDD9] bg-white hover:border-[#AFA9EC]',
                                    ].join(' '), children: [_jsx("div", { className: `text-[13px] font-medium mb-0.5 ${isSelected ? 'text-[#534AB7]' : 'text-[#111]'}`, children: opt.label }), _jsx("div", { className: "text-[11.5px] text-[#888] leading-snug", children: opt.desc })] }, opt.value));
                            }) }), agileClicked && (_jsxs("div", { className: "mt-2 p-3 bg-[#FAFAF8] border border-[#EBEBEB] rounded-xl mb-3", children: [_jsx("div", { className: "text-[11px] font-medium text-[#888] uppercase tracking-wide mb-2", children: "Choose Agile framework" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                                        { value: 'scrum', label: 'Scrum', desc: 'Sprints, standups, retrospectives' },
                                        { value: 'kanban', label: 'Kanban', desc: 'Continuous flow, WIP limits' },
                                    ].map(sub => {
                                        const isSelected = methodology === `agile_${sub.value}`;
                                        return (_jsxs("div", { onClick: () => {
                                                setMethodology(`agile_${sub.value}`);
                                            }, className: [
                                                'border rounded-xl p-3 cursor-pointer transition-all flex items-start gap-2',
                                                isSelected
                                                    ? 'border-[#534AB7] bg-[#EEEDFE]'
                                                    : 'border-[#DDDDD9] bg-white hover:border-[#AFA9EC]',
                                            ].join(' '), children: [_jsx("div", { className: [
                                                        'w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 mt-0.5',
                                                        isSelected ? 'bg-[#534AB7] border-[#534AB7]' : 'border-[#DDDDD9]',
                                                    ].join(' ') }), _jsxs("div", { children: [_jsx("div", { className: `text-[13px] font-medium ${isSelected ? 'text-[#534AB7]' : 'text-[#111]'}`, children: sub.label }), _jsx("div", { className: "text-[11.5px] text-[#888]", children: sub.desc })] })] }, sub.value));
                                    }) })] })), methodology && (_jsxs("div", { className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEEDFE] border border-[#AFA9EC] text-[12px] font-medium text-[#3C3489]", children: [_jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-[#534AB7]" }), methodology === 'waterfall' && 'Waterfall', methodology === 'agile_scrum' && 'Agile — Scrum', methodology === 'agile_kanban' && 'Agile — Kanban'] }))] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-[10.5px] font-semibold uppercase letter-spacing-[0.07em] text-[#999] block mb-3", children: "Test Logins" }), logins.map((login, idx) => (_jsxs("div", { className: "mb-3 p-4 border border-[#EBEBEB] rounded-xl bg-[#FAFAF8]", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("p", { className: "text-xs font-medium text-[#333]", children: ["Login ", idx + 1] }), _jsx("button", { onClick: () => handleRemoveLogin(idx), className: "text-[#EF4444] text-sm font-medium hover:opacity-80 disabled:opacity-50", disabled: isSubmitting, children: "Remove" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [_jsx("input", { type: "text", placeholder: "Username/Email", value: login.username, onChange: (e) => handleLoginChange(idx, 'username', e.target.value), className: "px-3 py-2 text-xs border border-[#DDDDD9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10", disabled: isSubmitting }), _jsx("input", { type: "password", placeholder: "Password", value: login.password, onChange: (e) => handleLoginChange(idx, 'password', e.target.value), className: "px-3 py-2 text-xs border border-[#DDDDD9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10", disabled: isSubmitting })] }), _jsx("input", { type: "text", placeholder: "Role (optional)", value: login.role || '', onChange: (e) => handleLoginChange(idx, 'role', e.target.value), className: "w-full px-3 py-2 text-xs border border-[#DDDDD9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10", disabled: isSubmitting })] }, idx))), logins.length < 5 && (_jsx("button", { onClick: handleAddLogin, disabled: isSubmitting, className: "w-full py-2 px-3 text-xs font-medium text-[#4F46E5] border border-dashed border-[#DDDDD9] rounded-lg hover:bg-[#FAFAF8] transition disabled:opacity-50", children: "+ Add another login" }))] }), error && (_jsx("div", { className: "bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs px-3 py-2 rounded-lg", children: error }))] }) }));
}
