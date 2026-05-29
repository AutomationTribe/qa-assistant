import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import CreateProjectModal from '@/components/CreateProjectModal'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { toast } from '@/store/toastStore'
import type { Project } from '@/types/api'

const STYLE_EMOJI: Record<string, string> = {
  waterfall: '↓',
  agile_scrum: '↻',
  agile_kanban: '≡',
}

const STYLE_LABELS: Record<string, string> = {
  waterfall: 'Waterfall',
  agile_scrum: 'Agile — Scrum',
  agile_kanban: 'Agile — Kanban',
}

const STYLE_COLORS: Record<string, { bg: string; text: string }> = {
  waterfall: { bg: '#EEEDFE', text: '#534AB7' },
  agile_scrum: { bg: '#EEEDFE', text: '#534AB7' },
  agile_kanban: { bg: '#EEEDFE', text: '#534AB7' },
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { projects, loading, error, fetchProjects, selectProject, deleteProject } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleProjectClick = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      selectProject(project)
      navigate(`/projects/${projectId}/features`)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    setProjectToDelete(project)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return
    setIsDeleting(true)
    try {
      await deleteProject(projectToDelete.id)
      setDeleteConfirmOpen(false)
      setProjectToDelete(null)
      toast.success(`Project "${projectToDelete.name}" deleted`)
    } catch {
      toast.error('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
    setProjectToDelete(null)
  }

  const topbarAction = <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>

  return (
    <Layout title="Projects" actions={topbarAction}>
      {error && (
        <div className="bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-[#F5F5F2] rounded-xl animate-pulse border border-[#EBEBEB]"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📁</div>
          <p className="text-[15px] font-medium text-[#111] mb-2">No projects yet</p>
          <p className="text-[13px] text-[#999] mb-6">Create your first project to get started</p>
          <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {projects.map((project) => {
            const style = project.templateConfig.style
            const colors = STYLE_COLORS[style] || { bg: '#EEEDFE', text: '#534AB7' }
            return (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="bg-white rounded-xl border border-[#EBEBEB] p-5 hover:shadow-md hover:border-[#4F46E5]/30 transition cursor-pointer group relative"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#EEEDF8] flex items-center justify-center text-lg flex-shrink-0">
                    {STYLE_EMOJI[style]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#111] truncate">{project.name}</h3>
                    <p className="text-[12px] text-[#999]">
                      {project._count?.tickets || 0} tickets · {project._count?.features || 0}{' '}
                      features
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, project)}
                    className="flex-shrink-0 w-6 h-6 rounded opacity-0 group-hover:opacity-100 hover:bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center transition-opacity text-[14px]"
                    title="Delete project"
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <span
                    className="inline-block text-[10.5px] font-medium px-3 py-1 rounded-full"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {STYLE_LABELS[style]}
                  </span>
                </div>
              </div>
            )
          })}

          {/* New Project Card */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white rounded-xl border-2 border-dashed border-[#DDDDD9] p-5 hover:border-[#4F46E5]/50 hover:bg-[#FAFAF8] transition flex items-center justify-center cursor-pointer"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">＋</div>
              <p className="text-[12px] font-medium text-[#999]">New Project</p>
            </div>
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete project?"
        description={`Are you sure you want to delete "${projectToDelete?.name}"? All associated features and test cases will also be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDestructive
      />

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Layout>
  )
}
