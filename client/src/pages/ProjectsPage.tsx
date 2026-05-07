import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import Layout from '@/components/Layout'
import CreateProjectModal from '@/components/CreateProjectModal'
import Button from '@/components/ui/Button'

const STYLE_EMOJI: Record<string, string> = {
  bdd: '📋',
  step_by_step: '🔢',
  exploratory: '🔍',
}

const STYLE_LABELS: Record<string, string> = {
  bdd: 'BDD',
  step_by_step: 'Step by Step',
  exploratory: 'Exploratory',
}

const STYLE_COLORS: Record<string, { bg: string; text: string }> = {
  bdd: { bg: '#ECFDF5', text: '#059669' },
  step_by_step: { bg: '#FFFBEB', text: '#B45309' },
  exploratory: { bg: '#EEEDF8', text: '#4F46E5' },
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { projects, loading, error, fetchProjects, selectProject } = useProjectStore()

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
            const colors = STYLE_COLORS[style]
            return (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className="bg-white rounded-xl border border-[#EBEBEB] p-5 hover:shadow-md hover:border-[#4F46E5]/30 transition cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#EEEDF8] flex items-center justify-center text-lg flex-shrink-0">
                    {STYLE_EMOJI[style]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#111] truncate">{project.name}</h3>
                    <p className="text-[12px] text-[#999]">
                      {project._count?.tickets || 0} tickets · {project._count?.testCases || 0}{' '}
                      test cases
                    </p>
                  </div>
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

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Layout>
  )
}
