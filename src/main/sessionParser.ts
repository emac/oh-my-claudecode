/**
 * Session 读取器：从 JSONL 文件中提取 SessionMetadata 和完整对话消息
 *
 * 设计约束：
 *  - 元数据提取最多读取 500 行，防止大文件冻结 UI
 *  - 每行独立 try/catch，防止 mid-write 截断导致整体崩溃
 *  - 标题取第一条 type:"user" 消息的前 80 字符
 *  - 无 user 消息时降级为 "Session <YYYY-MM-DD>"
 *
 * @author Alfie
 */

import { SessionMetadata, Message } from './types'

const MAX_METADATA_LINES = 500
const TITLE_MAX_LENGTH = 80

/**
 * 从 JSONL 行数组中提取 SessionMetadata
 * @param jsonlLines - JSONL 文件的行数组（字符串）
 * @param sessionId - session UUID（JSONL 文件名去掉 .jsonl）
 * @param projectPath - 所属项目路径
 * @returns SessionMetadata，或 null（空输入时）
 */
export function extractSessionMetadata(
  jsonlLines: string[],
  sessionId: string,
  projectPath: string
): SessionMetadata | null {
  if (!jsonlLines || jsonlLines.length === 0) {
    return null
  }

  const linesToRead = jsonlLines.slice(0, MAX_METADATA_LINES)

  let title: string | null = null
  let lastTimestamp = 0
  let messageCount = 0

  for (const line of linesToRead) {
    if (!line.trim()) continue

    let entry: Record<string, unknown>
    try {
      entry = JSON.parse(line)
    } catch {
      // mid-write 截断或格式错误：跳过此行，继续处理
      continue
    }

    // 提取时间戳
    if (typeof entry.timestamp === 'string') {
      const ts = new Date(entry.timestamp as string).getTime()
      if (!isNaN(ts) && ts > lastTimestamp) {
        lastTimestamp = ts
      }
    }

    // 仅计算 user / assistant 消息
    if (entry.type === 'user' || entry.type === 'assistant') {
      messageCount++

      // 提取标题：第一条 user 消息的前 80 字符
      if (title === null && entry.type === 'user') {
        title = extractTextContent(entry, TITLE_MAX_LENGTH)
      }
    }
  }

  // 无 user 消息时降级标题
  if (title === null) {
    const dateStr = lastTimestamp > 0
      ? new Date(lastTimestamp).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    title = `Session ${dateStr}`
  }

  return {
    id: sessionId,
    title,
    lastTimestamp,
    messageCount,
    projectPath
  }
}

/**
 * 从 JSONL 行数组中提取完整的 User/Assistant 对话消息（用于 Session Detail）
 * @param jsonlLines - JSONL 文件的所有行
 * @returns 有序的消息数组
 */
export function extractMessages(jsonlLines: string[]): Message[] {
  const messages: Message[] = []

  for (const line of jsonlLines) {
    if (!line.trim()) continue

    let entry: Record<string, unknown>
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    if (entry.type !== 'user' && entry.type !== 'assistant') {
      continue
    }

    const content = extractTextContent(entry)
    if (!content) continue

    const timestamp = typeof entry.timestamp === 'string'
      ? new Date(entry.timestamp as string).getTime()
      : 0

    messages.push({
      role: entry.type as 'user' | 'assistant',
      content,
      timestamp
    })
  }

  return messages
}

/**
 * 从 JSONL entry 中提取文本内容
 * 处理两种格式：
 *   1. message.content 为字符串
 *   2. message.content 为数组（含 type:"text" 的对象）
 * @param entry - JSONL 解析后的对象
 * @param maxLength - 截断长度，不传则返回完整内容
 */
function extractTextContent(entry: Record<string, unknown>, maxLength?: number): string {
  const message = entry.message as Record<string, unknown> | undefined
  if (!message) return ''

  const content = message.content

  if (typeof content === 'string') {
    const text = content.trim()
    return maxLength !== undefined ? text.slice(0, maxLength) : text
  }

  if (Array.isArray(content)) {
    // 收集所有 type:"text" 块，拼接为完整内容
    const parts: string[] = []
    for (const item of content) {
      if (item && typeof item === 'object' && (item as Record<string, unknown>).type === 'text') {
        const text = (item as Record<string, unknown>).text
        if (typeof text === 'string') {
          parts.push(text)
        }
      }
    }
    const full = parts.join('').trim()
    return maxLength !== undefined ? full.slice(0, maxLength) : full
  }

  return ''
}
