import { create } from 'zustand';
import { getProjects, createProject as apiCreateProject, deleteProject as apiDeleteProject } from '@/api/projects';
export const useProjectStore = create((set) => ({
    projects: [],
    selectedProject: null,
    loading: false,
    error: null,
    fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
            const projects = await getProjects();
            set({ projects, loading: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch projects';
            set({ error: message, loading: false });
        }
    },
    createProject: async (data) => {
        try {
            const project = await apiCreateProject(data);
            set((state) => ({ projects: [project, ...state.projects] }));
            return project;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create project';
            set({ error: message });
            throw error;
        }
    },
    deleteProject: async (id) => {
        try {
            await apiDeleteProject(id);
            set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete project';
            set({ error: message });
            throw error;
        }
    },
    selectProject: (project) => {
        set({ selectedProject: project });
    },
}));
