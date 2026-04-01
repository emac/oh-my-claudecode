/**
 * 单元测试：sessionFilter 工具函数
 * @author Alfie
 */
import { describe, it, expect } from 'vitest'
import {
  filterSessionsByTitle,
  sortSessions,
  applySortAndFilter,
  splitByKeyword,
  MIN_SEARCH_LENGTH
} from '../../renderer/src/utils/sessionFilter'
import type { SessionMetadata } from '../types'

/** 构造最小可用的 SessionMetadata */
function makeSession(id: string, title: string, lastTimestamp: number): SessionMetadata {
  return { id, title, lastTimestamp, messageCount: 1, projectPath: '/fake/path' }
}

const s1 = makeSession('a', 'Fix login bug', 1000)
const s2 = makeSession('b', 'Add Dark Mode', 2000)
const s3 = makeSession('c', 'Refactor login flow', 3000)
const sessions = [s1, s2, s3]

// ── filterSessionsByTitle ─────────────────────────────────────

describe('filterSessionsByTitle', () => {
  it('关键词长度 < MIN_SEARCH_LENGTH 时返回全部', () => {
    expect(filterSessionsByTitle(sessions, '')).toHaveLength(3)
    expect(filterSessionsByTitle(sessions, 'l')).toHaveLength(3)
    expect(filterSessionsByTitle(sessions, ' ')).toHaveLength(3) // 空格 trim 后长度 0
  })

  it('关键词长度 >= MIN_SEARCH_LENGTH 时按标题过滤', () => {
    const result = filterSessionsByTitle(sessions, 'lo')
    // 'Fix login bug' 和 'Refactor login flow' 都含 'lo'
    expect(result.map((s) => s.id)).toEqual(['a', 'c'])
  })

  it('大小写不敏感', () => {
    expect(filterSessionsByTitle(sessions, 'DARK')).toHaveLength(1)
    expect(filterSessionsByTitle(sessions, 'dark')).toHaveLength(1)
    expect(filterSessionsByTitle(sessions, 'Dark')).toHaveLength(1)
  })

  it('无匹配时返回空数组', () => {
    expect(filterSessionsByTitle(sessions, 'xyz')).toHaveLength(0)
  })

  it('前后空白被 trim', () => {
    expect(filterSessionsByTitle(sessions, '  login  ')).toHaveLength(2)
  })

  it('MIN_SEARCH_LENGTH 恰好为 ' + MIN_SEARCH_LENGTH, () => {
    const keyword = 'lo' // 长度 = MIN_SEARCH_LENGTH
    expect(filterSessionsByTitle(sessions, keyword).length).toBeGreaterThan(0)
    const oneShort = 'l' // 长度 = MIN_SEARCH_LENGTH - 1
    expect(filterSessionsByTitle(sessions, oneShort)).toHaveLength(3)
  })
})

// ── sortSessions ──────────────────────────────────────────────

describe('sortSessions', () => {
  it('asc=false（默认）：从新到旧', () => {
    const result = sortSessions(sessions, false)
    expect(result.map((s) => s.id)).toEqual(['c', 'b', 'a'])
  })

  it('asc=true：从旧到新', () => {
    const result = sortSessions(sessions, true)
    expect(result.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('不修改原数组', () => {
    const original = [...sessions]
    sortSessions(sessions, true)
    expect(sessions).toEqual(original)
  })
})

// ── applySortAndFilter ────────────────────────────────────────

describe('applySortAndFilter', () => {
  it('排序后过滤：asc=false + keyword "login"', () => {
    // 排序结果：[s3(3000), s2(2000), s1(1000)]，过滤 login：[s3, s1]
    const result = applySortAndFilter(sessions, 'login', false)
    expect(result.map((s) => s.id)).toEqual(['c', 'a'])
  })

  it('排序后过滤：asc=true + keyword "login"', () => {
    // 排序结果：[s1(1000), s2(2000), s3(3000)]，过滤 login：[s1, s3]
    const result = applySortAndFilter(sessions, 'login', true)
    expect(result.map((s) => s.id)).toEqual(['a', 'c'])
  })

  it('空关键词时只排序，不过滤', () => {
    const result = applySortAndFilter(sessions, '', false)
    expect(result.map((s) => s.id)).toEqual(['c', 'b', 'a'])
  })
})

// ── splitByKeyword ────────────────────────────────────────────

describe('splitByKeyword', () => {
  it('关键词长度 < MIN_SEARCH_LENGTH 时返回单个非命中片段', () => {
    const r = splitByKeyword('hello world', 'h')
    expect(r).toEqual([{ text: 'hello world', match: false }])
  })

  it('无匹配时返回单个非命中片段', () => {
    const r = splitByKeyword('hello world', 'xyz')
    expect(r).toEqual([{ text: 'hello world', match: false }])
  })

  it('命中出现在中间', () => {
    const r = splitByKeyword('Fix Login Bug', 'log')
    expect(r).toEqual([
      { text: 'Fix ', match: false },
      { text: 'Log', match: true },
      { text: 'in Bug', match: false }
    ])
  })

  it('命中出现在开头', () => {
    const r = splitByKeyword('login bug', 'login')
    expect(r).toEqual([
      { text: 'login', match: true },
      { text: ' bug', match: false }
    ])
  })

  it('命中出现在末尾', () => {
    const r = splitByKeyword('fix login', 'login')
    expect(r).toEqual([
      { text: 'fix ', match: false },
      { text: 'login', match: true }
    ])
  })

  it('多处命中', () => {
    const r = splitByKeyword('login and re-login again', 'login')
    expect(r).toEqual([
      { text: 'login', match: true },
      { text: ' and re-', match: false },
      { text: 'login', match: true },
      { text: ' again', match: false }
    ])
  })

  it('大小写不敏感，保留原始大小写', () => {
    const r = splitByKeyword('Fix LOGIN Bug', 'login')
    expect(r[1]).toEqual({ text: 'LOGIN', match: true })
  })

  it('整个字符串都命中', () => {
    const r = splitByKeyword('login', 'login')
    expect(r).toEqual([{ text: 'login', match: true }])
  })
})
