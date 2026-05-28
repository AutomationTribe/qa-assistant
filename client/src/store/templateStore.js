import { create } from 'zustand';
import { templatesAPI } from '@/api/templates';
export const useTemplateStore = create((set) => ({
    template: null,
    loading: false,
    error: null,
    fetchTemplate: async (projectId) => {
        set({ loading: true, error: null });
        try {
            const template = await templatesAPI.getTemplate(projectId);
            set({ template, loading: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch template';
            set({ error: message, loading: false });
        }
    },
    saveTemplate: async (projectId, fields) => {
        set({ loading: true, error: null });
        try {
            const template = await templatesAPI.createTemplate(projectId, fields);
            set({ template, loading: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save template';
            set({ error: message, loading: false });
            throw error;
        }
    },
    updateTemplate: async (projectId, fields) => {
        set({ loading: true, error: null });
        try {
            const template = await templatesAPI.updateTemplate(projectId, fields);
            set({ template, loading: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update template';
            set({ error: message, loading: false });
            throw error;
        }
    },
    addField: async (projectId, field) => {
        set({ loading: true, error: null });
        try {
            const template = await templatesAPI.addField(projectId, field);
            set({ template, loading: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add field';
            set({ error: message, loading: false });
            throw error;
        }
    },
    removeField: async (projectId, fieldId) => {
        set({ loading: true, error: null });
        try {
            const template = await templatesAPI.removeField(projectId, fieldId);
            set({ template, loading: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove field';
            set({ error: message, loading: false });
            throw error;
        }
    },
    reorderFields: async (projectId, fieldIds) => {
        set({ loading: true, error: null });
        try {
            const template = await templatesAPI.reorderFields(projectId, fieldIds);
            set({ template, loading: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reorder fields';
            set({ error: message, loading: false });
            throw error;
        }
    },
    setError: (error) => {
        set({ error });
    },
    reset: () => {
        set({ template: null, loading: false, error: null });
    },
}));
