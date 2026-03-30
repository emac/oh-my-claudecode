/**
 * 单元测试：extractSessionMetadata / extractMessages
 * @author Alfie
 */
import { describe, it, expect } from 'vitest'
import { extractSessionMetadata, extractMessages } from '../sessionParser'

// 构造测试用 JSONL 行
function makeUserLine(content: string, ts = '2026-03-30T10:00:00.000Z'): string {
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content },
    timestamp: ts
  })
}

function makeAssistantLine(content: string, ts = '2026-03-30T10:01:00.000Z'): string {
  return JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', content },
    timestamp: ts
  })
}

function makeProgressLine(): string {
  return JSON.stringify({ type: 'progress', data: {}, timestamp: '2026-03-30T09:59:00.000Z' })
}

describe('extractSessionMetadata', () => {
  it('正常 session：提取标题、消息数、最后时间戳', () => {
    const lines = [
      makeProgressLine(),
      makeUserLine('How do I implement a binary search?'),
      makeAssistantLine('Here is a binary search implementation...')
    ]
    const result = extractSessionMetadata(lines, 'test-uuid', '/project')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('test-uuid')
    expect(result!.title).toBe('How do I implement a binary search?')
    expect(result!.messageCount).toBe(2) // user + assistant
    expect(result!.lastTimestamp).toBeGreaterThan(0)
  })

  it('标题截断到 80 字符', () => {
    const longTitle = 'A'.repeat(100)
    const lines = [makeUserLine(longTitle)]
    const result = extractSessionMetadata(lines, 'uuid', '/p')
    expect(result!.title.length).toBeLessThanOrEqual(80)
  })

  it('无 user 消息时降级为 "Session <date>"', () => {
    const lines = [makeAssistantLine('Some assistant message')]
    const result = extractSessionMetadata(lines, 'uuid', '/p')
    expect(result!.title).toMatch(/^Session \d{4}-\d{2}-\d{2}$/)
  })

  it('超过 500 行：只读前 500 行，不崩溃', () => {
    const lines = Array.from({ length: 1000 }, (_, i) =>
      makeUserLine(`Message ${i}`, `2026-03-30T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`)
    )
    const result = extractSessionMetadata(lines, 'uuid', '/p')
    expect(result).not.toBeNull()
    // 最多读 500 行
    expect(result!.messageCount).toBeLessThanOrEqual(500)
  })

  it('中间有损坏的行：跳过，继续处理', () => {
    const lines = [
      makeUserLine('Good line'),
      'INVALID JSON {{{',
      makeAssistantLine('Another good line')
    ]
    const result = extractSessionMetadata(lines, 'uuid', '/p')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Good line')
    expect(result!.messageCount).toBe(2)
  })

  it('空数组返回 null', () => {
    expect(extractSessionMetadata([], 'uuid', '/p')).toBeNull()
  })
})

describe('extractMessages', () => {
  it('正常 session：返回有序的 user/assistant 消息', () => {
    const lines = [
      makeProgressLine(),
      makeUserLine('Hello'),
      makeAssistantLine('Hi there!')
    ]
    const msgs = extractMessages(lines)
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toBe('Hello')
    expect(msgs[1].role).toBe('assistant')
    expect(msgs[1].content).toBe('Hi there!')
  })

  it('损坏行被跳过，不崩溃', () => {
    const lines = [makeUserLine('OK'), 'bad json', makeAssistantLine('OK2')]
    const msgs = extractMessages(lines)
    expect(msgs).toHaveLength(2)
  })

  it('空 JSONL 返回空数组', () => {
    expect(extractMessages([])).toEqual([])
  })

  it('只有 assistant 消息也能正常返回', () => {
    const lines = [makeAssistantLine('Only assistant')]
    const msgs = extractMessages(lines)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].role).toBe('assistant')
  })
})
