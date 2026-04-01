/**
 * 中栏：Session 列表组件
 * 支持收缩模式：宽度 < 100px 时只显示排序序号
 * 支持搜索（标题全文匹配）和排序（时间升/降序）
 * @author Alfie
 */

import { useState, useEffect, useRef } from 'react'
import { parseRelativeTime } from '../../../main/relativeTime'
import type { SessionMetadata } from '../../../main/types'
import type { ProjectInfo } from '../../../main/projectDiscovery'
import { applySortAndFilter, splitByKeyword, MIN_SEARCH_LENGTH } from '../utils/sessionFilter'

interface Props {
  sessions: SessionMetadata[]
  selectedSession: SessionMetadata | null
  selectedProject: ProjectInfo | null
  onSelect: (session: SessionMetadata) => void
  onResume: (session: SessionMetadata) => void
  onDelete: (session: SessionMetadata) => void
  onNew: () => void
  /**
   * 关键词变化时回调（含 trim），供父层传给 SessionDetail 用于高亮定位
   * 关键词被清空时传空字符串
   */
  onKeywordChange: (keyword: string) => void
  /**
   * 用户要求搜索消息内容时触发（标题无结果、用户确认后调用）
   * @param keyword - 搜索关键词
   * @returns 匹配的 session 列表
   */
  onSearchContent: (keyword: string) => Promise<SessionMetadata[]>
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

export default function SessionList({
  sessions,
  selectedSession,
  selectedProject,
  onSelect,
  onResume,
  onDelete,
  onNew,
  onKeywordChange,
  onSearchContent,
  width,
  collapsed
}: Props): JSX.Element {
  const projectName = selectedProject ? getProjectName(selectedProject.realPath) : ''

  /** 搜索输入框 ref，内容搜索完成后恢复 focus */
  const inputRef = useRef<HTMLInputElement>(null)

  /** 搜索关键词 */
  const [keyword, setKeyword] = useState('')
  /** 排序方向：false = 从新到旧（默认），true = 从旧到新 */
  const [sortAsc, setSortAsc] = useState(false)
  /** 内容搜索结果（null = 未触发内容搜索，[] = 无结果） */
  const [contentResults, setContentResults] = useState<SessionMetadata[] | null>(null)
  /** 内容搜索中 */
  const [searching, setSearching] = useState(false)

  /** 切换 Project 时重置搜索栏和内容搜索结果 */
  useEffect(() => {
    setKeyword('')
    setContentResults(null)
    onKeywordChange('')
  }, [selectedProject?.projectsDir])

  /** Ctrl+F 激活搜索栏 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /** 重置搜索状态到初始 */
  const resetSearch = (): void => {
    setKeyword('')
    setContentResults(null)
    onKeywordChange('')
  }

  /** 当前展示的 session 列表（排序 + 过滤后） */
  const trimmedKeyword = keyword.trim()
  const isSearching = trimmedKeyword.length >= MIN_SEARCH_LENGTH

  // 如果触发了内容搜索，直接使用内容搜索结果（仍应用排序）
  const baseList = contentResults !== null ? contentResults : sessions
  const displaySessions = applySortAndFilter(baseList, contentResults !== null ? '' : keyword, sortAsc)

  /** 处理关键词变更：清除上次内容搜索结果；关键词清空时完全重置 */
  const handleKeywordChange = (value: string): void => {
    setKeyword(value)
    setContentResults(null)
    onKeywordChange(value.trim())
  }

  /**
   * 关键词有效、标题无匹配时：直接搜索消息内容
   * 由搜索框 onKeyDown Enter 或列表区链接触发
   */
  const handleSearchContent = async (): Promise<void> => {
    setSearching(true)
    try {
      const results = await onSearchContent(trimmedKeyword)
      setContentResults(results)
    } finally {
      setSearching(false)
      // 搜索完成后恢复 input focus，避免 async 期间 focus 丢失
      inputRef.current?.focus()
    }
  }

  /** 标题过滤结果（用于判断是否需要提示内容搜索） */
  const titleFilteredCount = isSearching
    ? applySortAndFilter(sessions, keyword, sortAsc).length
    : sessions.length

  return (
    <div style={{
      width: `${width}px`,
      minWidth: `${width}px`,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* 头部（收缩时隐藏） */}
      {!collapsed && (
        <div style={{
          padding: '10px 12px 10px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* 第一行：项目名 + session 数 + New 按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 700,
                fontSize: '15px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {projectName || 'No project selected'}
              </div>
              {selectedProject && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </div>
              )}
            </div>

            {/* + New 按钮 */}
            {selectedProject && (
              <button
                onClick={onNew}
                title="Start a new Claude Code session in this project"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
                }}
              >
                + New
              </button>
            )}
          </div>

          {/* 第二行：搜索栏 + 排序按钮（有项目时显示） */}
          {selectedProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* 搜索输入框 */}
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isSearching && titleFilteredCount === 0 && contentResults === null) {
                    handleSearchContent()
                  }
                }}
                placeholder="Search sessions..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--accent)'
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border)'
                }}
              />

              {/* 重置按钮：关键词非空或有内容搜索结果时显示 */}
              {(keyword.length > 0 || contentResults !== null) && (
                <button
                  onClick={resetSearch}
                  title="Clear search"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '4px 7px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    lineHeight: 1,
                    transition: 'border-color 0.1s, color 0.1s'
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement
                    btn.style.borderColor = 'var(--accent)'
                    btn.style.color = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement
                    btn.style.borderColor = 'var(--border)'
                    btn.style.color = 'var(--text-muted)'
                  }}
                >
                  ✕
                </button>
              )}

              {/* 排序按钮 */}
              <button
                onClick={() => setSortAsc((prev) => !prev)}
                title={sortAsc ? 'Sorted: oldest first — click for newest first' : 'Sorted: newest first — click for oldest first'}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 7px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  lineHeight: 1,
                  transition: 'border-color 0.1s, color 0.1s'
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement
                  btn.style.borderColor = 'var(--accent)'
                  btn.style.color = 'var(--accent)'
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement
                  btn.style.borderColor = 'var(--border)'
                  btn.style.color = 'var(--text-secondary)'
                }}
              >
                {sortAsc ? '↑' : '↓'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Session 列表 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '4px 0' : '12px 16px' }}>
        {!selectedProject ? (
          !collapsed && (
            <div style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
              Select a project to see sessions.
            </div>
          )
        ) : searching ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
            Searching content...
          </div>
        ) : displaySessions.length === 0 ? (
          !collapsed && (
            <div style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
              {isSearching ? (
                contentResults !== null ? (
                  // 内容搜索也无结果
                  <>No results in title or content for "{trimmedKeyword}".</>
                ) : (
                  // 标题无结果，提示可搜索内容
                  <>
                    No results for "{trimmedKeyword}" in titles.{' '}
                    <span
                      onClick={handleSearchContent}
                      style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Continue searching in chat history?
                    </span>
                  </>
                )
              ) : (
                'No sessions found.'
              )}
            </div>
          )
        ) : (
          displaySessions.map((session, index) => {
            const isSelected = selectedSession?.id === session.id
            return collapsed ? (
              /* ── 收缩模式：显示 Session#N ── */
              <div
                key={session.id}
                onClick={() => onSelect(session)}
                title={session.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '36px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-selected)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  paddingLeft: '4px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {`Session#${index + 1}`}
              </div>
            ) : (
              /* ── 正常模式 ── */
              <SessionCard
                key={session.id}
                session={session}
                isSelected={isSelected}
                onSelect={() => onSelect(session)}
                onResume={() => onResume(session)}
                onDelete={() => onDelete(session)}
                narrow={width < 220}
                keyword={isSearching ? trimmedKeyword : ''}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

interface CardProps {
  session: SessionMetadata
  isSelected: boolean
  onSelect: () => void
  onResume: () => void
  onDelete: () => void
  /** 宽度较窄时隐藏 Resume 按钮 */
  narrow: boolean
  /** 高亮关键词，空字符串表示不高亮 */
  keyword: string
}

function SessionCard({ session, isSelected, onSelect, onResume, onDelete, narrow, keyword }: CardProps): JSX.Element {
  const relativeTime = session.lastTimestamp > 0
    ? parseRelativeTime(session.lastTimestamp)
    : 'unknown'

  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? 'var(--bg-selected)' : 'var(--bg-secondary)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '6px',
        marginBottom: '8px',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'border-color 0.1s, background 0.1s'
      }}
    >
      {/* 标题 */}
      <div style={{
        fontWeight: 500,
        fontSize: '13px',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: narrow ? 0 : '6px'
      }}>
        {keyword ? splitByKeyword(session.title, keyword).map((part, i) =>
          part.match ? (
            <mark key={i} style={{ background: '#ffe066', color: '#1a1a1a', borderRadius: '2px', padding: '0 1px' }}>
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        ) : session.title}
      </div>

      {/* 元信息行（窄时隐藏） */}
      {!narrow && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {relativeTime} · {session.messageCount} {session.messageCount === 1 ? 'msg' : 'msgs'}
          </div>

          {/* Resume 按钮 + 删除图标 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onResume()
              }}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.1s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
              }}
            >
              Resume
            </button>

            {/* 删除图标按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              title="Delete this session"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 6px',
                fontSize: '16px',
                lineHeight: 1,
                cursor: 'pointer',
                transition: 'color 0.1s, background 0.1s'
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement
                btn.style.color = '#e05555'
                btn.style.background = 'rgba(224,85,85,0.1)'
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement
                btn.style.color = 'var(--text-muted)'
                btn.style.background = 'transparent'
              }}
            >
              🗑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
