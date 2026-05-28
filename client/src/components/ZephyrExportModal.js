import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
import { zephyrAPI } from '@/api/zephyr';
import { toast } from '@/store/toastStore';
export default function ZephyrExportModal({ open, onClose, projectId, featureId, featureName, testCases, fields, jiraProjectKey, onExported, }) {
    const [currentTab, setCurrentTab] = useState('all');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const [exportResults, setExportResults] = useState(new Map());
    const [exportComplete, setExportComplete] = useState(false);
    const [folders, setFolders] = useState([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [selectedParentFolderId, setSelectedParentFolderId] = useState(null);
    useEffect(() => {
        if (!open || !projectId)
            return;
        setLoadingFolders(true);
        zephyrAPI
            .getProjectFolders(projectId)
            .then(f => setFolders(f))
            .catch(() => setFolders([]))
            .finally(() => setLoadingFolders(false));
    }, [open, projectId]);
    // Find the name field mapping key
    const nameField = useMemo(() => {
        const mapping = fields[0]?.key;
        return mapping || 'id';
    }, [fields]);
    // Filter test cases based on tab and selection
    const casesToShow = useMemo(() => {
        if (currentTab === 'all') {
            return testCases;
        }
        return testCases.filter(tc => selectedIds.has(tc.id));
    }, [currentTab, testCases, selectedIds]);
    // Count new (not yet exported) vs already exported
    const newCases = testCases.filter(tc => !tc.zephyrKey);
    const exportedCases = testCases.filter(tc => tc.zephyrKey);
    const newCountToExport = useMemo(() => {
        if (currentTab === 'all') {
            return newCases.length;
        }
        return Array.from(selectedIds).filter(id => {
            const tc = testCases.find(t => t.id === id);
            return tc && !tc.zephyrKey;
        }).length;
    }, [currentTab, selectedIds, testCases, newCases]);
    const selectedCountAll = useMemo(() => {
        return Array.from(selectedIds).filter(id => {
            const tc = testCases.find(t => t.id === id);
            return tc && !tc.zephyrKey;
        }).length;
    }, [selectedIds, testCases]);
    // Scroll test case list when exporting
    const [scrollIntoView, setScrollIntoView] = useState(null);
    const handleSelectAll = () => {
        const newIds = new Set(newCases.map(tc => tc.id));
        setSelectedIds(newIds);
    };
    const handleDeselectAll = () => {
        setSelectedIds(new Set());
    };
    const handleToggleTestCase = (testCaseId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(testCaseId)) {
                next.delete(testCaseId);
            }
            else {
                next.add(testCaseId);
            }
            return next;
        });
    };
    const handleExport = async () => {
        setIsExporting(true);
        setExportResults(new Map());
        setExportComplete(false);
        const casesToExport = currentTab === 'all'
            ? newCases.map(tc => tc.id)
            : Array.from(selectedIds);
        try {
            const result = await zephyrAPI.exportTestCases(featureId, casesToExport, selectedParentFolderId);
            const resultMap = new Map();
            result.results.forEach(r => {
                resultMap.set(r.testCaseId, {
                    status: r.success ? 'exported' : 'failed',
                    zephyrKey: r.zephyrKey || undefined,
                    error: r.error,
                });
            });
            setExportResults(resultMap);
            setExportComplete(true);
            if (result.failCount === 0) {
                // All succeeded — show toast then auto-close after 1.5 seconds
                const count = result.successCount;
                toast.success(count === 1
                    ? '1 test case exported to Zephyr Scale'
                    : `${count} test cases exported to Zephyr Scale`);
                setTimeout(() => {
                    onClose();
                    if (onExported)
                        onExported();
                }, 1500);
            }
            else if (result.successCount > 0) {
                // Partial — stay open so user can see failures
                toast.success(`${result.successCount} exported, ${result.failCount} failed — see details`);
            }
            else {
                // All failed — stay open
                toast.error('Export failed — see details below');
            }
        }
        catch (err) {
            const msg = err?.response?.data?.error?.message ||
                err.message ||
                'Export failed';
            toast.error(msg);
            setExportComplete(true);
        }
        finally {
            setIsExporting(false);
        }
    };
    if (!open)
        return null;
    function buildFolderOptions(folderList) {
        // Show only parent folders (parentId is null)
        return folderList
            .filter(f => !f.parentId)
            .map(f => ({ id: f.id, label: f.name }));
    }
    const successCount = Array.from(exportResults.values()).filter(r => r.status === 'exported').length;
    const failCount = Array.from(exportResults.values()).filter(r => r.status === 'failed').length;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center", children: _jsxs("div", { className: "bg-white rounded-lg shadow-lg max-w-[560px] w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "border-b border-[#EBEBEB]", children: [_jsxs("div", { className: "px-6 pt-5 pb-3 flex items-center justify-between", children: [_jsx("h2", { className: "text-[16px] font-semibold text-[#111]", children: "Export to Zephyr" }), !isExporting && (_jsx("button", { onClick: onClose, disabled: isExporting, className: "text-[#999] hover:text-[#333] text-[20px] leading-none", children: "\u00D7" }))] }), _jsxs("div", { className: "flex gap-0 px-6", children: [_jsxs("button", { onClick: () => {
                                        setCurrentTab('all');
                                        setExportResults(new Map());
                                        setExportComplete(false);
                                    }, disabled: isExporting || exportComplete, className: `px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${currentTab === 'all'
                                        ? 'border-[#4F46E5] text-[#4F46E5]'
                                        : 'border-transparent text-[#888] hover:text-[#333]'}`, children: ["Export All ", newCases.length > 0 && `(${newCases.length})`] }), _jsxs("button", { onClick: () => {
                                        setCurrentTab('selected');
                                        setExportResults(new Map());
                                        setExportComplete(false);
                                    }, disabled: isExporting || exportComplete, className: `px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${currentTab === 'selected'
                                        ? 'border-[#4F46E5] text-[#4F46E5]'
                                        : 'border-transparent text-[#888] hover:text-[#333]'}`, children: ["Export Selected (", selectedIds.size, ")"] })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-6 py-4 space-y-4", children: [!exportComplete && (_jsxs("div", { className: "text-[13px] text-[#666]", children: [currentTab === 'all' ? (_jsxs(_Fragment, { children: ["Export ", newCases.length, " test case", newCases.length !== 1 ? 's' : '', " from", ' ', _jsx("strong", { children: featureName }), " to Jira project", ' ', _jsx("strong", { children: jiraProjectKey })] })) : (_jsxs(_Fragment, { children: ["Export ", selectedCountAll, " test case", selectedCountAll !== 1 ? 's' : '', " from", ' ', _jsx("strong", { children: featureName }), " to Jira project", ' ', _jsx("strong", { children: jiraProjectKey })] })), exportedCases.length > 0 && (_jsxs("p", { className: "text-[12px] text-[#999] mt-2", children: [exportedCases.length, " test case", exportedCases.length !== 1 ? 's' : '', " already exported"] }))] })), exportComplete && (_jsx("div", { className: `p-3 rounded-lg border ${failCount === 0
                                ? 'bg-green-50 border-green-200'
                                : 'bg-amber-50 border-amber-200'}`, children: _jsx("p", { className: `text-[13px] font-medium ${failCount === 0
                                    ? 'text-green-700'
                                    : 'text-amber-700'}`, children: failCount === 0
                                    ? `✓ ${successCount} test case${successCount !== 1 ? 's' : ''} exported to Zephyr Scale`
                                    : `${successCount} exported, ${failCount} failed` }) })), !exportComplete && (_jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "text-[12px] font-medium text-[#333] block mb-1.5", children: ["Group under folder", _jsx("span", { className: "text-[#C0C0BC] font-normal ml-1.5", children: "optional" })] }), loadingFolders ? (_jsx("div", { className: "text-[12px] text-[#aaa] py-2", children: "Loading folders..." })) : (_jsxs("div", { className: "relative", children: [_jsxs("select", { value: selectedParentFolderId ?? '', onChange: e => setSelectedParentFolderId(e.target.value ? Number(e.target.value) : null), className: "w-full border border-[#D8D8D4] rounded-lg px-3 py-2 text-[13px] text-[#111] font-sans outline-none bg-white appearance-none cursor-pointer pr-8 focus:border-[#4F46E5]", children: [_jsx("option", { value: "", children: "\u2014 No parent folder (create at root) \u2014" }), buildFolderOptions(folders).map(opt => (_jsx("option", { value: opt.id, children: opt.label }, opt.id)))] }), _jsx("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none text-[12px]", children: "\u25BE" })] })), _jsx("div", { className: "mt-2 text-[11.5px] text-[#aaa] leading-relaxed", children: selectedParentFolderId ? (_jsxs(_Fragment, { children: ["Will create:", ' ', _jsx("span", { className: "font-mono text-[#4F46E5]", children: (() => {
                                                    const path = [];
                                                    let folderId = selectedParentFolderId;
                                                    while (folderId !== null) {
                                                        const folder = folders.find(f => f.id === folderId);
                                                        if (folder) {
                                                            path.unshift(folder.name);
                                                            folderId = folder.parentId;
                                                        }
                                                        else {
                                                            break;
                                                        }
                                                    }
                                                    return '/' + path.join(' / ') + ' / ' + featureName;
                                                })() })] })) : (_jsxs(_Fragment, { children: ["Will create:", ' ', _jsxs("span", { className: "font-mono text-[#4F46E5]", children: ["/", featureName] }), ' ', "at project root"] })) })] })), currentTab === 'selected' && !exportComplete && (_jsxs("div", { className: "flex gap-3 text-[12px]", children: [_jsx("button", { onClick: handleSelectAll, className: "text-[#4F46E5] hover:underline", children: "Select all" }), _jsx("button", { onClick: handleDeselectAll, className: "text-[#4F46E5] hover:underline", children: "Deselect all" })] })), _jsx("div", { className: "space-y-2 bg-[#FAFAF8] rounded-lg p-3 border border-[#EBEBEB]", children: casesToShow.length === 0 ? (_jsx("p", { className: "text-[12px] text-[#999] py-2", children: currentTab === 'all'
                                    ? 'All test cases already exported'
                                    : 'No test cases selected' })) : (casesToShow.map((tc, idx) => {
                                const isAlreadyExported = Boolean(tc.zephyrKey);
                                const exportResult = exportResults.get(tc.id);
                                const nameValue = String(tc.fieldValues[nameField] || `Test case ${idx + 1}`).substring(0, 60) || `Test case ${idx + 1}`;
                                return (_jsxs("div", { className: `flex items-start gap-3 p-2 rounded text-[12px] ${isAlreadyExported && !exportResult
                                        ? 'bg-white/40 opacity-60'
                                        : 'bg-white'}`, children: [currentTab === 'selected' && !exportComplete && (_jsx("input", { type: "checkbox", checked: isAlreadyExported
                                                ? true
                                                : selectedIds.has(tc.id), onChange: () => {
                                                if (!isAlreadyExported) {
                                                    handleToggleTestCase(tc.id);
                                                }
                                            }, disabled: isAlreadyExported, className: "w-4 h-4 mt-1 accent-[#4F46E5] cursor-pointer disabled:opacity-50" })), isExporting || exportComplete ? (_jsx("div", { className: "w-4 h-4 mt-1 flex items-center justify-center", children: exportResult?.status === 'pending' ? (_jsx("span", { className: "inline-block w-3 h-3 border-2 border-[#999] border-t-transparent rounded-full animate-spin" })) : exportResult?.status === 'exported' ? (_jsx("span", { className: "text-green-600 text-[14px]", children: "\u2713" })) : exportResult?.status === 'failed' ? (_jsx("span", { className: "text-red-600 text-[14px]", children: "\u2715" })) : isAlreadyExported ? (_jsx("span", { className: "text-green-600 text-[14px]", children: "\u2197" })) : null })) : null, _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-[#666] font-medium", children: ["TC-", (idx + 1).toString().padStart(2, '0')] }), _jsx("span", { className: "text-[#333] truncate", children: nameValue })] }), isAlreadyExported && !exportResult ? (_jsxs("div", { className: "text-[10px] text-green-700 mt-1 flex items-center gap-1", children: [_jsx("span", { children: "\u2197" }), _jsx("span", { className: "font-medium", children: tc.zephyrKey }), _jsx("span", { className: "text-[#999]", children: "Already in Zephyr" })] })) : exportResult?.status === 'exported' ? (_jsxs("div", { className: "text-[10px] text-green-700 mt-1 flex items-center gap-1", children: [_jsx("span", { children: "\u2197" }), _jsx("span", { className: "font-medium", children: exportResult.zephyrKey })] })) : exportResult?.status === 'failed' ? (_jsxs("div", { className: "text-[10px] text-red-700 mt-1 flex items-center gap-1", children: [_jsx("span", { children: "\u2715" }), _jsx("span", { className: "truncate", children: exportResult.error || 'Unknown error' })] })) : null] })] }, tc.id));
                            })) })] }), _jsxs("div", { className: "border-t border-[#EBEBEB] px-6 py-4 flex items-center justify-between gap-3", children: [_jsx("button", { onClick: onClose, disabled: isExporting, className: "flex-1 py-2.5 bg-white text-[#444] border border-[#D0D0CC] rounded-lg text-[13px] cursor-pointer font-sans hover:bg-[#FAFAF8] disabled:opacity-50 transition-colors", children: exportComplete ? 'Close' : 'Cancel' }), exportComplete && exportedCases.length > 0 ? (_jsx("a", { href: `https://${jiraProjectKey.toLowerCase()}.atlassian.net/projects/${jiraProjectKey}/board`, target: "_blank", rel: "noopener noreferrer", className: "flex-[1.5] py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg text-[13px] font-medium cursor-pointer font-sans transition-colors text-center", children: "View in Zephyr \u2192" })) : (_jsx("button", { onClick: handleExport, disabled: isExporting ||
                                (currentTab === 'all' ? newCases.length === 0 : selectedCountAll === 0) ||
                                exportComplete, className: "flex-[1.5] py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white border-none rounded-lg text-[13px] font-medium cursor-pointer font-sans transition-colors flex items-center justify-center gap-2", children: isExporting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Exporting..."] })) : (`Export ${currentTab === 'all' ? newCases.length : selectedCountAll} to Zephyr →`) }))] })] }) }));
}
