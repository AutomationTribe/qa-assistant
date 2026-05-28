import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AddFeaturePanel from '@/components/AddFeaturePanel';
import EditFeatureModal from '@/components/EditFeatureModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ZephyrSetupPanel from '@/components/ZephyrSetupPanel';
import { useProjectStore } from '@/store/projectStore';
import { useFeatureStore } from '@/store/featureStore';
import { toast } from '@/store/toastStore';
import { zephyrAPI } from '@/api/zephyr';
import { templatesAPI } from '@/api/templates';
export default function FeaturesPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [sortDesc, setSortDesc] = useState(true);
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [featureToDelete, setFeatureToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [zephyrConn, setZephyrConn] = useState(null);
    const [zephyrSetupOpen, setZephyrSetupOpen] = useState(false);
    const [templateFields, setTemplateFields] = useState([]);
    const { projects, fetchProjects } = useProjectStore();
    const { features, loading, error: featuresError, fetchFeatures, deleteFeature } = useFeatureStore();
    const project = projects.find(p => p.id === projectId);
    useEffect(() => {
        if (projects.length === 0) {
            fetchProjects();
        }
    }, [fetchProjects, projects.length]);
    useEffect(() => {
        if (!projectId)
            return;
        console.log('Fetching features for project:', projectId);
        fetchFeatures(projectId, {
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            status: activeTab === 'draft' ? 'DRAFT' : undefined,
        });
    }, [projectId, search, dateFrom, dateTo, activeTab, fetchFeatures]);
    // Fetch Zephyr connection and template fields on mount
    useEffect(() => {
        console.log('Features updated:', features.length, features);
    }, [features]);
    useEffect(() => {
        if (!projectId)
            return;
        Promise.all([
            zephyrAPI.getConnection(projectId),
            templatesAPI.getTemplate(projectId)
        ]).then(([conn, template]) => {
            if (conn)
                setZephyrConn(conn);
            if (template?.fields && template.fields.length > 0) {
                setTemplateFields(template.fields);
            }
        }).catch(() => { });
    }, [projectId]);
    const sorted = useMemo(() => {
        const list = [...features];
        list.sort((a, b) => {
            if (sortBy === 'date') {
                const aDate = new Date(a.createdAt).getTime();
                const bDate = new Date(b.createdAt).getTime();
                return sortDesc ? bDate - aDate : aDate - bDate;
            }
            else if (sortBy === 'testCases') {
                const aCount = a._count?.testCases || 0;
                const bCount = b._count?.testCases || 0;
                return sortDesc ? bCount - aCount : aCount - bCount;
            }
            return 0;
        });
        return list;
    }, [features, sortBy, sortDesc]);
    const isEmpty = features.length === 0;
    const isSearchEmpty = sorted.length === 0 && (search || dateFrom || dateTo);
    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortDesc(!sortDesc);
        }
        else {
            setSortBy(field);
            setSortDesc(true);
        }
    };
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const clearFilters = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
    };
    const handleEditClick = (feature) => {
        setEditingFeature(feature);
        setEditModalOpen(true);
    };
    const handleDeleteClick = (feature) => {
        setFeatureToDelete(feature);
        setDeleteDialogOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (!featureToDelete)
            return;
        setIsDeleting(true);
        try {
            await deleteFeature(projectId, featureToDelete.id);
            setDeleteDialogOpen(false);
            setFeatureToDelete(null);
        }
        catch (err) {
            console.error('Failed to delete feature:', err);
        }
        finally {
            setIsDeleting(false);
        }
    };
    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setFeatureToDelete(null);
    };
    const handleFeatureCreated = (feature, generateAI) => {
        setPanelOpen(false);
        if (generateAI) {
            navigate(`/projects/${projectId}/features/${feature.id}/testcases?generate=true`);
        }
        else {
            toast.success(`Feature added — "${feature.name}"`);
            fetchFeatures(projectId);
        }
    };
    const draftCount = features.filter(f => f.status === 'DRAFT').length;
    const allCount = features.length;
    const actions = (_jsxs("div", { className: "flex items-center gap-3", children: [zephyrConn ? (_jsx("button", { onClick: () => setZephyrSetupOpen(true), className: "flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 h-[36px] text-[12.5px] font-medium cursor-pointer hover:bg-green-100 transition-colors", children: "\u2713 Zephyr Connected" })) : (_jsx("button", { onClick: () => setZephyrSetupOpen(true), className: "flex items-center gap-2 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-4 h-[36px] text-[12.5px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors", children: "\u2699 Connect Zephyr" })), _jsx("button", { onClick: () => navigate(`/projects/${projectId}/template`), className: "flex items-center gap-2 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-4 h-[36px] text-[12.5px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors", children: "\u2699\uFE0F Template" })] }));
    return (_jsxs(Layout, { title: "Features", actions: actions, children: [_jsxs("div", { className: "mb-6 text-sm", children: [_jsx("button", { onClick: () => navigate('/projects'), className: "text-[#4F46E5] hover:text-[#3730A3] font-medium transition-colors", children: "Projects" }), _jsx("span", { className: "mx-2 text-[#D0D0CC]", children: "\u203A" }), _jsx("span", { className: "text-[#111] font-medium", children: project?.name || 'Project' }), _jsx("span", { className: "mx-2 text-[#D0D0CC]", children: "\u203A" }), _jsx("span", { className: "text-[#111] font-medium", children: "Features" })] }), featuresError && (_jsx("div", { className: "mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600", children: featuresError })), !isEmpty && (_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsxs("div", { className: "relative flex-1 max-w-xs", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa] text-[13px]", children: "\uD83D\uDD0D" }), _jsx("input", { type: "text", placeholder: "Search features...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full h-[34px] border border-[#D8D8D4] rounded-lg pl-8 pr-3 text-[12.5px] text-[#111] font-sans outline-none bg-white focus:border-[#4F46E5]" })] }), _jsx("span", { className: "text-[12px] text-[#999]", children: "From" }), _jsx("input", { type: "date", value: dateFrom, onChange: (e) => setDateFrom(e.target.value), className: "h-[34px] border border-[#D8D8D4] rounded-lg px-3 text-[12px] text-[#555] font-sans outline-none bg-white cursor-pointer" }), _jsx("span", { className: "text-[12px] text-[#999]", children: "To" }), _jsx("input", { type: "date", value: dateTo, onChange: (e) => setDateTo(e.target.value), className: "h-[34px] border border-[#D8D8D4] rounded-lg px-3 text-[12px] text-[#555] font-sans outline-none bg-white cursor-pointer" }), activeTab === 'all' && (_jsx("button", { onClick: () => setPanelOpen(true), className: "ml-auto flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-4 h-[34px] text-[12.5px] font-medium cursor-pointer font-sans whitespace-nowrap transition-colors", children: "\uFF0B Add Feature" }))] })), !isEmpty && (_jsxs("div", { className: "flex border-b border-[#EBEBEB] mb-6 -mx-6 px-6", children: [_jsxs("button", { onClick: () => setActiveTab('all'), className: `py-2 px-4 text-sm font-medium border-b-2 -mb-px transition ${activeTab === 'all'
                            ? 'text-[#4F46E5] border-[#4F46E5]'
                            : 'text-[#aaa] border-transparent hover:text-[#666]'}`, children: ["All ", _jsxs("span", { className: "ml-2 inline-block", children: ["(", allCount, ")"] })] }), _jsxs("button", { onClick: () => setActiveTab('draft'), className: `py-2 px-4 text-sm font-medium border-b-2 -mb-px transition ${activeTab === 'draft'
                            ? 'text-[#4F46E5] border-[#4F46E5]'
                            : 'text-[#aaa] border-transparent hover:text-[#666]'}`, children: ["Draft ", _jsxs("span", { className: "ml-2 inline-block", children: ["(", draftCount, ")"] })] })] })), loading && (_jsx("div", { className: "bg-white border border-[#EBEBEB] rounded-xl overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-[#FAFAF8] border-b border-[#EBEBEB]", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Feature Name" }), _jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Type" }), _jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Date" }), _jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Test Cases" }), activeTab === 'all' && _jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Status" }), _jsx("th", { className: "w-20" })] }) }), _jsx("tbody", { children: [1, 2, 3].map((i) => (_jsxs("tr", { className: "border-b border-[#F2F2EF] hover:bg-[#FAFAF9]", children: [_jsx("td", { className: "p-4", children: _jsx("div", { className: "h-3 bg-gradient-to-r from-[#F0F0ED] via-[#E8E8E5] to-[#F0F0ED] rounded w-2/3 animate-pulse" }) }), _jsx("td", { className: "p-4", children: _jsx("div", { className: "h-3 bg-gradient-to-r from-[#F0F0ED] via-[#E8E8E5] to-[#F0F0ED] rounded w-20 animate-pulse" }) }), _jsx("td", { className: "p-4", children: _jsx("div", { className: "h-3 bg-gradient-to-r from-[#F0F0ED] via-[#E8E8E5] to-[#F0F0ED] rounded w-24 animate-pulse" }) }), _jsx("td", { className: "p-4", children: _jsx("div", { className: "h-3 bg-gradient-to-r from-[#F0F0ED] via-[#E8E8E5] to-[#F0F0ED] rounded w-6 animate-pulse" }) }), activeTab === 'all' && (_jsx("td", { className: "p-4", children: _jsx("div", { className: "h-3 bg-gradient-to-r from-[#F0F0ED] via-[#E8E8E5] to-[#F0F0ED] rounded w-16 animate-pulse" }) }))] }, i))) })] }) })), !loading && isEmpty && (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl mb-4", children: "\uD83D\uDCCB" }), _jsx("h3", { className: "text-lg font-semibold text-[#111] mb-2", children: "No features yet" }), _jsx("p", { className: "text-sm text-[#999] mb-6", children: "Add a user story or bug title to start writing test cases for this project." }), _jsx("button", { onClick: () => setPanelOpen(true), className: "px-6 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#4338CA]", children: "\uFF0B Add your first feature" })] }) })), !loading && isSearchEmpty && (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl mb-4", children: "\uD83D\uDD0D" }), _jsx("h3", { className: "text-lg font-semibold text-[#111] mb-2", children: "No features match your search" }), _jsx("p", { className: "text-sm text-[#999] mb-6", children: "Try a different name or adjust the date range." }), _jsx("button", { onClick: clearFilters, className: "text-sm font-medium text-[#4F46E5] hover:text-[#4338CA]", children: "Clear filters" })] }) })), !loading && !isEmpty && !isSearchEmpty && (_jsx("div", { className: "bg-white border border-[#EBEBEB] rounded-xl overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-[#FAFAF8] border-b border-[#EBEBEB]", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Feature Name" }), _jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Type" }), _jsxs("th", { onClick: () => toggleSort('date'), className: "text-left text-xs font-semibold text-[#888] p-4 uppercase cursor-pointer hover:text-[#555]", children: ["Date ", sortBy === 'date' && _jsx("span", { className: "ml-1", children: sortDesc ? '↓' : '↑' })] }), _jsxs("th", { onClick: () => toggleSort('testCases'), className: "text-left text-xs font-semibold text-[#888] p-4 uppercase cursor-pointer hover:text-[#555]", children: ["Test Cases ", sortBy === 'testCases' && _jsx("span", { className: "ml-1", children: sortDesc ? '↓' : '↑' })] }), activeTab === 'all' && _jsx("th", { className: "text-left text-xs font-semibold text-[#888] p-4 uppercase", children: "Status" }), _jsx("th", { className: "w-[80px] text-right pr-4 text-xs font-semibold text-[#888] uppercase", children: "Actions" })] }) }), _jsx("tbody", { children: sorted.map((feature) => (_jsxs("tr", { onClick: () => navigate(`/projects/${projectId}/features/${feature.id}/testcases`), className: "border-b border-[#F2F2EF] hover:bg-[#FAFAF9] cursor-pointer", children: [_jsxs("td", { className: "p-4", children: [_jsx("div", { className: "text-sm font-medium text-[#111]", children: feature.name }), _jsxs("div", { className: "text-xs text-[#C0C0BC] font-mono mt-1", children: ["FT-", feature.id.slice(0, 3).toUpperCase()] })] }), _jsx("td", { className: "p-4", children: _jsxs("span", { className: `inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${feature.type === 'NEW_FEATURE'
                                                ? 'bg-[#EFF6FF] text-[#2563EB]'
                                                : feature.type === 'BACKEND_API'
                                                    ? 'bg-[#F0FDF4] text-[#166534]'
                                                    : 'bg-[#FEF2F2] text-[#DC2626]'}`, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${feature.type === 'NEW_FEATURE'
                                                        ? 'bg-[#2563EB]'
                                                        : feature.type === 'BACKEND_API'
                                                            ? 'bg-[#166534]'
                                                            : 'bg-[#DC2626]'}` }), feature.type === 'NEW_FEATURE' ? 'New Feature' : feature.type === 'BACKEND_API' ? 'Backend API' : 'Bug'] }) }), _jsx("td", { className: "p-4 text-sm text-[#666]", children: formatDate(feature.createdAt) }), _jsx("td", { className: "p-4 text-sm font-medium text-[#111]", children: _jsx("span", { className: feature._count?.testCases === 0 ? 'text-[#C0C0BC]' : '', children: feature._count?.testCases || 0 }) }), activeTab === 'all' && (_jsx("td", { className: "p-4", children: _jsx("span", { className: `inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${feature.status === 'DRAFT'
                                                ? 'bg-[#FFFBEB] text-[#B45309]'
                                                : 'bg-[#ECFDF5] text-[#059669]'}`, children: feature.status === 'DRAFT' ? 'Draft' : 'Final' }) })), _jsx("td", { className: "p-4 text-right pr-4", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "flex items-center gap-1.5 justify-end", children: [(feature._count?.testCases || 0) === 0 && (_jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        navigate(`/projects/${projectId}/features/${feature.id}/testcases?generate=true`);
                                                    }, className: "inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-[#C4C2F4] bg-[#EEEDF8] text-[#4F46E5] cursor-pointer hover:bg-[#4F46E5] hover:text-white hover:border-[#4F46E5] transition-all h-[26px] font-sans whitespace-nowrap", children: "\u2726 Generate" })), _jsx("button", { onClick: () => handleEditClick(feature), className: "w-[26px] h-[26px] rounded-[6px] border border-[#E4E4E0] bg-white flex items-center justify-center cursor-pointer text-[11px] text-[#888] hover:bg-[#EEEDF8] hover:border-[#C4C2F4] hover:text-[#4F46E5] transition-all", title: "Edit", children: "\u270F" }), _jsx("button", { onClick: () => handleDeleteClick(feature), className: "w-[26px] h-[26px] rounded-[6px] border border-[#E4E4E0] bg-white flex items-center justify-center cursor-pointer text-[11px] text-[#888] hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#EF4444] transition-all", title: "Delete", children: "\uD83D\uDDD1" })] }) })] }, feature.id))) })] }) })), _jsx(AddFeaturePanel, { projectId: projectId, open: panelOpen, onClose: () => setPanelOpen(false), onCreated: handleFeatureCreated }), _jsx(EditFeatureModal, { feature: editingFeature, projectId: projectId, isOpen: editModalOpen, onClose: () => {
                    setEditModalOpen(false);
                    setEditingFeature(null);
                } }), _jsx(ConfirmDialog, { open: deleteDialogOpen, title: "Delete Feature?", description: `Are you sure you want to delete "${featureToDelete?.name}"? This action cannot be undone.`, cancelLabel: "Cancel", confirmLabel: "Delete", isDestructive: true, loading: isDeleting, onCancel: handleCancelDelete, onConfirm: handleConfirmDelete }), _jsx(ZephyrSetupPanel, { open: zephyrSetupOpen, onClose: () => setZephyrSetupOpen(false), projectId: projectId, templateFields: templateFields, onConnected: (conn) => {
                    const wasConnected = !!zephyrConn;
                    setZephyrConn(conn);
                    setZephyrSetupOpen(false);
                    toast.success(wasConnected ? 'Zephyr Scale updated' : 'Zephyr Scale connected');
                }, isEdit: !!zephyrConn, currentConnection: zephyrConn })] }));
}
