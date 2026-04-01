/**
 * Session 列表的过滤与排序工具函数
 * 纯函数，不依赖任何 React / Electron API，便于单元测试
 *
 * @author Alfie
 */

import type { SessionMetadata } from '../../../main/types'

/** 最短触发搜索的关键词长度 */
export const MIN_SEARCH_LENGTH = 2

/**
 * 按关键词过滤 session 列表（仅匹配标题，大小写不敏感）
 *
 * @param sessions - 原始 session 列表
 * @param keyword  - 搜索关键词（空或长度 < MIN_SEARCH_LENGTH 时返回全部）
 * @returns 过滤后的 session 列表（顺序与入参保持一致）
 * @author Alfie
 */
export function filterSessionsByTitle(
  sessions: SessionMetadata[],
  keyword: string
): SessionMetadata[] {
  const trimmed = keyword.trim()
  if (trimmed.length < MIN_SEARCH_LENGTH) return sessions
  const lower = trimmed.toLowerCase()
  return sessions.filter((s) => s.title.toLowerCase().includes(lower))
}

/**
 * 对 session 列表排序
 *
 * @param sessions - 待排序列表（不修改原数组）
 * @param asc      - true = 从旧到新（时间升序），false = 从新到旧（时间降序，默认）
 * @returns 排序后的新数组
 * @author Alfie
 */
export function sortSessions(sessions: SessionMetadata[], asc: boolean): SessionMetadata[] {
  return [...sessions].sort((a, b) =>
    asc ? a.lastTimestamp - b.lastTimestamp : b.lastTimestamp - a.lastTimestamp
  )
}

/**
 * 先排序，再按标题过滤（组合操作）
 *
 * @param sessions - 原始 session 列表
 * @param keyword  - 搜索关键词
 * @param asc      - 排序方向
 * @author Alfie
 */
export function applySortAndFilter(
  sessions: SessionMetadata[],
  keyword: string,
  asc: boolean
): SessionMetadata[] {
  return filterSessionsByTitle(sortSessions(sessions, asc), keyword)
}

/**
 * 将文本按关键词切分为片段数组，用于渲染高亮。
 * 每个片段包含文本内容和是否命中关键词的标志。
 * 大小写不敏感，保留原始大小写。
 *
 * 示例：splitByKeyword("Fix Login Bug", "log")
 *   → [{ text: "Fix ", match: false }, { text: "Log", match: true }, { text: "in Bug", match: false }]
 *
 * @param text    - 原始文本
 * @param keyword - 搜索关键词（空或长度 < MIN_SEARCH_LENGTH 时返回单个非命中片段）
 * @returns 文本片段数组
 * @author Alfie
 */
export function splitByKeyword(
  text: string,
  keyword: string
): Array<{ text: string; match: boolean }> {
  const trimmed = keyword.trim()
  if (trimmed.length < MIN_SEARCH_LENGTH) return [{ text, match: false }]

  const lower = trimmed.toLowerCase()
  const result: Array<{ text: string; match: boolean }> = []
  let cursor = 0
  const textLower = text.toLowerCase()

  while (cursor < text.length) {
    const idx = textLower.indexOf(lower, cursor)
    if (idx === -1) {
      result.push({ text: text.slice(cursor), match: false })
      break
    }
    if (idx > cursor) {
      result.push({ text: text.slice(cursor, idx), match: false })
    }
    result.push({ text: text.slice(idx, idx + trimmed.length), match: true })
    cursor = idx + trimmed.length
  }

  return result
}
