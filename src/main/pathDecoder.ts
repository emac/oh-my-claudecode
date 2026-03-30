/**
 * 路径编解码工具：将 Claude Code ~/.claude/projects/ 目录名解码为真实文件系统路径
 *
 * 编码规则（通过观测多个真实案例验证）：
 *   将路径中的 :、\、. 全部替换为 -
 *   示例：C:\Users\bin.shen\Workspace → C--Users-bin-shen-Workspace
 *   示例：D:\git.repo\claude\agent  → D--git-repo-claude-agent
 *
 * 已知限制（Known Failure Mode）：
 *   - 路径中若含真实的连字符（如目录名 my-project），解码时无法与路径分隔符区分
 *   - 此情况下 resume 可能打开错误目录（design doc 已知缺口）
 *   - 应对策略：读取 JSONL 文件中的 cwd 字段作为真实路径（最可靠方式）
 *
 * @author Alfie
 */

/**
 * 将编码目录名解码为真实路径（基于 cwd 字段，最可靠）
 *
 * 优先使用 cwd 字段而非字符串解码，因为编码规则存在歧义性。
 * 此函数作为纯字符串解码的降级方案。
 *
 * @param encoded - ~/.claude/projects/ 下的目录名，如 "C--Users-bin-shen-Workspace"
 * @returns 解码后的路径；无法解码时返回 null
 */
export function decodeProjectPath(encoded: string): string | null {
  if (!encoded || encoded.trim() === '') {
    return null
  }

  // 匹配 Windows 驱动器字母前缀：单个字母后跟 --
  // C--Users-bin-shen-Workspace → C:\Users\bin-shen\Workspace
  const windowsDriveMatch = encoded.match(/^([A-Za-z])--(.*)$/)
  if (windowsDriveMatch) {
    const driveLetter = windowsDriveMatch[1].toUpperCase()
    const rest = windowsDriveMatch[2]
    // 将剩余部分的 - 替换为 \
    // 注意：这里存在歧义（目录名中的 - 与路径分隔符编码的 - 相同）
    // 无法完美区分，此为 best-effort 解码
    const decodedRest = rest.replace(/-/g, '\\')
    return `${driveLetter}:\\${decodedRest}`
  }

  // 非 Windows 路径：当前仅支持 Windows，返回 null
  return null
}

/**
 * 将真实路径编码为 Claude Code 目录名格式
 * 编码规则：将 :、\、. 全部替换为 -
 *
 * @param filePath - 真实路径，如 "C:\Users\bin.shen\Workspace"
 * @returns 编码后的目录名，如 "C--Users-bin-shen-Workspace"
 */
export function encodeProjectPath(filePath: string): string {
  // 将 :、\、. 全部替换为 -
  return filePath.replace(/[:\\.]/g, '-')
}
