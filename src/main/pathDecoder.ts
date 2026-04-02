/**
 * 路径编解码工具：将 Claude Code ~/.claude/projects/ 目录名解码为真实文件系统路径
 *
 * 编码规则（通过观测多个真实案例验证）：
 *   将路径中的 :、\、/ 和 . 全部替换为 -
 *   示例：C:\Users\bin.shen\Workspace → C--Users-bin-shen-Workspace
 *   示例：D:\git.repo\claude\agent  → D--git-repo-claude-agent
 *
 * 已知限制（Known Failure Mode）：
 *   - 路径中若含真实的连字符（如目录名 my-project）或点（如 bin.shen），
 *     解码时无法与路径分隔符区分，纯字符串替换会得到错误路径
 *   - 对策：优先读取 JSONL cwd 字段；降级时逐层对磁盘验证，找到真实存在的路径
 *
 * @author Alfie
 */

import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * 将编码目录名解码为真实路径。
 *
 * 算法（逐层磁盘验证）：
 *  1. 识别 Windows 驱动器前缀（如 C--）
 *  2. 将剩余 token 序列按 `-` 切分
 *  3. 从根目录开始，对每一层枚举当前目录的真实子目录名，
 *     找到编码后与 token 片段匹配的实际目录，逐层推进
 *  4. 当多个 token 可合并为一个含 `-` 或 `.` 的目录名时，优先匹配更长的名称
 *  5. 所有 token 消耗完后返回路径；中途无法匹配则返回 null
 *
 * @param encoded - ~/.claude/projects/ 下的目录名，如 "C--Users-bin-shen-Workspace"
 * @returns 解码后的真实路径；无法解码或磁盘验证失败时返回 null
 * @author Alfie
 */
export function decodeProjectPath(encoded: string): string | null {
  if (!encoded || encoded.trim() === '') return null

  // ── Step 1：识别 Windows 驱动器前缀 ─────────────────────────
  const windowsDriveMatch = encoded.match(/^([A-Za-z])--(.*)$/)
  if (!windowsDriveMatch) return null  // 目前仅支持 Windows 路径

  const driveLetter = windowsDriveMatch[1].toUpperCase()
  const rest = windowsDriveMatch[2]
  const root = `${driveLetter}:\\`

  if (!existsSync(root)) return null

  // ── Step 2：切分 token 序列 ──────────────────────────────────
  // 编码后每一段原始目录名中的 :、\、/ 和 . 均被替换为 -
  // 所以用 - 切分可得到「可能是目录名片段」的 token 列表
  const tokens = rest.split('-').filter(Boolean)
  if (tokens.length === 0) return root.slice(0, -1) // 仅驱动器

  // ── Step 3：逐层磁盘验证 ─────────────────────────────────────
  return resolveTokens(root.slice(0, -1), tokens)
}

/**
 * 递归消耗 tokens，在 currentPath 下逐层寻找匹配的真实子目录。
 * 尝试将 tokens[0..k]（k 从大到小）拼接成候选目录名，对磁盘验证后递归。
 *
 * @param currentPath - 当前已确认存在的路径
 * @param tokens - 剩余待消耗的 token 列表
 * @returns 完整真实路径，或 null
 * @author Alfie
 */
function resolveTokens(currentPath: string, tokens: string[]): string | null {
  if (tokens.length === 0) return currentPath

  // 枚举当前目录下的真实子目录
  let children: string[]
  try {
    children = readdirSync(currentPath).filter((entry) => {
      try { return statSync(join(currentPath, entry)).isDirectory() } catch { return false }
    })
  } catch {
    return null
  }

  // 从最长到最短的 token 合并方案（贪心，优先匹配更长的目录名）
  for (let k = tokens.length; k >= 1; k--) {
    const candidates = buildCandidates(tokens.slice(0, k))

    // 在真实子目录中寻找编码后匹配的项（大小写不敏感）
    const match = children.find((child) => {
      const childEncoded = encodeSegment(child)
      return candidates.some((c) => encodeSegment(c) === childEncoded)
    })

    if (match) {
      const result = resolveTokens(join(currentPath, match), tokens.slice(k))
      if (result !== null) return result
    }
  }

  return null
}

/**
 * 给定 k 个 tokens，生成所有可能的目录名候选（用 -、. 或直接拼接组合）。
 * 例如 ['bin', 'shen'] → ['bin-shen', 'bin.shen', 'binshen']
 *
 * @param tokens - token 片段列表
 * @returns 候选目录名列表（去重）
 * @author Alfie
 */
function buildCandidates(tokens: string[]): string[] {
  if (tokens.length === 1) return [tokens[0]]

  const separators = ['-', '.', '_', '']
  const results = new Set<string>()

  // 递归生成所有分隔符组合
  function build(idx: number, current: string): void {
    if (idx === tokens.length) {
      results.add(current)
      return
    }
    for (const sep of separators) {
      build(idx + 1, current + sep + tokens[idx])
    }
  }

  build(1, tokens[0])
  return Array.from(results)
}

/**
 * 将目录名编码（与 Claude Code 编码规则一致）用于比较
 * @author Alfie
 */
function encodeSegment(name: string): string {
  return name.replace(/[:\\/. ]/g, '-').toLowerCase()
}

/**
 * 将真实路径编码为 Claude Code 目录名格式
 * 编码规则：将 :、\、/ 和 . 全部替换为 -
 *
 * @param filePath - 真实路径，如 "C:\Users\bin.shen\Workspace"
 * @returns 编码后的目录名，如 "C--Users-bin-shen-Workspace"
 */
export function encodeProjectPath(filePath: string): string {
  return filePath.replace(/[:\\/. ]/g, '-')
}
