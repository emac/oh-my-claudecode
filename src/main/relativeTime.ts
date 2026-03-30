/**
 * 相对时间工具：将 Unix 时间戳转换为用户友好的相对描述
 * @author Alfie
 */

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * 将时间戳转换为相对时间字符串
 * @param timestamp - Unix 时间戳（毫秒）
 * @returns 如 "just now"、"5 minutes ago"、"2 hours ago"、"yesterday"、"3 days ago"
 */
export function parseRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  // 时钟漂移或未来时间：降级为 "just now"
  if (diff < 0) {
    return 'just now'
  }

  if (diff < MINUTE) {
    return 'just now'
  }

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE)
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }

  if (diff < 2 * DAY) {
    return 'yesterday'
  }

  const days = Math.floor(diff / DAY)
  return `${days} days ago`
}
