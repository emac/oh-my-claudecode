/**
 * 中栏：Session 列表组件
 * 支持收缩模式：宽度 < 100px 时只显示排序序号
 * @author Alfie
 */

import { parseRelativeTime } from '../../../main/relativeTime'
import type { SessionMetadata } from '../../../main/types'
import type { ProjectInfo } from '../../../main/projectDiscovery'

interface Props {
  sessions: SessionMetadata[]
  selectedSession: SessionMetadata | null
  selectedProject: ProjectInfo | null
  onSelect: (session: SessionMetadata) => void
  onResume: (session: SessionMetadata) => void
  onNew: () => void
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
  onNew,
  width,
  collapsed
}: Props): JSX.Element {
  const projectName = selectedProject ? getProjectName(selectedProject.realPath) : ''

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
          alignItems: 'center',
          gap: '8px'
        }}>
          {/* 项目名 + session 数量 */}
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
      )}

      {/* Session 列表 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '4px 0' : '12px 16px' }}>
        {!selectedProject ? (
          !collapsed && (
            <div style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
              Select a project to see sessions.
            </div>
          )
        ) : sessions.length === 0 ? (
          !collapsed && (
            <div style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
              No sessions found.
            </div>
          )
        ) : (
          sessions.map((session, index) => {
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
                narrow={width < 220}
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
  /** 宽度较窄时隐藏 Resume 按钮 */
  narrow: boolean
}

function SessionCard({ session, isSelected, onSelect, onResume, narrow }: CardProps): JSX.Element {
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
        {session.title}
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

          {/* Resume 按钮 */}
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
            Resume
          </button>
        </div>
      )}
    </div>
  )
}
