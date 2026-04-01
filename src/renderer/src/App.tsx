/**
 * 主应用组件：三栏可拖拽布局 + 主题切换 + 状态管理
 * @author Alfie
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import ProjectList from './components/ProjectList'
import SessionList from './components/SessionList'
import SessionDetail from './components/SessionDetail'
import type { ProjectInfo } from '../../main/projectDiscovery'
import type { SessionMetadata } from '../../main/types'

/** 初始栏位宽度（px）*/
const INIT_PROJECTS_WIDTH = 200
const INIT_SESSIONS_WIDTH = 320
const MIN_PROJECTS_WIDTH = 48
const MIN_SESSIONS_WIDTH = 60
const MIN_CHAT_WIDTH = 200

/** 收缩阈值：低于此值视为已收缩 */
const PROJECTS_COLLAPSE_WIDTH = 80
const SESSIONS_COLLAPSE_WIDTH = 100

// ── 分隔条组件 ─────────────────────────────────────────────

interface ResizeDividerProps {
  /** 左侧栏是否已收缩 */
  collapsed: boolean
  /** 拖拽开始 */
  onMouseDown: (e: React.MouseEvent) => void
  /** 点击分隔条切换收缩/展开 */
  onToggle: () => void
}

/**
 * 可拖拽 + 可点击的分隔条。
 * - 拖拽：按住拖动调整宽度
 * - 点击：直接切换收缩/展开（中央箭头始终可见，悬停高亮）
 * @author Alfie
 */
