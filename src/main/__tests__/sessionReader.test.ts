/**
 * 集成测试：sessionReader + projectDiscovery（使用真实 ~/.claude/projects/ 目录）
 * @author Alfie
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getSessions, getSessionMessages, clearCache } from '../sessionReader'

// 构造临时 project 目录
function makeTempProjectDir(): string {
  const dir = join(tmpdir(), `cc-test-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function writeJsonlFile(dir: string, sessionId: string, lines: object[]): string {
  const path = join(dir, `${sessionId}.jsonl`)
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join('\n'))
  return path
}

describe('getSessions', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = makeTempProjectDir()
    clearCache()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('读取有效 JSONL 文件返回 SessionMetadata', () => {
    writeJsonlFile(tempDir, 'session-001', [
      { type: 'user', message: { role: 'user', content: 'Hello world' }, timestamp: '2026-03-30T10:00:00.000Z' },
      { type: 'assistant', message: { role: 'assistant', content: 'Hi!' }, timestamp: '2026-03-30T10:01:00.000Z' }
    ])

    const sessions = getSessions(tempDir, '/project')
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('session-001')
    expect(sessions[0].title).toBe('Hello world')
    expect(sessions[0].messageCount).toBe(2)
  })

  it('按 lastTimestamp 倒序排列', () => {
    writeJsonlFile(tempDir, 'old-session', [
      { type: 'user', message: { role: 'user', content: 'Older' }, timestamp: '2026-03-28T10:00:00.000Z' }
    ])
    writeJsonlFile(tempDir, 'new-session', [
      { type: 'user', message: { role: 'user', content: 'Newer' }, timestamp: '2026-03-30T10:00:00.000Z' }
    ])

    const sessions = getSessions(tempDir, '/project')
    expect(sessions[0].id).toBe('new-session')
    expect(sessions[1].id).toBe('old-session')
  })

  it('空目录返回空数组', () => {
    const sessions = getSessions(tempDir, '/project')
    expect(sessions).toEqual([])
  })

  it('不存在的目录返回空数组', () => {
    const sessions = getSessions('/nonexistent/path', '/project')
    expect(sessions).toEqual([])
  })
})

describe('getSessionMessages', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = makeTempProjectDir()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('返回有序对话消息', () => {
    writeJsonlFile(tempDir, 'session-xyz', [
      { type: 'user', message: { role: 'user', content: 'Question?' }, timestamp: '2026-03-30T10:00:00.000Z' },
      { type: 'assistant', message: { role: 'assistant', content: 'Answer!' }, timestamp: '2026-03-30T10:01:00.000Z' }
    ])

    const msgs = getSessionMessages('session-xyz', tempDir)
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('user')
    expect(msgs[1].role).toBe('assistant')
  })

  it('session 不存在返回空数组', () => {
    const msgs = getSessionMessages('nonexistent', tempDir)
    expect(msgs).toEqual([])
  })
})
