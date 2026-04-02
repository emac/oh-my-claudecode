/**
 * 左栏：项目列表组件
 * 支持收缩模式：宽度 < 80px 时只显示项目名首字母缩写（最多3个字符）
 * @author Alfie
 */

import type { ProjectInfo } from '../../../main/projectDiscovery'

interface Props {
  projects: ProjectInfo[]
  selectedProject: ProjectInfo | null
  onSelect: (project: ProjectInfo) => void
  /** 当前栏位宽度（px） */
  width: number
  /** 是否处于收缩模式 */
  collapsed: boolean
}

/** 从完整路径提取项目名称 */
function getProjectName(realPath: string): string {
  const parts = realPath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || realPath
}

/**
 * 取项目名的首字母缩写，最多3个字符。
 * 规则：按单词（驼峰、连字符、下划线、空格分割）取首字母，最多取3个，转大写。
 * 不足1个单词则取项目名前3个字符。
 */
function getInitials(name: string): string {
  const words = name.split(/[-_\s]+|(?=[A-Z])/).filter(Boolean)
  if (words.length >= 2) {
    return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase()
  }
  return name.slice(0, 3).toUpperCase()
}

export default function ProjectList({ projects, selectedProject, onSelect, width, collapsed }: Props): JSX.Element {
  return (
    <div style={{
      width: `${width}px`,
      minWidth: `${width}px`,
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0s' // 拖拽时不需要 transition
    }}>
      {/* 头部 */}
      {!collapsed && (
        <div style={{
          padding: '14px 14px 10px',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          Projects
        </div>
      )}

      {/* 项目列表 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {projects.length === 0 ? (
          !collapsed && (
            <div style={{
              padding: '20px 14px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              lineHeight: '1.6'
            }}>
              No projects found.
            </div>
          )
        ) : (
          projects.map((project) => {
            const isSelected = selectedProject?.encodedName === project.encodedName
            const name = getProjectName(project.realPath)

            return collapsed ? (
              /* ── 收缩模式：显示首字母缩写 ── */
              <div
                key={project.encodedName}
                onClick={() => onSelect(project)}
                title={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '40px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-selected)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {getInitials(name)}
              </div>
            ) : (
              /* ── 正常模式 ── */
              <div
                key={project.encodedName}
                onClick={() => onSelect(project)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-selected)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {/* 项目名 + session 数 */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '2px'
                  }}>
                    {project.sessionCount} {project.sessionCount === 1 ? 'session' : 'sessions'}
                  </div>
                </div>

                {/* 打开文件夹按钮 */}
                <button
                  title="Open folder"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.electronAPI.openFolder(project.realPath)
                  }}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    lineHeight: 1,
                    borderRadius: '4px',
                    opacity: 0.6,
                    transition: 'opacity 0.1s, color 0.1s'
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement
                    btn.style.opacity = '1'
                    btn.style.color = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement
                    btn.style.opacity = '0.6'
                    btn.style.color = 'var(--text-muted)'
                  }}
                >
                  📁
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
