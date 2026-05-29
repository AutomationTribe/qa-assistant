import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { testCasesAPI } from '@/api/testcases';
import { toast } from '@/store/toastStore';
export default function AddTestCasePanel({ open, onClose, featureId, projectName, fields, onSaved, }) {
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [continueCreating, setContinueCreating] = useState(false);
    const [errors, setErrors] = useState({});
    // Reset form when panel opens
    useEffect(() => {
        if (open) {
            setValues({});
            setErrors({});
        }
    }, [open]);
    const updateValue = (key, value) => {
        setValues(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
        }
    };
    // Steps are stored as pipe-separated strings: "Action | Data | Expected"
    const updateStep = (stepIndex, part, value, stepsKey) => {
        const current = Array.isArray(values[stepsKey])
            ? [...values[stepsKey]]
            : [''];
        while (current.length <= stepIndex)
            current.push('');
        const parts = current[stepIndex].split('|').map(s => s.trim());
        while (parts.length < 3)
            parts.push('');
        if (part === 'action')
            parts[0] = value;
        if (part === 'data')
            parts[1] = value;
        if (part === 'expected')
            parts[2] = value;
        current[stepIndex] = parts.join(' | ');
        updateValue(stepsKey, current);
    };
    const addStep = (stepsKey) => {
        const current = Array.isArray(values[stepsKey])
            ? [...values[stepsKey]]
            : [];
        updateValue(stepsKey, [...current, ' | | ']);
    };
    const removeStep = (stepsKey, index) => {
        const current = Array.isArray(values[stepsKey])
            ? [...values[stepsKey]]
            : [];
        updateValue(stepsKey, current.filter((_, i) => i !== index));
    };
    const validate = () => {
        const newErrors = {};
        fields.forEach(field => {
            if (field.required) {
                const val = values[field.key];
                if (field.type === 'STEPS') {
                    const steps = Array.isArray(val) ? val : [];
                    const hasStep = steps.some(s => s.replace(/\|/g, '').trim().length > 0);
                    if (!hasStep)
                        newErrors[field.key] = 'At least one step is required';
                }
                else if (!val || String(val).trim() === '') {
                    newErrors[field.key] = `${field.name} is required`;
                }
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSave = async () => {
        if (!validate())
            return;
        setSaving(true);
        try {
            const testCase = await testCasesAPI.createTestCase(featureId, values);
            onSaved(testCase);
            toast.success('Test case saved successfully');
            if (continueCreating) {
                setValues({});
                setErrors({});
            }
            else {
                onClose();
            }
        }
        catch {
            toast.error('Failed to save test case. Please try again.');
        }
        finally {
            setSaving(false);
        }
    };
    if (!open)
        return null;
    const stepsField = fields.find(f => f.type === 'STEPS');
    const otherFields = fields.filter(f => f.type !== 'STEPS');
    return createPortal(_jsxs("div", { className: "fixed inset-0 z-50 flex justify-end", children: [_jsx("div", { className: "absolute inset-0 bg-black/20", onClick: onClose }), _jsxs("div", { className: "relative w-[380px] bg-white flex flex-col h-full shadow-none border-l border-[#EBEBEB] z-10", children: [_jsxs("div", { className: "px-4 pt-4 pb-3 border-b border-[#EBEBEB] flex-shrink-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("div", { className: "text-[14px] font-medium text-[#111]", children: "Add test case" }), _jsx("button", { onClick: onClose, className: "w-6 h-6 rounded-md border border-[#EBEBEB] flex items-center justify-center text-[#888] hover:text-[#333] text-[14px]", children: "\u2715" })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-[11.5px] text-[#888]", children: [_jsx("span", { children: "Using" }), _jsx("span", { className: "font-medium text-[#111]", children: projectName }), _jsxs("span", { children: ["template \u00B7 ", fields.length, " fields"] })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-4 py-4", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 bg-[#FAFAF8] rounded-lg border border-[#EBEBEB] mb-4 text-[11.5px] text-[#888]", children: [_jsx("span", { style: { color: '#534AB7', fontSize: 14 }, children: "\u25EB" }), _jsx("span", { children: "Fields match your saved template. Edit the template to update these fields." })] }), otherFields.map(field => (_jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "flex items-center gap-1.5 text-[12px] font-medium text-[#111] mb-1.5", children: [field.name, field.required && _jsx("span", { className: "text-[#E24B4A] text-[11px]", children: "*" }), !field.required && _jsx("span", { className: "text-[11px] font-normal text-[#aaa]", children: "optional" })] }), field.type === 'TEXT' && (_jsx("input", { type: "text", value: String(values[field.key] || ''), onChange: e => updateValue(field.key, e.target.value), placeholder: field.description || `Enter ${field.name.toLowerCase()}`, className: `w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none focus:border-[#534AB7] focus:ring-2 focus:ring-[#EEEDFE] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}` })), field.type === 'TEXTAREA' && (_jsx("textarea", { value: String(values[field.key] || ''), onChange: e => updateValue(field.key, e.target.value), placeholder: field.description || `Enter ${field.name.toLowerCase()}`, rows: 2, className: `w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none resize-none focus:border-[#534AB7] focus:ring-2 focus:ring-[#EEEDFE] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}` })), field.type === 'SELECT' && Array.isArray(field.options) && (_jsxs("select", { value: String(values[field.key] || ''), onChange: e => updateValue(field.key, e.target.value), className: `w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none cursor-pointer focus:border-[#534AB7] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}`, children: [_jsxs("option", { value: "", children: ["Select ", field.name.toLowerCase()] }), field.options.map(opt => (_jsx("option", { value: opt, children: opt }, opt)))] })), field.type === 'BOOLEAN' && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: `field-${field.key}`, checked: Boolean(values[field.key]), onChange: e => updateValue(field.key, e.target.checked), className: "w-4 h-4 accent-[#4F46E5]" }), _jsx("label", { htmlFor: `field-${field.key}`, className: "text-[12.5px] text-[#333]", children: field.description || field.name })] })), field.type === 'NUMBER' && (_jsx("input", { type: "number", value: values[field.key] ?? '', onChange: e => updateValue(field.key, Number(e.target.value)), placeholder: "0", className: `w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none focus:border-[#534AB7] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}` })), errors[field.key] && (_jsx("div", { className: "text-[11px] text-[#A32D2D] mt-1", children: errors[field.key] }))] }, field.key))), stepsField && (_jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "flex items-center gap-1.5 text-[12px] font-medium text-[#111] mb-1.5", children: [stepsField.name, stepsField.required && _jsx("span", { className: "text-[#E24B4A] text-[11px]", children: "*" })] }), _jsxs("div", { className: "border border-[#DDDDD9] rounded-lg overflow-hidden", children: [_jsx("div", { className: "grid grid-cols-[22px_1fr_1fr_1fr] bg-[#FAFAF8] border-b border-[#EBEBEB]", children: ['#', 'Action', 'Test data', 'Expected result'].map(h => (_jsx("div", { className: "px-2 py-1.5 text-[10px] font-medium text-[#888] uppercase tracking-wide", children: h }, h))) }), (values[stepsField.key] || ['']).map((step, i) => {
                                                const parts = step.split('|').map(s => s.trim());
                                                while (parts.length < 3)
                                                    parts.push('');
                                                return (_jsxs("div", { className: "grid grid-cols-[22px_1fr_1fr_1fr] border-b border-[#F2F2EF] last:border-b-0", children: [_jsx("div", { className: "px-1.5 py-2 text-[10.5px] text-[#aaa] font-mono text-center border-r border-[#EBEBEB] flex items-start pt-2", children: i + 1 }), ['action', 'data', 'expected'].map((part, pi) => (_jsx("div", { className: "p-1", children: _jsx("textarea", { value: parts[pi] || '', onChange: e => updateStep(i, part, e.target.value, stepsField.key), placeholder: part === 'action' ? 'Navigate to...' : part === 'data' ? 'URL, data...' : 'Should show...', rows: 2, className: "w-full border-none bg-transparent text-[11.5px] font-sans text-[#111] outline-none resize-none focus:bg-[#FAFAF8] rounded px-1 py-1 leading-snug" }) }, part)))] }, i));
                                            }), _jsxs("div", { className: "flex items-center justify-between px-2 py-1.5 bg-[#FAFAF8] border-t border-[#EBEBEB]", children: [_jsx("button", { type: "button", onClick: () => addStep(stepsField.key), className: "text-[11.5px] text-[#888] hover:text-[#4F46E5] flex items-center gap-1", children: "\uFF0B Add step" }), (values[stepsField.key] || []).length > 1 && (_jsx("button", { type: "button", onClick: () => removeStep(stepsField.key, (values[stepsField.key] || []).length - 1), className: "text-[11px] text-[#aaa] hover:text-[#EF4444]", children: "Remove last" }))] })] }), errors[stepsField.key] && (_jsx("div", { className: "text-[11px] text-[#A32D2D] mt-1", children: errors[stepsField.key] }))] }))] }), _jsxs("div", { className: "px-4 py-3 border-t border-[#EBEBEB] flex-shrink-0 bg-[#FAFAF8]", children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-3 cursor-pointer", onClick: () => setContinueCreating(p => !p), children: [_jsx("div", { className: `w-8 h-5 rounded-full relative transition-colors ${continueCreating ? 'bg-[#4F46E5]' : 'bg-[#D0D0CC]'}`, children: _jsx("div", { className: `w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${continueCreating ? 'left-[17px]' : 'left-[3px]'}` }) }), _jsxs("div", { children: [_jsx("div", { className: "text-[12.5px] text-[#111]", children: "Create another after saving" }), _jsx("div", { className: "text-[11px] text-[#aaa]", children: continueCreating
                                                    ? 'Pane stays open to add another'
                                                    : 'Pane will close after saving' })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onClose, className: "flex-1 py-2 border border-[#D0D0CC] rounded-lg text-[12.5px] bg-white text-[#444] hover:bg-[#FAFAF8]", children: "Cancel" }), _jsx("button", { onClick: handleSave, disabled: saving, className: "flex-[2] py-2 border-none rounded-lg text-[12.5px] font-medium bg-[#4F46E5] text-white hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-1.5", children: saving ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Saving..."] })) : (_jsx(_Fragment, { children: "\u2713 Save test case" })) })] })] })] })] }), document.body);
}
