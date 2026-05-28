import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authAPI } from '@/api/auth'

interface LayoutProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

export default function Layout({ title, actions, children }: LayoutProps) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  )

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem('sidebarCollapsed', String(next))
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // Even if the server call fails, clear local auth state
    } finally {
      sessionStorage.removeItem('regi_session')
      clearAuth()
      navigate('/login')
    }
  }

  const initials = user ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase() : 'U'
  const roleLabel = user?.role.replace(/_/g, ' ').toLowerCase() || 'User'

  const navItems = [
    { icon: '▣', label: 'Projects', path: '/projects', active: true },
    { icon: '🎫', label: 'Tickets', path: '/tickets', badge: 'soon' },
    { icon: '✓', label: 'Test Cases', path: '/testcases', badge: 'soon' },
    { icon: '↗', label: 'Export', path: '/export', badge: 'soon' },
    { icon: '⚙', label: 'Settings', path: '/settings', badge: 'soon' },
  ]

  return (
    <div className="flex h-screen bg-[#F0F0ED]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarCollapsed ? 'w-[48px]' : 'w-[208px]'
        } bg-white border-r border-[#EBEBEB] flex flex-col transition-all duration-200`}
      >
        {/* Brand */}
        <div className={`${sidebarCollapsed ? 'px-2' : 'px-4'} py-6 flex items-center gap-2 justify-center`}>
          <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            R
          </div>
          {!sidebarCollapsed && <span className="text-[15px] font-semibold text-[#111]">Regi</span>}
        </div>

        {/* Nav Items */}
        <nav className={`flex-1 ${sidebarCollapsed ? 'px-1' : 'px-3'} space-y-1`}>
          {navItems.map((item) => (
            <div key={item.label} title={sidebarCollapsed ? item.label : undefined}>
              {item.active ? (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg text-sm transition ${
                      isActive
                        ? 'bg-[#EEEDF8] text-[#4F46E5] font-medium'
                        : 'text-[#777] hover:bg-[#EFEFEB] hover:text-[#111]'
                    }`
                  }
                >
                  <span className="w-4">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-medium text-[#999]">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ) : (
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg text-sm text-[#777] opacity-50 cursor-not-allowed`}>
                  <span className="w-4">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-medium text-[#999]">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        {user && (
          <div className="mt-auto border-t border-[#EBEBEB] pt-3 pb-2">
            {!sidebarCollapsed && (
              <>
                <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                  <div className="w-7 h-7 rounded-full bg-[#4F46E5] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                    {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[#111] truncate">{user?.name}</div>
                    <div className="text-[10px] text-[#aaa]">{user?.role?.replace(/_/g, ' ')}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-[#777] hover:bg-[#EFEFEB] hover:text-[#111] transition-all cursor-pointer"
                >
                  <span className="text-[13px] w-4 text-center">→</span>
                  Sign out
                </button>
              </>
            )}
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2 px-2'} py-2 rounded-lg text-[12.5px] text-[#777] hover:bg-[#EFEFEB] hover:text-[#111] transition-all cursor-pointer`}
            >
              <span className={`text-[13px] transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}>
                ◀
              </span>
              {!sidebarCollapsed && 'Collapse'}
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-14 bg-white border-b border-[#EBEBEB] flex items-center justify-between px-6">
          <h1 className="text-[15px] font-semibold text-[#111]">{title}</h1>
          <div className="flex items-center gap-3">{actions}</div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  )
}
