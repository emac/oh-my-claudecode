/**
 * Session Launcher：打开外部终端执行 claude --resume <sessionId>
 *
 * 启动策略（按平台分支）：
 *
 * Windows：
 *  1. 优先 Windows Terminal (wt.exe)
 *  2. 降级到 cmd /k
 *
 * macOS：
 *  1. 优先 iTerm2（检测是否安装）
 *  2. 降级到系统 Terminal.app
 *
 * 前置验证：
 *  - projectPath 必须存在
 *  - sessionId 必须非空
 *
 * @author Alfie
 */

import { spawn, execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { dialog } from 'electron'

/**
 * 在外部终端中启动 claude --resume <sessionId>
 *
 * @param sessionId - 要恢复的 session UUID
 * @param projectPath - 项目真实路径（终端工作目录）
 */
export async function launchResume(sessionId: string, projectPath: string): Promise<void> {
  // 前置校验
  if (!sessionId || !sessionId.trim()) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Cannot Resume',
      message: 'Session ID is missing or invalid.',
      buttons: ['OK']
    })
    return
  }

  if (!projectPath || !projectPath.trim()) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Cannot Resume',
      message: 'Project path is missing.',
      buttons: ['OK']
    })
    return
  }

  if (!existsSync(projectPath)) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Cannot Resume',
      message: `Project directory not found:\n${projectPath}\n\nThe directory may have been moved or deleted.`,
      buttons: ['OK']
    })
    return
  }

  // 按平台选择启动策略
  let launched = false
  if (process.platform === 'darwin') {
    launched = tryITerm2(sessionId, projectPath) || tryTerminalApp(sessionId, projectPath)
  } else {
    launched = tryWindowsTerminal(sessionId, projectPath) || tryCmd(sessionId, projectPath)
  }

  if (!launched) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Cannot Resume',
      message: 'Could not launch a terminal. Please open a terminal manually and run:\n\n' +
        `claude --resume ${sessionId}`,
      buttons: ['OK']
    })
  }
}

// ── Windows ──────────────────────────────────────────────

/** 尝试通过 Windows Terminal 启动 */
function tryWindowsTerminal(sessionId: string, projectPath: string): boolean {
  try {
    const child = spawn(
      'wt.exe',
      ['-d', projectPath, '--', 'cmd', '/k', `claude --resume ${sessionId}`],
      { detached: true, stdio: 'ignore', shell: false }
    )
    child.unref()
    return true
  } catch {
    return false
  }
}

/** 降级：通过 cmd /k 启动 */
function tryCmd(sessionId: string, projectPath: string): boolean {
  try {
    const child = spawn(
      'cmd.exe',
      ['/k', `cd /d "${projectPath}" && claude --resume ${sessionId}`],
      { detached: true, stdio: 'ignore', shell: false }
    )
    child.unref()
    return true
  } catch {
    return false
  }
}

// ── macOS ─────────────────────────────────────────────────

/**
 * 检测 iTerm2 是否已安装
 * 通过 mdfind 查询 bundle ID，找到则返回 app 路径
 */
function findITerm2(): string | null {
  try {
    const result = execFileSync(
      'mdfind',
      ['kMDItemCFBundleIdentifier == "com.googlecode.iterm2"'],
      { timeout: 2000, encoding: 'utf8' }
    ).trim()
    const first = result.split('\n')[0]
    return first || null
  } catch {
    return null
  }
}

/**
 * 尝试通过 iTerm2 启动终端
 * 使用 AppleScript 在新窗口中打开并执行命令
 */
function tryITerm2(sessionId: string, projectPath: string): boolean {
  const iTermPath = findITerm2()
  if (!iTermPath) return false

  try {
    // 转义路径中的特殊字符，防止 AppleScript 注入
    const safePath = projectPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const safeId = sessionId.replace(/"/g, '\\"')
    const script = `
      tell application "iTerm2"
        activate
        create window with default profile
        tell current session of current window
          write text "cd \\"${safePath}\\" && claude --resume ${safeId}"
        end tell
      end tell
    `
    execFileSync('osascript', ['-e', script], { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * 降级：通过系统 Terminal.app 启动
 * 使用 AppleScript 打开新窗口并执行命令
 */
function tryTerminalApp(sessionId: string, projectPath: string): boolean {
  try {
    const safePath = projectPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const safeId = sessionId.replace(/"/g, '\\"')
    const script = `
      tell application "Terminal"
        activate
        do script "cd \\"${safePath}\\" && claude --resume ${safeId}"
      end tell
    `
    execFileSync('osascript', ['-e', script], { timeout: 5000 })
    return true
  } catch {
    return false
  }
}
