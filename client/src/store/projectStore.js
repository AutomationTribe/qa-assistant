import { create } from 'zustand';
import { getProjects, createProject as apiCreateProject } from '@/api/projects';
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create project';
            set({ error: message });
            throw error;
        }
    },
    selectProject: (project) => {
        set({ selectedProject: project });
    },
}));
