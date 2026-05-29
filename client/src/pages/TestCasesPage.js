import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTestCaseStore } from '@/store/testCaseStore';
import { toast } from '@/store/toastStore';
import { useProjectStore } from '@/store/projectStore';
import { useFeatureStore } from '@/store/featureStore';
import { zephyrAPI } from '@/api/zephyr';
import Layout from '@/components/Layout';
import ZephyrExportModal from '@/components/ZephyrExportModal';
function parseSteps(raw) {
    if (!raw)
        return [{ action: '', data: '', expected: '' }];
    const arr = Array.isArray(raw) ? raw : [String(raw)];
    return arr.map(s => {
        const parts = String(s || '').split('|').map(p => p.trim());
        return {
            action: parts[0] || '',
            data: parts[1] || '',
            expected: parts[2] || '',
        };
    });
}
function findStepsKey(fields) {
    return fields.find(f => f.type === 'STEPS')?.key || 'steps';
}
function findObjectiveKey(fields) {
    return fields.find(f => f.key.includes('objective') || f.key.includes('expected_result'))?.key || null;
}
function findPreconditionsKey(fields) {
    return fields.find(f => f.key.includes('precondition') || f.key.includes('pre_condition'))?.key || null;
}
function findNameKey(fields) {
    return fields.find(f => f.key.includes('name') || f.key.includes('title'))?.key || null;
}
function findPriorityKey(fields) {
    return fields.find(f => f.key.includes('priority'))?.key || null;
}
function findTypeKey(fields) {
    return fields.find(f => f.key.includes('type'))?.key || null;
}
function getOtherFields(fields) {
    const stepsKey = findStepsKey(fields);
    const objKey = findObjectiveKey(fields);
    const preKey = findPreconditionsKey(fields);
    const nameKey = findNameKey(fields);
    const priorityKey = findPriorityKey(fields);
    const typeKey = findTypeKey(fields);
    const excludedKeys = [stepsKey, objKey, preKey, nameKey, priorityKey, typeKey].filter(Boolean);
    return fields.filter(f => !excludedKeys.includes(f.key));
}
export default function TestCasesPage() {
    const { projectId, featureId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { testCases, fields, loading, generating, fetchTestCases, generateTestCases, updateTestCase, deleteTestCase, clearTestCases } = useTestCaseStore();
    const { projects } = useProjectStore();
    const { features } = useFeatureStore();
    const project = projects.find(p => p.id === projectId);
    const feature = features.find(f => f.id === featureId);
    const [allEditMode, setAllEditMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [deletingId, setDeletingId] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [zephyrConn, setZephyrConn] = useState(null);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    useEffect(() => {
        if (!featureId)
            return;
        // Clear previous feature's test cases when navigating to a new feature
        clearTestCases();
        const shouldGenerate = searchParams.get('generate') === 'true';
        if (shouldGenerate) {
            // Clear the query param IMMEDIATELY — synchronous, before any async call
            // This means even if the user refreshes mid-generation, the param is gone
            setSearchParams({}, { replace: true });
            // Check if test cases already exist for this feature
            // If they do, just load them — do not regenerate
            fetchTestCases(featureId).then(() => {
                // fetchTestCases updates the store — check count after
                const existingCount = useTestCaseStore.getState().testCases.length;
                if (existingCount > 0) {
                    // Test cases already exist — show them in edit mode for review
                    // but do NOT generate new ones
                    setAllEditMode(true);
                    const init = {};
                    useTestCaseStore.getState().testCases.forEach(tc => {
                        init[tc.id] = { ...tc.fieldValues };
                    });
                    setDrafts(init);
                    const ids = new Set(useTestCaseStore.getState().testCases.map(tc => tc.id));
                    setExpandedIds(ids);
                }
                else {
                    // No test cases yet — run generation
                    setAllEditMode(true);
                    handleGenerate();
                }
            });
        }
        else {
            fetchTestCases(featureId);
        }
    }, [featureId]);
    useEffect(() => {
        if (allEditMode && testCases.length > 0) {
            const ids = new Set(testCases.map(tc => tc.id));
            setExpandedIds(ids);
            const init = {};
            testCases.forEach(tc => { init[tc.id] = { ...tc.fieldValues }; });
            setDrafts(init);
        }
    }, [testCases, allEditMode]);
    useEffect(() => {
        if (!projectId)
            return;
        zephyrAPI.getConnection(projectId).then(conn => {
            setZephyrConn(conn);
        }).catch(() => { });
    }, [projectId]);
    const handleGenerate = async () => {
        if (!featureId)
            return;
        setAllEditMode(true);
        try {
            const { testCases: generated, alreadyExisted } = await generateTestCases(featureId);
            if (alreadyExisted) {
                toast.info('Test cases already generated — showing existing ones');
            }
            else {
                toast.success(`${generated.length} test cases generated — review and save`);
            }
            // Pre-populate drafts regardless
            const init = {};
            generated.forEach(tc => { init[tc.id] = { ...tc.fieldValues }; });
            setDrafts(init);
            const ids = new Set(generated.map(tc => tc.id));
            setExpandedIds(ids);
        }
        catch (err) {
            setAllEditMode(false);
            toast.error(err?.response?.data?.error?.message || 'Generation failed. Please try again.');
        }
    };
    const toggleExpand = (id) => {
        if (allEditMode)
            return;
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        if (!expandedIds.has(id)) {
            const tc = testCases.find(t => t.id === id);
            if (tc) {
                setDrafts(prev => ({ ...prev, [id]: { ...tc.fieldValues } }));
            }
        }
    };
    const updateDraft = (id, key, value) => {
        setDrafts(prev => ({
            ...prev,
            [id]: { ...(prev[id] || {}), [key]: value }
        }));
    };
    const updateStep = (id, stepIndex, part, value) => {
        const draft = drafts[id] || testCases.find(tc => tc.id === id)?.fieldValues || {};
        const stepsKey = findStepsKey(fields);
        const steps = [...(draft[stepsKey] || [])];
        const parts = (steps[stepIndex] || '').split('|').map(s => s.trim());
        while (parts.length < 3)
            parts.push('');
        if (part === 'action')
            parts[0] = value;
        if (part === 'data')
            parts[1] = value;
        if (part === 'expected')
            parts[2] = value;
        steps[stepIndex] = parts.join(' | ');
        updateDraft(id, stepsKey, steps);
    };
    const addStep = (id) => {
        const draft = drafts[id] || {};
        const stepsKey = findStepsKey(fields);
        const steps = [...(draft[stepsKey] || []), ' | | '];
        updateDraft(id, stepsKey, steps);
    };
    const removeStep = (id, stepIndex) => {
        const draft = drafts[id] || {};
        const stepsKey = findStepsKey(fields);
        const steps = [...(draft[stepsKey] || [])];
        steps.splice(stepIndex, 1);
        updateDraft(id, stepsKey, steps);
    };
    const handleSaveAll = async () => {
        try {
            await Promise.all(testCases.map(tc => {
                const draft = drafts[tc.id];
                if (!draft)
                    return Promise.resolve();
                return updateTestCase(tc.id, draft);
            }));
            setAllEditMode(false);
            setExpandedIds(new Set());
            setDrafts({});
            toast.success('All test cases saved');
        }
        catch {
            toast.error('Failed to save some test cases. Please try again.');
        }
    };
    const handleSaveOne = async (id) => {
        const draft = drafts[id];
        if (!draft) {
            setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            return;
        }
        try {
            await updateTestCase(id, draft);
            setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            const next = { ...drafts };
            delete next[id];
            setDrafts(next);
            toast.success('Test case saved');
        }
        catch {
            toast.error('Failed to save test case');
        }
    };
    const handleDelete = async (id) => {
        try {
            await deleteTestCase(id);
            setDeletingId(null);
            toast.success('Test case deleted');
        }
        catch {
            toast.error('Failed to delete test case');
        }
    };
    const actions = (_jsxs("div", { className: "flex items-center gap-2", children: [allEditMode && testCases.length > 0 && (_jsx("button", { onClick: handleSaveAll, className: "bg-[#059669] hover:bg-[#047857] text-white border-none rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer font-sans flex items-center gap-1.5", children: "\u2713 Save all" })), testCases.length > 0 && (_jsx("button", { onClick: handleGenerate, className: "flex items-center gap-1.5 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors", children: "\u2726 Regenerate" })), zephyrConn ? (_jsx("button", { onClick: () => setExportModalOpen(true), className: "flex items-center gap-1.5 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors", children: "\u2197 Export to Zephyr" })) : (_jsx("button", { onClick: () => navigate(`/projects/${projectId}/template`), className: "flex items-center gap-1.5 bg-white text-[#888] border border-[#D8D8D4] rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer", children: "\u2699 Connect Zephyr" })), _jsx("button", { className: "flex items-center gap-1.5 bg-[#4F46E5] text-white border-none rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#4338CA] transition-colors", children: "\uFF0B Add test case" })] }));
    return (_jsx(Layout, { title: "Test Cases", actions: actions, children: _jsxs("div", { children: [_jsxs("div", { className: "mb-4 text-[12.5px] text-[#999] flex items-center gap-1", children: [_jsx("button", { onClick: () => navigate('/projects'), className: "text-[#999] hover:text-[#4F46E5] cursor-pointer", children: "Projects" }), _jsx("span", { className: "text-[#D0D0CC]", children: "\u203A" }), _jsx("button", { onClick: () => navigate(`/projects/${projectId}/features`), className: "text-[#111] font-medium hover:text-[#4F46E5] cursor-pointer", children: project?.name || 'Project' }), _jsx("span", { className: "text-[#D0D0CC]", children: "\u203A" }), _jsx("button", { onClick: () => navigate(`/projects/${projectId}/features/${featureId}/testcases`), className: "text-[#111] font-medium hover:text-[#4F46E5] cursor-pointer", children: feature?.name || 'Feature' }), _jsx("span", { className: "text-[#D0D0CC]", children: "\u203A" }), _jsx("span", { className: "text-[#111] font-medium", children: "Test Cases" })] }), allEditMode && !generating && testCases.length > 0 && (_jsxs("div", { className: "bg-[#F0EFFD] border border-[#C4C2F4] rounded-xl px-4 py-3 mb-3 flex items-center gap-3", children: [_jsx("span", { className: "text-[#4F46E5] text-[15px] flex-shrink-0", children: "\u2726" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "text-[13px] font-medium text-[#4F46E5]", children: [testCases.length, " test cases generated \u2014 review and edit before saving"] }), _jsx("div", { className: "text-[12px] text-[#6B64D0] mt-0.5", children: "All rows are open. Click Save all when done." })] }), _jsx("button", { onClick: handleSaveAll, className: "bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-4 py-2 text-[12px] font-medium cursor-pointer font-sans flex-shrink-0", children: "Save all \u2192" })] })), generating && (_jsxs("div", { className: "bg-white border border-[#EBEBEB] rounded-xl overflow-hidden", children: [_jsxs("div", { className: "px-4 py-3 bg-[#FAFAF8] border-b flex items-center gap-2", children: [_jsx("div", { className: "w-3.5 h-3.5 border-2 border-[#EEEDF8] border-t-[#4F46E5] rounded-full animate-spin" }), _jsx("span", { className: "text-[12.5px] text-[#4F46E5] font-medium animate-pulse", children: "Generating test cases with AI..." })] }), [1, 2, 3].map(i => (_jsx("div", { className: "border-b last:border-b-0", children: _jsxs("div", { className: "grid grid-cols-[30px_1fr_75px_90px_72px] p-3 gap-3", children: [_jsx("div", { className: "h-3 w-3 rounded-full bg-[#F0F0ED] animate-pulse" }), _jsx("div", { className: "h-3 rounded bg-[#F0F0ED] animate-pulse w-2/3" }), _jsx("div", { className: "h-3 rounded bg-[#F0F0ED] animate-pulse w-10" }), _jsx("div", { className: "h-3 rounded bg-[#F0F0ED] animate-pulse w-14" }), _jsx("div", {})] }) }, i)))] })), !loading && !generating && testCases.length === 0 && (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsxs("div", { className: "text-center max-w-[360px]", children: [_jsx("div", { className: "w-14 h-14 rounded-2xl bg-[#EEEDF8] flex items-center justify-center text-2xl mx-auto mb-4", children: "\u2713" }), _jsx("h3", { className: "text-[16px] font-semibold text-[#111] mb-2", children: "No test cases yet" }), _jsx("p", { className: "text-[13px] text-[#888] leading-relaxed mb-6", children: "Generate them with AI or add them manually." }), _jsx("div", { className: "flex flex-col gap-3", children: _jsx("button", { onClick: handleGenerate, className: "bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-5 py-2.5 text-[13px] font-medium cursor-pointer font-sans", children: "\u2726 Generate with AI" }) })] }) })), !loading && !generating && testCases.length > 0 && (_jsxs("div", { className: "bg-white border border-[#EBEBEB] rounded-xl overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-[30px_1fr_75px_90px_72px] bg-[#FAFAF8] border-b", children: [_jsx("div", { className: "th" }), _jsx("div", { className: "th", children: "Test case" }), _jsx("div", { className: "th", children: "Priority" }), _jsx("div", { className: "th", children: "Type" }), _jsx("div", { className: "th text-right pr-3", children: "Actions" })] }), testCases.map((tc, index) => {
                            const isExpanded = expandedIds.has(tc.id);
                            const isDeleting = deletingId === tc.id;
                            const draft = drafts[tc.id] || tc.fieldValues;
                            const nameKey = findNameKey(fields);
                            const priorityKey = findPriorityKey(fields);
                            const typeKey = findTypeKey(fields);
                            if (isDeleting) {
                                return (_jsx("div", { className: "border-b last:border-b-0 bg-[#FEF2F2]", children: _jsxs("div", { className: "flex items-center gap-3 px-4 py-3 text-[12.5px] text-[#DC2626]", children: [_jsx("span", { className: "text-[15px]", children: "\u26A0" }), "Delete \"", draft[nameKey] || 'Untitled', "\"? This cannot be undone.", _jsx("button", { onClick: () => handleDelete(tc.id), className: "bg-[#DC2626] hover:bg-[#991B1B] text-white border-none rounded-lg px-3 py-1 text-[12px] font-medium cursor-pointer", children: "Yes, delete" }), _jsx("button", { onClick: () => setDeletingId(null), className: "bg-white text-[#555] border border-[#D0D0CC] rounded-lg px-3 py-1 text-[12px] font-medium cursor-pointer", children: "Cancel" })] }) }, tc.id));
                            }
                            return (_jsxs("div", { className: "border-b last:border-b-0", children: [_jsxs("div", { className: "grid grid-cols-[30px_1fr_75px_90px_72px] items-center cursor-pointer hover:bg-[#FAFAF9]", style: isExpanded ? { background: '#FAFAFE' } : {}, onClick: () => toggleExpand(tc.id), children: [_jsx("div", { className: `tc-chev ${isExpanded ? 'open' : ''}`, children: "\u25B6" }), _jsxs("div", { className: "p-3", children: [_jsx("div", { className: "text-[13px] font-medium text-[#111]", children: draft[nameKey] || 'Untitled test case' }), _jsxs("div", { className: "text-[10.5px] text-[#C0C0BC] font-mono mt-0.5", children: ["TC-", String(index + 1).padStart(3, '0')] })] }), _jsx("div", { className: "p-3", children: _jsx(PriorityBadge, { value: draft[priorityKey] }) }), _jsx("div", { className: "p-3", children: _jsx(TypeBadge, { value: draft[typeKey] }) }), _jsx("div", { className: "p-3 flex gap-1 justify-end", onClick: e => e.stopPropagation(), children: _jsx("button", { onClick: () => setDeletingId(tc.id), className: "icon-btn danger", children: "\uD83D\uDDD1" }) })] }), isExpanded && (_jsxs("div", { className: "bg-[#FAFAFE] border-t border-[#EBEBEB] px-4 py-4 pl-10", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 mb-4", children: [findObjectiveKey(fields) && (_jsxs("div", { children: [_jsx("label", { className: "field-label", children: "Objective" }), _jsx("textarea", { className: "field-textarea", value: draft[findObjectiveKey(fields)] || '', onChange: e => updateDraft(tc.id, findObjectiveKey(fields), e.target.value) })] })), findPreconditionsKey(fields) && (_jsxs("div", { children: [_jsx("label", { className: "field-label", children: "Preconditions" }), _jsx("textarea", { className: "field-textarea", value: draft[findPreconditionsKey(fields)] || '', onChange: e => updateDraft(tc.id, findPreconditionsKey(fields), e.target.value) })] }))] }), _jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "text-[11px] font-semibold text-[#888] uppercase tracking-wide", children: "Test steps" }), _jsx("div", { className: "flex-1 h-px bg-[#EBEBEB]" })] }), _jsxs("div", { className: "bg-white border border-[#EBEBEB] rounded-[9px] overflow-hidden mb-3", children: [_jsxs("div", { className: "grid grid-cols-[28px_1fr_1fr_1fr_28px] bg-[#F5F5F3] border-b border-[#EBEBEB]", children: [_jsx("div", { className: "step-th", children: "#" }), _jsx("div", { className: "step-th", children: "Action" }), _jsx("div", { className: "step-th", children: "Test data" }), _jsx("div", { className: "step-th", children: "Expected result" }), _jsx("div", {})] }), parseSteps(draft[findStepsKey(fields)]).map((step, i) => (_jsxs("div", { className: "grid grid-cols-[28px_1fr_1fr_1fr_28px] border-b last:border-b-0", children: [_jsx("div", { className: "step-num", children: i + 1 }), _jsx("div", { className: "step-cell", children: _jsx("textarea", { className: "step-input", value: step.action, onChange: e => updateStep(tc.id, i, 'action', e.target.value) }) }), _jsx("div", { className: "step-cell", children: _jsx("textarea", { className: "step-input", value: step.data, onChange: e => updateStep(tc.id, i, 'data', e.target.value) }) }), _jsx("div", { className: "step-cell", children: _jsx("textarea", { className: "step-input", value: step.expected, onChange: e => updateStep(tc.id, i, 'expected', e.target.value) }) }), _jsx("div", { className: "step-del border-l border-[#EBEBEB] flex items-start pt-2 justify-center", children: _jsx("button", { onClick: () => removeStep(tc.id, i), className: "icon-btn danger small", children: "\u2715" }) })] }, i))), _jsx("div", { className: "p-2 border-t border-[#EBEBEB]", children: _jsx("button", { onClick: () => addStep(tc.id), className: "add-step-btn", children: "\uFF0B Add step" }) })] }), getOtherFields(fields).map(field => (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "field-label", children: field.name }), _jsx("textarea", { className: "field-textarea", value: String(draft[field.key] || ''), onChange: e => updateDraft(tc.id, field.key, e.target.value) })] }, field.key))), !allEditMode && (_jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx("button", { onClick: () => handleSaveOne(tc.id), className: "btn-g text-[11.5px]", children: "\u2713 Save" }), _jsx("button", { onClick: () => {
                                                            setExpandedIds(prev => { const n = new Set(prev); n.delete(tc.id); return n; });
                                                        }, className: "btn-s text-[11.5px]", children: "Cancel" })] }))] }))] }, tc.id));
                        })] })), zephyrConn && (_jsx(ZephyrExportModal, { open: exportModalOpen, onClose: () => {
                        setExportModalOpen(false);
                    }, featureId: featureId, featureName: feature?.name || '', testCases: testCases, fields: fields, jiraProjectKey: zephyrConn.jiraProjectKey, projectId: projectId, onExported: () => {
                        fetchTestCases(featureId);
                    } }))] }) }));
}
function PriorityBadge({ value }) {
    if (!value)
        return _jsx("span", { className: "text-[#C0C0BC] text-[10.5px]", children: "\u2014" });
    const colors = {
        'HIGH': 'bg-[#FEF2F2] text-[#DC2626]',
        'MEDIUM': 'bg-[#FFFBEB] text-[#B45309]',
        'LOW': 'bg-[#ECFDF5] text-[#059669]',
    };
    return (_jsx("span", { className: `inline-flex items-center gap-1 font-medium text-[10.5px] px-2 py-1 rounded-full ${colors[value] || 'bg-[#F0F0ED] text-[#666]'}`, children: value }));
}
function TypeBadge({ value }) {
    if (!value)
        return _jsx("span", { className: "text-[#C0C0BC] text-[10.5px]", children: "\u2014" });
    const colors = {
        'POSITIVE': 'bg-[#EFF6FF] text-[#2563EB]',
        'NEGATIVE': 'bg-[#FEF2F2] text-[#DC2626]',
        'EDGE_CASE': 'bg-[#EEEDFE] text-[#4F46E5]',
    };
    return (_jsx("span", { className: `inline-flex items-center gap-1 font-medium text-[10.5px] px-2 py-1 rounded-full ${colors[value] || 'bg-[#F0F0ED] text-[#666]'}`, children: value?.replace('_', ' ') }));
}
