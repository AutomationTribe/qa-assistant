import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useFeatureStore } from '@/store/featureStore';
import SlidePanel from '@/components/ui/SlidePanel';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
export default function EditFeatureModal({ feature, projectId, isOpen, onClose, }) {
    const [name, setName] = useState(feature?.name || '');
    const [type, setType] = useState(feature?.type || 'NEW_FEATURE');
    const [status, setStatus] = useState(feature?.status || 'FINAL');
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { updateFeature } = useFeatureStore();
    const handleUpdate = async () => {
        if (!feature)
            return;
        setError(null);
        if (name.trim().length < 2) {
            setError('Feature name must be at least 2 characters');
            return;
        }
        setIsSubmitting(true);
        try {
            await updateFeature(projectId, feature.id, {
                name: name.trim(),
                type,
                status,
            });
            onClose();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update feature';
            setError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleOpenChange = (open) => {
        if (!open) {
            setName(feature?.name || '');
            setType(feature?.type || 'NEW_FEATURE');
            setStatus(feature?.status || 'FINAL');
            setError(null);
            onClose();
        }
    };
    return (_jsx(SlidePanel, { open: isOpen, onClose: () => handleOpenChange(false), title: "Edit Feature", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", fullWidth: true, onClick: () => handleOpenChange(false), disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { fullWidth: true, loading: isSubmitting, onClick: handleUpdate, children: "Save Changes" })] }), children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Feature name", placeholder: "Feature name", value: name, onChange: (e) => setName(e.target.value), disabled: isSubmitting }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-xs font-medium text-[#333] block mb-3", children: "Type" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                                { value: 'NEW_FEATURE', label: 'New Feature' },
                                { value: 'BUG', label: 'Bug' },
                            ].map((option) => (_jsx("button", { onClick: () => setType(option.value), disabled: isSubmitting, className: `py-3 px-2 rounded-lg text-center text-xs font-medium transition border-2 ${type === option.value
                                    ? 'border-[#4F46E5] bg-[#EEEDF8] text-[#4F46E5]'
                                    : 'border-[#DDDDD9] text-[#999] hover:border-[#4F46E5]/30'} disabled:opacity-50`, children: option.label }, option.value))) })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-xs font-medium text-[#333] block mb-3", children: "Status" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                                { value: 'DRAFT', label: 'Draft' },
                                { value: 'FINAL', label: 'Final' },
                            ].map((option) => (_jsx("button", { onClick: () => setStatus(option.value), disabled: isSubmitting, className: `py-3 px-2 rounded-lg text-center text-xs font-medium transition border-2 ${status === option.value
                                    ? 'border-[#4F46E5] bg-[#EEEDF8] text-[#4F46E5]'
                                    : 'border-[#DDDDD9] text-[#999] hover:border-[#4F46E5]/30'} disabled:opacity-50`, children: option.label }, option.value))) })] }), error && (_jsx("div", { className: "bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs px-3 py-2 rounded-lg", children: error }))] }) }));
}
