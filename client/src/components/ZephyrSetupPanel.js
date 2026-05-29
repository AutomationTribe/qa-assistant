import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
import { zephyrAPI } from '@/api/zephyr';
import { toast } from '@/store/toastStore';
import SlidePanel from '@/components/ui/SlidePanel';
export default function ZephyrSetupPanel({ open, onClose, projectId, templateFields, onConnected, isEdit = false, currentConnection = null, }) {
    const [apiToken, setApiToken] = useState('');
    const [jiraProjectKey, setJiraProjectKey] = useState('');
    const [fieldMapping, setFieldMapping] = useState({
        name: '',
        steps: '',
    });
    const [error, setError] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const defaults = useMemo(() => {
        const defaults = {};
        // Auto-select sensible defaults
        const nameField = templateFields.find(f => f.key.toLowerCase().includes('title') || f.key.toLowerCase().includes('name'));
        if (nameField)
            defaults.name = nameField.key;
        const stepsField = templateFields.find(f => f.type === 'STEPS');
        if (stepsField)
            defaults.steps = stepsField.key;
        const objectiveField = templateFields.find(f => f.key.toLowerCase().includes('expected') || f.key.toLowerCase().includes('result'));
        if (objectiveField)
            defaults.objective = objectiveField.key;
        const priorityField = templateFields.find(f => f.key.toLowerCase().includes('priority'));
        if (priorityField)
            defaults.priority = priorityField.key;
        const precondField = templateFields.find(f => f.key.toLowerCase().includes('precondition'));
        if (precondField)
            defaults.precondition = precondField.key;
        return defaults;
    }, [templateFields]);
    // Initialize on open: use current connection in edit mode, or defaults in create mode
    useEffect(() => {
        if (open) {
            if (isEdit && currentConnection) {
                setJiraProjectKey(currentConnection.jiraProjectKey || '');
                setFieldMapping(currentConnection.fieldMapping || { name: '', steps: '' });
                setApiToken('');
            }
            else {
                setApiToken('');
                setJiraProjectKey('');
                if (Object.keys(defaults).length > 0) {
                    setFieldMapping(prev => ({ ...prev, ...defaults }));
                }
            }
        }
    }, [open, isEdit, currentConnection, defaults]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!apiToken.trim()) {
            setError('Zephyr Scale API Token is required');
            return;
        }
        if (!jiraProjectKey.trim()) {
            setError('Jira Project Key is required');
            return;
        }
        if (!fieldMapping.name || !fieldMapping.steps) {
            setError('Test Name and Test Steps mappings are required');
            return;
        }
        setIsTesting(true);
        try {
            const conn = await zephyrAPI.saveConnection(projectId, {
                apiToken,
                jiraProjectKey,
                fieldMapping,
            });
            console.log('✓ Zephyr connection saved:', conn);
            toast.success('Zephyr Scale connected');
            setApiToken('');
            setJiraProjectKey('');
            setFieldMapping({ name: '', steps: '' });
            setTimeout(() => {
                onConnected(conn);
                onClose();
            }, 500);
        }
        catch (err) {
            const msg = err?.response?.data?.error?.message || 'Connection failed';
            console.error('✗ Zephyr connection failed:', msg);
            setError(msg);
        }
        finally {
            setIsTesting(false);
        }
    };
    const handleClose = () => {
        setApiToken('');
        setJiraProjectKey('');
        setFieldMapping({ name: '', steps: '' });
        setError(null);
        onClose();
    };
    return (_jsx(SlidePanel, { open: open, onClose: handleClose, title: isEdit ? 'Edit Zephyr Scale Connection' : 'Connect Zephyr Scale', subtitle: isEdit ? 'Update your Zephyr Cloud integration settings' : 'Set up your Zephyr Cloud integration to export test cases', footer: _jsxs(_Fragment, { children: [_jsx("button", { onClick: handleClose, disabled: isTesting, className: "flex-1 py-2.5 bg-white text-[#444] border border-[#D0D0CC] rounded-lg text-[13px] cursor-pointer font-sans hover:bg-[#FAFAF8] disabled:opacity-50 transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleSubmit, disabled: isTesting || !apiToken.trim() || !jiraProjectKey.trim(), className: "flex-[2] py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white border-none rounded-lg text-[13px] font-medium cursor-pointer font-sans transition-colors flex items-center justify-center gap-2", children: isTesting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Testing connection..."] })) : isEdit ? ('Update Connection') : ('Connect to Zephyr') })] }), children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[13px] font-medium text-[#333] mb-2", children: "Zephyr Scale API Token *" }), _jsx("input", { type: "password", value: apiToken, onChange: e => setApiToken(e.target.value), placeholder: "Your Zephyr Scale API token", disabled: isTesting, className: "w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 disabled:opacity-50" }), _jsx("a", { href: "https://zephyrscale.smartbear.com/login", target: "_blank", rel: "noopener noreferrer", className: "text-[11px] text-[#4F46E5] hover:underline mt-1 inline-block", children: "Get your Zephyr Scale API token \u2192" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[13px] font-medium text-[#333] mb-2", children: "Jira Project Key *" }), _jsx("input", { type: "text", value: jiraProjectKey, onChange: e => setJiraProjectKey(e.target.value.toUpperCase()), placeholder: "e.g. MAP", disabled: isTesting, className: "w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 disabled:opacity-50" }), _jsx("span", { className: "text-[11px] text-[#aaa] mt-1 block", children: "The short code from your Jira project URL" })] }), _jsxs("div", { className: "border-t border-[#EBEBEB] pt-5", children: [_jsx("h3", { className: "text-[13px] font-medium text-[#333] mb-1", children: "Map your template fields to Zephyr" }), _jsx("p", { className: "text-[12px] text-[#888] mb-4", children: "Tell Regi which field contains each piece of information" }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex items-end gap-3", children: _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-[12px] font-medium text-[#555] mb-1", children: "Test Name *" }), _jsxs("select", { value: fieldMapping.name, onChange: e => setFieldMapping(prev => ({ ...prev, name: e.target.value })), disabled: isTesting, className: "w-full border border-[#DDDDD9] rounded-lg px-2 py-1.5 text-[12px] text-[#111] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 appearance-none cursor-pointer disabled:opacity-50", children: [_jsx("option", { value: "", children: "\u2014 select field \u2014" }), templateFields.map(f => (_jsxs("option", { value: f.key, children: [f.name, " (", f.key, ")"] }, f.key)))] })] }) }), _jsx("div", { className: "flex items-end gap-3", children: _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-[12px] font-medium text-[#555] mb-1", children: "Test Steps *" }), _jsxs("select", { value: fieldMapping.steps, onChange: e => setFieldMapping(prev => ({ ...prev, steps: e.target.value })), disabled: isTesting, className: "w-full border border-[#DDDDD9] rounded-lg px-2 py-1.5 text-[12px] text-[#111] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 appearance-none cursor-pointer disabled:opacity-50", children: [_jsx("option", { value: "", children: "\u2014 select field \u2014" }), templateFields.map(f => (_jsxs("option", { value: f.key, children: [f.name, " (", f.key, ")"] }, f.key)))] })] }) }), _jsx("div", { className: "flex items-end gap-3", children: _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-[12px] font-medium text-[#555] mb-1", children: "Objective" }), _jsxs("select", { value: fieldMapping.objective || '', onChange: e => setFieldMapping(prev => ({
                                                    ...prev,
                                                    objective: e.target.value || undefined,
                                                })), disabled: isTesting, className: "w-full border border-[#DDDDD9] rounded-lg px-2 py-1.5 text-[12px] text-[#111] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 appearance-none cursor-pointer disabled:opacity-50", children: [_jsx("option", { value: "", children: "\u2014 not mapped \u2014" }), templateFields.map(f => (_jsxs("option", { value: f.key, children: [f.name, " (", f.key, ")"] }, f.key)))] })] }) }), _jsx("div", { className: "flex items-end gap-3", children: _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-[12px] font-medium text-[#555] mb-1", children: "Priority" }), _jsxs("select", { value: fieldMapping.priority || '', onChange: e => setFieldMapping(prev => ({
                                                    ...prev,
                                                    priority: e.target.value || undefined,
                                                })), disabled: isTesting, className: "w-full border border-[#DDDDD9] rounded-lg px-2 py-1.5 text-[12px] text-[#111] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 appearance-none cursor-pointer disabled:opacity-50", children: [_jsx("option", { value: "", children: "\u2014 not mapped \u2014" }), templateFields.map(f => (_jsxs("option", { value: f.key, children: [f.name, " (", f.key, ")"] }, f.key)))] })] }) }), _jsx("div", { className: "flex items-end gap-3", children: _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-[12px] font-medium text-[#555] mb-1", children: "Precondition" }), _jsxs("select", { value: fieldMapping.precondition || '', onChange: e => setFieldMapping(prev => ({
                                                    ...prev,
                                                    precondition: e.target.value || undefined,
                                                })), disabled: isTesting, className: "w-full border border-[#DDDDD9] rounded-lg px-2 py-1.5 text-[12px] text-[#111] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 appearance-none cursor-pointer disabled:opacity-50", children: [_jsx("option", { value: "", children: "\u2014 not mapped \u2014" }), templateFields.map(f => (_jsxs("option", { value: f.key, children: [f.name, " (", f.key, ")"] }, f.key)))] })] }) })] })] }), error && (_jsx("div", { className: "text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2", children: error }))] }) }));
}
