/**
 * Session 读取器：从 JSONL 文件读取 SessionMetadata 和完整消息
 * 包含 in-memory 缓存和 cwd 字段提取（最可靠的路径获取方式）
 *
 * @author Alfie
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { SessionMetadata, Message } from './types'
import { extractSessionMetadata, extractMessages } from './sessionParser'

/** in-memory 缓存：projectsDir → SessionMetadata[] */
const sessionCache = new Map<string, SessionMetadata[]>()

/**
 * 从 JSONL 文件第一行读取 cwd 字段（真实项目路径）
 * 这是比 decodeProjectPath 更可靠的路径获取方式
 *
 * @param jsonlPath - JSONL 文件完整路径
 * @returns cwd 字符串，或 null（无法读取时）
 */
export function getCwdFromJsonl(jsonlPath: string): string | null {
  try {
    const content = readFileSync(jsonlPath, 'utf-8')
    // 扫描前 20 行，找到第一个含 cwd 字段的条目
    const lines = content.split('\n').slice(0, 20)
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const entry = JSON.parse(line)
        if (typeof entry.cwd === 'string' && entry.cwd.length > 0) {
          return entry.cwd
        }
      } catch {
        // 跳过无效 JSON 行
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 读取指定项目目录下所有 session 的元数据
 * 使用 in-memory 缓存，变更时按文件增量更新
 *
 * @param projectsDir - ~/.claude/projects/<encodedName> 的完整路径
 * @param realPath - 真实项目路径（用于 SessionMetadata.projectPath）
 * @returns SessionMetadata 数组，按 lastTimestamp 倒序排列
 */
export function getSessions(projectsDir: string, realPath: string): SessionMetadata[] {
  // 找顶层 *.jsonl 文件
  let jsonlFiles: string[]
  try {
    jsonlFiles = readdirSync(projectsDir).filter((f) => {
      if (!f.endsWith('.jsonl')) return false
      try {
        return statSync(join(projectsDir, f)).isFile()
      } catch {
        return false
      }
    })
  } catch {
    return []
  }

  const sessions: SessionMetadata[] = []

  for (const jsonlFile of jsonlFiles) {
    const sessionId = basename(jsonlFile, '.jsonl')
    const jsonlPath = join(projectsDir, jsonlFile)

    // 尝试从缓存中获取
    const cacheKey = jsonlPath
    const cached = sessionCache.get(cacheKey)
    if (cached) {
      sessions.push(...cached)
      continue
    }

    // 读取并解析 JSONL
    const metadata = readSessionMetadata(jsonlPath, sessionId, realPath)
    if (metadata) {
      sessionCache.set(cacheKey, [metadata])
      sessions.push(metadata)
    }
  }

  // 按最后活跃时间倒序
  return sessions.sort((a, b) => b.lastTimestamp - a.lastTimestamp)
}

/**
 * 读取指定 session 的完整对话消息（用于 Session Detail 面板）
 *
 * @param sessionId - session UUID
 * @param projectsDir - ~/.claude/projects/<encodedName> 的完整路径
 * @returns Message 数组（有序）
 */
export function getSessionMessages(sessionId: string, projectsDir: string): Message[] {
  const jsonlPath = join(projectsDir, `${sessionId}.jsonl`)
  try {
    const content = readFileSync(jsonlPath, 'utf-8')
    const lines = content.split('\n')
    return extractMessages(lines)
  } catch {
    return []
  }
}

/**
 * 使指定文件的缓存失效（chokidar 检测到变更时调用）
 * @param jsonlPath - 变更的 JSONL 文件路径
 */
export function invalidateCache(jsonlPath: string): void {
  sessionCache.delete(jsonlPath)
}

/**
 * 清空所有缓存
 */
export function clearCache(): void {
  sessionCache.clear()
}

// ---- 内部工具函数 ----

function readSessionMetadata(
  jsonlPath: string,
  sessionId: string,
  projectPath: string
): SessionMetadata | null {
  try {
    const content = readFileSync(jsonlPath, 'utf-8')
    const lines = content.split('\n')
    return extractSessionMetadata(lines, sessionId, projectPath)
  } catch {
    return null
  }
}
