/**
 * 单元测试：parseRelativeTime
 * @author Alfie
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseRelativeTime } from '../relativeTime'

describe('parseRelativeTime', () => {
  beforeEach(() => {
    // 固定当前时间为 2026-03-30 12:00:00 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const now = new Date('2026-03-30T12:00:00.000Z').getTime()

  it('30 秒前 → "just now"', () => {
    expect(parseRelativeTime(now - 30_000)).toBe('just now')
  })

  it('5 分钟前 → "5 minutes ago"', () => {
    expect(parseRelativeTime(now - 5 * 60_000)).toBe('5 minutes ago')
  })

  it('1 分钟前 → "1 minute ago"', () => {
    expect(parseRelativeTime(now - 60_000)).toBe('1 minute ago')
  })

  it('2 小时前 → "2 hours ago"', () => {
    expect(parseRelativeTime(now - 2 * 3600_000)).toBe('2 hours ago')
  })

  it('1 小时前 → "1 hour ago"', () => {
    expect(parseRelativeTime(now - 3600_000)).toBe('1 hour ago')
  })

  it('昨天（25 小时前）→ "yesterday"', () => {
    expect(parseRelativeTime(now - 25 * 3600_000)).toBe('yesterday')
  })

  it('3 天前 → "3 days ago"', () => {
    expect(parseRelativeTime(now - 3 * 24 * 3600_000)).toBe('3 days ago')
  })

  it('未来时间（时钟漂移）→ "just now"', () => {
    expect(parseRelativeTime(now + 5000)).toBe('just now')
  })
})
