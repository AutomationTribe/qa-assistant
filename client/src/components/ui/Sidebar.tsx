interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  projectName: string
  featureName: string
}

export default function Sidebar({ collapsed, onToggle, projectName, featureName }: SidebarProps) {
  return (
    <div className={`${collapsed ? 'w-[48px]' : 'w-[208px]'} bg-[#FAFAF8] border-r border-[#EBEBEB] flex flex-col transition-all duration-200`}>
      {/* Header */}
      <div className={`border-b border-[#EBEBEB] p-4 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && (
          <div>
            <div className="text-[11px] font-semibold uppercase text-[#999] mb-1">Project</div>
            <div className="text-[12px] font-medium text-[#111] truncate">{projectName}</div>
            <div className="text-[11px] font-semibold uppercase text-[#999] mt-3 mb-1">Feature</div>
            <div className="text-[12px] font-medium text-[#111] truncate">{featureName}</div>
          </div>
        )}
        {collapsed && (
          <div className="text-[20px]">📋</div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Toggle Button */}
      <div className="border-t border-[#EBEBEB] p-3 flex justify-center">
        <button
          onClick={onToggle}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-lg border border-[#D8D8D4] bg-white hover:bg-[#FAFAF8] text-[#666] transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className={`text-[14px] transition-transform ${collapsed ? 'rotate-180' : ''}`}>◀</span>
        </button>
      </div>
    </div>
  )
}
