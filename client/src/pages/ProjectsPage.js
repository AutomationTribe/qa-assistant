import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/projectStore';
import CreateProjectModal from '@/components/CreateProjectModal';
const STYLE_LABELS = {
    bdd: 'BDD',
    step_by_step: 'Step by Step',
    exploratory: 'Exploratory',
};
export default function ProjectsPage() {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { projects, loading, error, fetchProjects, selectProject } = useProjectStore();
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    const handleProjectClick = (projectId) => {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
            selectProject(project);
            navigate('/generate');
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs("div", { className: "max-w-6xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsx("h1", { className: "text-3xl font-bold", children: "Projects" }), _jsx("button", { onClick: () => setIsModalOpen(true), className: "bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition", children: "New Project" })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6", children: error })), loading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("p", { className: "text-gray-500", children: "Loading projects..." }) })) : projects.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-gray-500 mb-4", children: "No projects yet. Create your first one." }), _jsx("button", { onClick: () => setIsModalOpen(true), className: "bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition", children: "Create Project" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: projects.map((project) => (_jsxs("div", { onClick: () => handleProjectClick(project.id), className: "bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition cursor-pointer", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: project.name }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full", children: STYLE_LABELS[project.templateConfig.style] }), _jsxs("span", { className: "text-gray-600 text-sm", children: [project._count?.tickets || 0, " tickets"] })] })] }, project.id))) }))] }), _jsx(CreateProjectModal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false) })] }));
}
