/**
 * 右栏：Session Chat History 面板 — 展示 User/Assistant 对话记录
 * 消息超过 4 行时折叠，点击可展开/收起完整内容
 * @author Alfie
 */

import { useState, useEffect, useRef } from 'react'
import type { SessionMetadata, Message } from '../../../main/types'
import type { ProjectInfo } from '../../../main/projectDiscovery'

/** 默认折叠行数 */
const COLLAPSED_LINES = 4

interface Props {
  session: SessionMetadata | null
  selectedProject: ProjectInfo | null
  /** 最小宽度（px），不传则使用默认值 200 */
  minWidth?: number
}

export default function SessionDetail({ session, selectedProject, minWidth }: Props): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session || !selectedProject) {
      setMessages([])
      return
    }

    setLoading(true)
    window.electronAPI
      .getSessionMessages(session.id, selectedProject.projectsDir)
      .then((msgs) => {
        setMessages(msgs)
        setLoading(false)
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 50)
      })
      .catch((err) => {
        console.error('Failed to load messages:', err)
        setMessages([])
        setLoading(false)
      })
  }, [session?.id, selectedProject?.projectsDir])

  return (
    <div style={{
      flex: 1,
      minWidth: `${minWidth ?? 200}px`,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        fontWeight: 700,
        fontSize: '13px',
        flexShrink: 0
      }}>
        Session Chat History
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {!session ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
            Select a session to view the conversation.
          </div>
        ) : loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
            No messages in this session.
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  )
}

interface BubbleProps {
  message: Message
}

/**
 * 单条消息气泡。
 * - 内容超过 COLLAPSED_LINES 行时折叠，底部显示"展开"按钮
 * - 展开后底部显示"收起"按钮
 * - 通过测量 scrollHeight vs clientHeight 判断是否需要折叠按钮
 * @author Alfie
 */
function MessageBubble({ message }: BubbleProps): JSX.Element {
  const isUser = message.role === 'user'
  const [expanded, setExpanded] = useState(false)
  const [needsExpand, setNeedsExpand] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // 测量内容实际高度，判断是否超出折叠行数
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    // 行高约 1.6 * 12px = 19.2px，COLLAPSED_LINES 行阈值
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 19.2
    const threshold = lineHeight * COLLAPSED_LINES
    setNeedsExpand(el.scrollHeight > threshold + 2) // +2px 容差
  }, [message.content])

  /** 折叠时的最大高度（行数 × 行高） */
  const collapsedMaxHeight = `${COLLAPSED_LINES * 1.6 * 12}px`

  return (
    <div style={{
      marginBottom: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start'
    }}>
      {/* 角色标签 */}
      <div style={{
        fontSize: '10px',
        color: 'var(--text-muted)',
        marginBottom: '3px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {isUser ? 'You' : 'Claude'}
      </div>

      {/* 气泡容器 */}
      <div style={{
        background: isUser ? 'var(--user-bubble)' : 'var(--assistant-bubble)',
        border: `1px solid ${isUser ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        padding: '8px 12px',
        maxWidth: '90%',
        fontSize: '12px',
        lineHeight: '1.6',
        color: 'var(--text-primary)',
        wordBreak: 'break-word',
        position: 'relative'
      }}>
        {/* 消息内容：折叠时限制高度并裁剪 */}
        <div
          ref={contentRef}
          style={{
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            maxHeight: (!needsExpand || expanded) ? 'none' : collapsedMaxHeight,
            // 折叠时底部渐隐遮罩
            WebkitMaskImage: (!needsExpand || expanded)
              ? 'none'
              : 'linear-gradient(to bottom, black 60%, transparent 100%)',
            maskImage: (!needsExpand || expanded)
              ? 'none'
              : 'linear-gradient(to bottom, black 60%, transparent 100%)'
          }}
        >
          {message.content}
        </div>

        {/* 展开 / 收起 按钮 */}
        {needsExpand && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'block',
              marginTop: expanded ? '6px' : '2px',
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '11px',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 500,
              textAlign: isUser ? 'right' : 'left',
              width: '100%'
            }}
          >
            {expanded ? '↑ Collapse' : '↓ Expand'}
          </button>
        )}
      </div>
    </div>
  )
}