function ResizeDivider({ collapsed, onMouseDown, onToggle }: ResizeDividerProps): JSX.Element {
  const [hovered, setHovered] = useState(false)
  // 区分拖拽和点击：mousedown 时记录 X，mouseup 时位移 < 3px 才算点击
  const mouseDownX = useRef(0)

  const handleMouseDown = (e: React.MouseEvent): void => {
    mouseDownX.current = e.clientX
    onMouseDown(e)
  }

  const handleClick = (e: React.MouseEvent): void => {
    // 只有鼠标几乎没移动才视为点击（非拖拽）
    if (Math.abs(e.clientX - mouseDownX.current) < 3) {
      onToggle()
    }
  }

  return (
    <div
      style={{
        width: '8px',
        cursor: 'col-resize',
        background: hovered ? 'var(--accent)' : 'var(--border)',
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={collapsed ? 'Click to expand' : 'Click to collapse'}
    >
      {/* 箭头指示器（始终显示，悬停时更明显） */}
      <div style={{
        position: 'absolute',
        width: '14px',
        height: '24px',
        background: hovered ? 'var(--accent-hover)' : 'var(--border)',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 700,
        color: hovered ? '#fff' : 'var(--text-muted)',
        pointerEvents: 'none',
        transition: 'background 0.15s, color 0.15s'
      }}>
        {collapsed ? '›' : '‹'}
      </div>
    </div>
  )
}

// ── 主题切换按钮 ──────────────────────────────────────────

/**
 * 右上角主题切换按钮，在 Dark / Light 之间切换。
 * 通过操作 document.documentElement 的 data-theme 属性实现。
 * @author Alfie
 */
function ThemeToggle({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }): JSX.Element {
  return (
    <button
      onClick={onToggle}
      title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
      style={{
        position: 'fixed',
        top: '10px',
        right: '12px',
        zIndex: 100,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'background 0.15s, color 0.15s'
      }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget as HTMLButtonElement
        btn.style.background = 'var(--bg-hover)'
        btn.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget as HTMLButtonElement
        btn.style.background = 'var(--bg-tertiary)'
        btn.style.color = 'var(--text-secondary)'
      }}
    >
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  )
}

// ── 主应用 ─────────────────────────────────────────────────

export default function App(): JSX.Element {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null)
  const [sessions, setSessions] = useState<SessionMetadata[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  /** 当前搜索关键词，由 SessionList 上报，传入 SessionDetail 用于高亮和定位 */
  const [searchKeyword, setSearchKeyword] = useState('')

  // 主题：默认 dark
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // 栏位宽度状态
  const [projectsWidth, setProjectsWidth] = useState(INIT_PROJECTS_WIDTH)
  const [sessionsWidth, setSessionsWidth] = useState(INIT_SESSIONS_WIDTH)

  // 收缩前的宽度，展开时恢复
  const prevProjectsWidth = useRef(INIT_PROJECTS_WIDTH)
  const prevSessionsWidth = useRef(INIT_SESSIONS_WIDTH)

  // 拖拽状态 ref
  const dragging = useRef<null | 'divider1' | 'divider2'>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const projectsCollapsed = projectsWidth < PROJECTS_COLLAPSE_WIDTH
  const sessionsCollapsed = sessionsWidth < SESSIONS_COLLAPSE_WIDTH

  // ── 主题切换 ──────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '')
      return next
    })
  }, [])

  // 初始化 data-theme（dark 时不设置，CSS 默认即 dark）
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme')
  }, [])

  // ── 收缩/展开切换 ─────────────────────────────────────────
  const toggleProjects = useCallback(() => {
    if (projectsCollapsed) {
      setProjectsWidth(prevProjectsWidth.current > PROJECTS_COLLAPSE_WIDTH ? prevProjectsWidth.current : INIT_PROJECTS_WIDTH)
    } else {
      prevProjectsWidth.current = projectsWidth
      setProjectsWidth(MIN_PROJECTS_WIDTH)
    }
  }, [projectsCollapsed, projectsWidth])

  const toggleSessions = useCallback(() => {
    if (sessionsCollapsed) {
      setSessionsWidth(prevSessionsWidth.current > SESSIONS_COLLAPSE_WIDTH ? prevSessionsWidth.current : INIT_SESSIONS_WIDTH)
    } else {
      prevSessionsWidth.current = sessionsWidth
      setSessionsWidth(MIN_SESSIONS_WIDTH)
    }
  }, [sessionsCollapsed, sessionsWidth])

  // ── 拖拽逻辑 ──────────────────────────────────────────────
  const onDividerMouseDown = useCallback(
    (which: 'divider1' | 'divider2') =>
      (e: React.MouseEvent) => {
        e.preventDefault()
        dragging.current = which
        dragStartX.current = e.clientX
        dragStartWidth.current = which === 'divider1' ? projectsWidth : sessionsWidth
      },
    [projectsWidth, sessionsWidth]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!dragging.current) return
      const delta = e.clientX - dragStartX.current
      if (dragging.current === 'divider1') {
        setProjectsWidth(Math.max(MIN_PROJECTS_WIDTH, dragStartWidth.current + delta))
      } else {
        setSessionsWidth(Math.max(MIN_SESSIONS_WIDTH, dragStartWidth.current + delta))
      }
    }
    const onMouseUp = (): void => { dragging.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ── 数据加载 ──────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    try {
      const result = await window.electronAPI.getProjects()
      setProjects(result)
      if (result.length > 0 && !selectedProject) {
        setSelectedProject(result[0])
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedProject])

  useEffect(() => { loadProjects() }, [])

  const loadSessions = useCallback(async (project: ProjectInfo) => {
    try {
      const result = await window.electronAPI.getSessions(project.projectsDir, project.realPath)
      setSessions(result)
      await window.electronAPI.watchProject(project.projectsDir)
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setSessions([])
    }
  }, [])

  useEffect(() => {
    if (selectedProject) {
      setSelectedSession(null)
      loadSessions(selectedProject)
    }
  }, [selectedProject])

  useEffect(() => {
    const unsubscribe = window.electronAPI.onProjectUpdated(({ projectsDir }) => {
      if (selectedProject && selectedProject.projectsDir === projectsDir) {
        loadSessions(selectedProject)
      }
    })
    return unsubscribe
  }, [selectedProject, loadSessions])

  const handleProjectSelect = (project: ProjectInfo): void => setSelectedProject(project)
  const handleSessionSelect = (session: SessionMetadata): void => setSelectedSession(session)
  const handleResume = async (session: SessionMetadata): Promise<void> => {
    await window.electronAPI.launchResume(session.id, session.projectPath)
  }
  const handleNew = async (): Promise<void> => {
    if (selectedProject) {
      await window.electronAPI.launchNew(selectedProject.realPath)
    }
  }

  const handleDelete = async (session: SessionMetadata): Promise<void> => {
    if (!selectedProject) return
    const confirmed = window.confirm(`Delete this session?\n\n"${session.title}"`)
    if (!confirmed) return
    await window.electronAPI.deleteSession(session.id, selectedProject.projectsDir)
    if (selectedSession?.id === session.id) {
      setSelectedSession(null)
    }
    loadSessions(selectedProject)
  }

  /**
   * 在所有 session 的消息内容中搜索关键词
   * 逐个加载 session 消息，过滤出包含关键词的 session
   */
  const handleSearchContent = async (keyword: string): Promise<SessionMetadata[]> => {
    if (!selectedProject) return []
    const lower = keyword.toLowerCase()
    const matched: SessionMetadata[] = []
    for (const session of sessions) {
      try {
        const messages = await window.electronAPI.getSessionMessages(
          session.id,
          selectedProject.projectsDir
        )
        const hit = messages.some((m) => m.content.toLowerCase().includes(lower))
        if (hit) matched.push(session)
      } catch {
        // 单个 session 读取失败时跳过
      }
    }
    return matched
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 右上角主题切换 */}
      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      {/* 左栏：项目列表 */}
      <ProjectList
        projects={projects}
        selectedProject={selectedProject}
        onSelect={handleProjectSelect}
        width={projectsWidth}
        collapsed={projectsCollapsed}
      />

      {/* 分隔条 1（控制 Projects 栏） */}
      <ResizeDivider
        collapsed={projectsCollapsed}
        onMouseDown={onDividerMouseDown('divider1')}
        onToggle={toggleProjects}
      />

      {/* 中栏：Session 列表 */}
      <SessionList
        sessions={sessions}
        selectedSession={selectedSession}
        selectedProject={selectedProject}
        onSelect={handleSessionSelect}
        onResume={handleResume}
        onDelete={handleDelete}
        onSearchContent={handleSearchContent}
        onNew={handleNew}
        onKeywordChange={setSearchKeyword}
        width={sessionsWidth}
        collapsed={sessionsCollapsed}
      />

      {/* 分隔条 2（控制 Sessions 栏） */}
      <ResizeDivider
        collapsed={sessionsCollapsed}
        onMouseDown={onDividerMouseDown('divider2')}
        onToggle={toggleSessions}
      />

      {/* 右栏：Session Chat History（flex:1 占剩余空间） */}
      <SessionDetail
        session={selectedSession}
        selectedProject={selectedProject}
        searchKeyword={searchKeyword}
        minWidth={MIN_CHAT_WIDTH}
      />
    </div>
  )
}
