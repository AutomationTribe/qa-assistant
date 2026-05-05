import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface LayoutProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

export default function Layout({ title, actions, children }: LayoutProps) {
  const { user } = useAuthStore()

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
      <div className="w-52 bg-white border-r border-[#EBEBEB] flex flex-col">
        {/* Brand */}
        <div className="px-4 py-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <span className="text-[15px] font-semibold text-[#111]">Regi</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.active ? (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      isActive
                        ? 'bg-[#EEEDF8] text-[#4F46E5] font-medium'
                        : 'text-[#777] hover:bg-[#EFEFEB] hover:text-[#111]'
                    }`
                  }
                >
                  <span className="w-4">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-medium text-[#999]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#777] opacity-50 cursor-not-allowed">
                  <span className="w-4">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-medium text-[#999]">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        {user && (
          <div className="px-4 py-6 border-t border-[#EBEBEB] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EEEDF8] flex items-center justify-center text-[#4F46E5] text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#111] truncate">{user.name}</p>
              <p className="text-[11px] text-[#999] truncate capitalize">{roleLabel}</p>
            </div>
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
