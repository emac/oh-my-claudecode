/**
 * 右栏：Session Chat History 面板 — 展示 User/Assistant 对话记录
 * 消息超过 4 行时折叠，点击可展开/收起完整内容
 * 支持关键词高亮（黄色背景）、自动展开匹配消息、滚动定位到第一条匹配
 * @author Alfie
 */

import { useState, useEffect, useRef, forwardRef } from 'react'
import type { SessionMetadata, Message } from '../../../main/types'
import type { ProjectInfo } from '../../../main/projectDiscovery'
import { splitByKeyword, MIN_SEARCH_LENGTH } from '../utils/sessionFilter'

/** 默认折叠行数 */
const COLLAPSED_LINES = 4

interface Props {
  session: SessionMetadata | null
  selectedProject: ProjectInfo | null
  /** 搜索关键词，用于高亮消息内容并定位到第一条匹配消息；空字符串表示无搜索 */
  searchKeyword: string
  /** 最小宽度（px），不传则使用默认值 200 */
  minWidth?: number
}

export default function SessionDetail({ session, selectedProject, searchKeyword, minWidth }: Props): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  /** 当前聚焦的匹配消息索引（在 matchIndices 中的位置，非 messages 中的索引） */
  const [matchCursor, setMatchCursor] = useState(0)
  /** 可滚动内容区容器 ref */
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  /** 各消息对应的 DOM ref */
  const msgRefs = useRef<(HTMLDivElement | null)[]>([])

  const trimmedKeyword = searchKeyword.trim()
  const isHighlighting = trimmedKeyword.length >= MIN_SEARCH_LENGTH

  /** 预计算每条消息是否命中关键词（渲染前同步计算，作为 MessageBubble expanded 初始值） */
  const matchFlags: boolean[] = isHighlighting
    ? messages.map((m) => m.content.toLowerCase().includes(trimmedKeyword.toLowerCase()))
    : messages.map(() => false)

  /** 所有命中关键词的消息在 messages 中的索引列表 */
  const matchIndices: number[] = matchFlags.reduce<number[]>((acc, hit, i) => {
    if (hit) acc.push(i)
    return acc
  }, [])

  // ── 加载消息 ──────────────────────────────────────────────
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
      })
      .catch((err) => {
        console.error('Failed to load messages:', err)
        setMessages([])
        setLoading(false)
      })
  }, [session?.id, selectedProject?.projectsDir])

  /**
   * 滚动到 matchIndices[cursor] 对应的消息。
   * 等两帧确保 forceExpand 展开的 DOM 已稳定。
   */
  const scrollToMatch = (cursor: number): void => {
    const msgIdx = matchIndices[cursor]
    if (msgIdx === undefined) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = msgRefs.current[msgIdx]
        if (!el || !scrollContainerRef.current) return
        const container = scrollContainerRef.current
        const elTop = el.getBoundingClientRect().top
        const containerTop = container.getBoundingClientRect().top
        container.scrollTop = container.scrollTop + (elTop - containerTop)
      })
    })
  }

  /**
   * 消息或关键词变化时执行滚动定位。
   * - 无关键词或无匹配：滚到底部，重置 cursor
   * - 有匹配：cursor 重置为 0，定位到第一条匹配
   */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || messages.length === 0) return

    if (!isHighlighting || matchIndices.length === 0) {
      container.scrollTop = container.scrollHeight
      setMatchCursor(0)
      return
    }

    setMatchCursor(0)
    scrollToMatch(0)
  }, [trimmedKeyword, messages])

  /** 向上/向下导航到上一条/下一条匹配消息（循环） */
  const navigateMatch = (direction: 'up' | 'down'): void => {
    if (matchIndices.length === 0) return
    const next = direction === 'down'
      ? (matchCursor + 1) % matchIndices.length
      : (matchCursor - 1 + matchIndices.length) % matchIndices.length
    setMatchCursor(next)
    scrollToMatch(next)
  }

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
        paddingRight: '80px',
        borderBottom: '1px solid var(--border)',
        fontWeight: 700,
        fontSize: '13px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>Session Chat History</span>

        {/* 匹配导航按钮：仅在有关键词且有匹配结果时显示 */}
        {isHighlighting && matchIndices.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
              {matchCursor + 1} / {matchIndices.length}
            </span>
            <button
              onClick={() => navigateMatch('up')}
              title="Previous match"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
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
            >↑</button>
            <button
              onClick={() => navigateMatch('down')}
              title="Next match"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
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
            >↓</button>
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
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
              <MessageBubble
                key={idx}
                message={msg}
                keyword={isHighlighting ? trimmedKeyword : ''}
                forceExpand={matchFlags[idx]}
                active={matchIndices[matchCursor] === idx}
                ref={(el) => { msgRefs.current[idx] = el }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

interface BubbleProps {
  message: Message
  /** 高亮关键词，空字符串表示不高亮 */
  keyword: string
  /**
   * 强制展开：父层渲染前预计算，命中关键词的消息以展开状态渲染。
   * forceExpand 变化时同步更新 expanded（切换关键词场景）。
   */
  forceExpand: boolean
  /** 是否为当前导航激活的匹配消息，激活时高亮色与其他匹配消息有所区分 */
  active: boolean
}

/**
 * 单条消息气泡。
 * - 内容超过 COLLAPSED_LINES 行时折叠，底部显示"展开"按钮
 * - 展开后底部显示"收起"按钮
 * - keyword 非空时将消息内容按关键词切分，命中片段用黄色背景 <mark> 高亮
 * - forceExpand=true 时以展开状态渲染，用户可手动折叠
 * @author Alfie
 */
const MessageBubble = forwardRef<HTMLDivElement, BubbleProps>(
  function MessageBubble({ message, keyword, forceExpand, active }, outerRef) {
  const isUser = message.role === 'user'
  // 用 ref 追踪上一次 forceExpand 值，当 forceExpand 变化时同步重置 expanded（无需异步 useEffect）
  const prevForceExpand = useRef(forceExpand)
  const [expanded, setExpanded] = useState(forceExpand)
  const [needsExpand, setNeedsExpand] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // 测量内容实际高度，判断是否需要折叠按钮
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 19.2
    const threshold = lineHeight * COLLAPSED_LINES
    setNeedsExpand(el.scrollHeight > threshold + 2)
  }, [message.content])

  // forceExpand 变化时在渲染阶段同步更新（而非异步 useEffect），确保 rAF 读到的 DOM 已是展开状态
  if (prevForceExpand.current !== forceExpand) {
    prevForceExpand.current = forceExpand
    // 直接在渲染中更新 state：React 会在同一次渲染中处理，不引发额外 re-render
    setExpanded(forceExpand)
  }

  const collapsedMaxHeight = `${COLLAPSED_LINES * 1.6 * 12}px`

  /**
   * 渲染消息文本，keyword 非空时高亮命中片段。
   * active=true（当前导航激活）时用橙色高亮，其余匹配用黄色，明暗模式下均清晰可辨。
   * @author Alfie
   */
  const renderContent = (): JSX.Element => {
    if (!keyword) return <>{message.content}</>
    const parts = splitByKeyword(message.content, keyword)
    return (
      <>
        {parts.map((part, i) =>
          part.match ? (
            <mark key={i} style={{
              background: active ? '#ff7043' : '#ffe066',
              color: '#1a1a1a',
              borderRadius: '2px',
              padding: '0 1px'
            }}>
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    )
  }

  return (
    <div
      ref={outerRef}
      style={{
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start'
      }}
    >
      <div style={{
        fontSize: '10px',
        color: 'var(--text-muted)',
        marginBottom: '3px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {isUser ? 'You' : 'Claude'}
      </div>

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
        <div
          ref={contentRef}
          style={{
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            maxHeight: (!needsExpand || expanded) ? 'none' : collapsedMaxHeight,
            WebkitMaskImage: (!needsExpand || expanded)
              ? 'none'
              : 'linear-gradient(to bottom, black 60%, transparent 100%)',
            maskImage: (!needsExpand || expanded)
              ? 'none'
              : 'linear-gradient(to bottom, black 60%, transparent 100%)'
          }}
        >
          {renderContent()}
        </div>

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
})
