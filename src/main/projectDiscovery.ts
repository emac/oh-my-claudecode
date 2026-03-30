/**
 * 项目发现：扫描 ~/.claude/projects/ 目录，返回有 JSONL 文件的项目列表
 *
 * 设计约束：
 *  - 只扫描顶层 *.jsonl 文件，跳过子目录
 *  - 跳过无 *.jsonl 文件的空目录
 *  - 优先从 JSONL 中读取 cwd 字段作为真实路径（最可靠）
 *  - 降级：使用 decodeProjectPath 解码目录名
 *
 * @author Alfie
 */

import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { decodeProjectPath } from './pathDecoder'
import { getCwdFromJsonl } from './sessionReader'

export interface ProjectInfo {
  /** 编码后的目录名，如 "C--Users-bin-shen-Workspace" */
  encodedName: string
  /** ~/.claude/projects/<encodedName> 目录的完整路径 */
  projectsDir: string
  /** 真实路径（从 JSONL cwd 字段读取，或 decodeProjectPath 降级） */
  realPath: string
  /** 该项目下的 JSONL 文件数量（=session 数量） */
  sessionCount: number
}

/**
 * 扫描 ~/.claude/projects/ 目录，发现所有有效项目
 * @returns 项目列表，按最后活跃时间倒序排列
 */
export function discoverProjects(): ProjectInfo[] {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects')

  let entries: string[]
  try {
    entries = readdirSync(claudeProjectsDir)
  } catch {
    // 目录不存在（全新安装）：返回空列表
    return []
  }

  const projects: ProjectInfo[] = []

  for (const encodedName of entries) {
    const projectsDir = join(claudeProjectsDir, encodedName)

    // 跳过非目录条目
    try {
      if (!statSync(projectsDir).isDirectory()) continue
    } catch {
      continue
    }

    // 找顶层 *.jsonl 文件（跳过子目录）
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
      continue
    }

    // 跳过无 JSONL 的空目录
    if (jsonlFiles.length === 0) continue

    // 优先从 JSONL 读取 cwd，降级使用 decodeProjectPath
    const firstJsonl = join(projectsDir, jsonlFiles[0])
    const cwdFromJsonl = getCwdFromJsonl(firstJsonl)
    const realPath = cwdFromJsonl ?? decodeProjectPath(encodedName) ?? encodedName

    projects.push({
      encodedName,
      projectsDir,
      realPath,
      sessionCount: jsonlFiles.length
    })
  }

  return projects
}
