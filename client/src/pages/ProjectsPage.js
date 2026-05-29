import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/projectStore';
import Layout from '@/components/Layout';
import CreateProjectModal from '@/components/CreateProjectModal';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/store/toastStore';
const STYLE_CONFIG = {
    waterfall: { emoji: '↓', label: 'Waterfall', bg: '#E6F1FB', text: '#0C447C' },
    agile_scrum: { emoji: '↻', label: 'Agile — Scrum', bg: '#EEEDFE', text: '#3C3489' },
    agile_kanban: { emoji: '≡', label: 'Agile — Kanban', bg: '#EAF3DE', text: '#27500A' },
    step_by_step: { emoji: '✓', label: 'Step by step', bg: '#EEEDFE', text: '#3C3489' },
    bdd: { emoji: '🧪', label: 'BDD', bg: '#EEEDFE', text: '#3C3489' },
    exploratory: { emoji: '🔍', label: 'Exploratory', bg: '#EEEDFE', text: '#3C3489' },
};
const getStyleConfig = (style) => {
    return STYLE_CONFIG[style] ?? {
        emoji: '•',
        label: style || 'Not set',
        bg: '#F4F4F2',
        text: '#666',
    };
};
export default function ProjectsPage() {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { projects, loading, error, fetchProjects, selectProject, deleteProject } = useProjectStore();
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    const handleProjectClick = (projectId) => {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
            selectProject(project);
            navigate(`/projects/${projectId}/features`);
        }
    };
    const handleDeleteClick = (e, project) => {
        e.stopPropagation();
        setProjectToDelete(project);
        setDeleteConfirmOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (!projectToDelete)
            return;
        setIsDeleting(true);
        try {
            await deleteProject(projectToDelete.id);
            setDeleteConfirmOpen(false);
            setProjectToDelete(null);
            toast.success(`Project "${projectToDelete.name}" deleted`);
        }
        catch {
            toast.error('Failed to delete project');
        }
        finally {
            setIsDeleting(false);
        }
    };
    const handleCancelDelete = () => {
        setDeleteConfirmOpen(false);
        setProjectToDelete(null);
    };
    const topbarAction = _jsx(Button, { onClick: () => setIsModalOpen(true), children: "+ New Project" });
    return (_jsxs(Layout, { title: "Projects", actions: topbarAction, children: [error && (_jsx("div", { className: "bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] px-4 py-3 rounded-lg mb-6 text-sm", children: error })), loading ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5", children: [...Array(6)].map((_, i) => (_jsx("div", { className: "h-40 bg-[#F5F5F2] rounded-xl animate-pulse border border-[#EBEBEB]" }, i))) })) : projects.length === 0 ? (_jsxs("div", { className: "text-center py-16", children: [_jsx("div", { className: "text-5xl mb-4", children: "\uD83D\uDCC1" }), _jsx("p", { className: "text-[15px] font-medium text-[#111] mb-2", children: "No projects yet" }), _jsx("p", { className: "text-[13px] text-[#999] mb-6", children: "Create your first project to get started" }), _jsx(Button, { onClick: () => setIsModalOpen(true), children: "+ New Project" })] })) : (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5", children: [projects.map((project) => {
                        const style = project.templateConfig?.style;
                        const config = getStyleConfig(style);
                        return (_jsxs("div", { onClick: () => handleProjectClick(project.id), className: "bg-white rounded-xl border border-[#EBEBEB] p-5 hover:shadow-md hover:border-[#4F46E5]/30 transition cursor-pointer group relative", children: [_jsxs("div", { className: "flex items-start gap-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-[#EEEDF8] flex items-center justify-center text-lg flex-shrink-0", children: config.emoji }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "text-sm font-medium text-[#111] truncate", children: project.name }), _jsxs("p", { className: "text-[12px] text-[#999]", children: [project._count?.tickets || 0, " tickets \u00B7 ", project._count?.features || 0, ' ', "features"] })] }), _jsx("button", { onClick: (e) => handleDeleteClick(e, project), className: "flex-shrink-0 w-6 h-6 rounded opacity-0 group-hover:opacity-100 hover:bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center transition-opacity text-[14px]", title: "Delete project", children: "\u2715" })] }), _jsx("div", { children: _jsx("span", { className: "inline-block text-[10.5px] font-medium px-3 py-1 rounded-full", style: { backgroundColor: config.bg, color: config.text }, children: config.label }) })] }, project.id));
                    }), _jsx("button", { onClick: () => setIsModalOpen(true), className: "bg-white rounded-xl border-2 border-dashed border-[#DDDDD9] p-5 hover:border-[#4F46E5]/50 hover:bg-[#FAFAF8] transition flex items-center justify-center cursor-pointer", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl mb-2", children: "\uFF0B" }), _jsx("p", { className: "text-[12px] font-medium text-[#999]", children: "New Project" })] }) })] })), _jsx(ConfirmDialog, { open: deleteConfirmOpen, title: "Delete project?", description: `Are you sure you want to delete "${projectToDelete?.name}"? All associated features and test cases will also be deleted. This cannot be undone.`, confirmLabel: "Delete", cancelLabel: "Cancel", loading: isDeleting, onConfirm: handleConfirmDelete, onCancel: handleCancelDelete, isDestructive: true }), _jsx(CreateProjectModal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false) })] }));
}
