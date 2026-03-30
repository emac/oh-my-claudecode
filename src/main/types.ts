/**
 * 共享类型定义：SessionMetadata 和 Message
 * @author Alfie
 */

/** 单条 session 的元数据，从 JSONL 文件提取 */
export interface SessionMetadata {
  /** JSONL 文件名去掉 .jsonl 后缀，即 session UUID */
  id: string
  /** 第一条 user 消息的前 80 字符；无 user 消息时降级为 "Session <date>" */
  title: string
  /** 最后一条消息的 Unix 时间戳（毫秒） */
  lastTimestamp: number
  /** 消息总条数（估算，最多读 500 行） */
  messageCount: number
  /** 所属项目的真实路径 */
  projectPath: string
}

/** 单条对话消息，用于 Session Detail 面板 */
export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

/** IPC channel 名称常量 */
export const IPC_CHANNELS = {
  GET_SESSIONS: 'get-sessions',
  GET_SESSION_MESSAGES: 'get-session-messages',
  LAUNCH_RESUME: 'launch-resume',
  WATCH_PROJECT: 'watch-project',
  PROJECT_UPDATED: 'project-updated'
} as const
