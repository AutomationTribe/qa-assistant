import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
export default function CreateProjectModal({ isOpen, onClose }) {
    const [name, setName] = useState('');
    const [style, setStyle] = useState('bdd');
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { createProject } = useProjectStore();
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
                templateConfig: { style },
            });
            setName('');
            setStyle('bdd');
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
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-8 w-full max-w-md", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "Create New Project" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Project Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g., Mobile App QA", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: isSubmitting })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-3", children: "Testing Style" }), _jsx("div", { className: "flex gap-3", children: [
                                        { value: 'bdd', label: 'BDD' },
                                        { value: 'step_by_step', label: 'Step by Step' },
                                        { value: 'exploratory', label: 'Exploratory' },
                                    ].map((option) => (_jsx("button", { onClick: () => setStyle(option.value), disabled: isSubmitting, className: `flex-1 py-2 px-3 rounded-lg font-medium transition ${style === option.value
                                            ? 'bg-blue-600 text-white border-2 border-blue-600'
                                            : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'} disabled:opacity-50`, children: option.label }, option.value))) })] }), error && _jsx("div", { className: "text-red-600 text-sm", children: error }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: onClose, disabled: isSubmitting, className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50", children: "Cancel" }), _jsx("button", { onClick: handleCreate, disabled: isSubmitting, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50", children: isSubmitting ? 'Creating...' : 'Create' })] })] })] }) }));
}
