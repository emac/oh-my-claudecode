/**
 * chokidar 文件监听器：监听 ~/.claude/projects/<encodedName>/ 目录变更
 * debounce 500ms，变更时仅重读变更文件
 *
 * @author Alfie
 */

import chokidar, { FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { invalidateCache } from './sessionReader'
import { IPC_CHANNELS } from './types'

/** 活跃的 watcher 实例：projectsDir → FSWatcher */
const watchers = new Map<string, FSWatcher>()

/** debounce 计时器：jsonlPath → NodeJS.Timeout */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

const DEBOUNCE_MS = 500

/**
 * 开始监听指定项目目录的 JSONL 文件变更
 * 变更时通过 IPC 推送 project-updated 事件到渲染进程
 *
 * @param projectsDir - ~/.claude/projects/<encodedName> 完整路径
 * @param win - Electron BrowserWindow 实例（推送事件用）
 */
export function watchProject(projectsDir: string, win: BrowserWindow): void {
  // 若已在监听，直接返回
  if (watchers.has(projectsDir)) return

  const watcher = chokidar.watch(`${projectsDir}/*.jsonl`, {
    persistent: true,
    ignoreInitial: true,
    depth: 0 // 只监听顶层，跳过子目录
  })

  watcher.on('add', (filePath) => handleChange(filePath, projectsDir, win))
  watcher.on('change', (filePath) => handleChange(filePath, projectsDir, win))
  watcher.on('unlink', (filePath) => handleChange(filePath, projectsDir, win))

  watchers.set(projectsDir, watcher)
}

/**
 * 停止监听指定项目目录
 * @param projectsDir - 要停止监听的目录路径
 */
export async function unwatchProject(projectsDir: string): Promise<void> {
  const watcher = watchers.get(projectsDir)
  if (watcher) {
    await watcher.close()
    watchers.delete(projectsDir)
  }
}

/**
 * 关闭所有 watcher（应用退出时调用）
 */
export async function closeAllWatchers(): Promise<void> {
  const closePromises = Array.from(watchers.values()).map((w) => w.close())
  await Promise.all(closePromises)
  watchers.clear()
  debounceTimers.forEach((t) => clearTimeout(t))
  debounceTimers.clear()
}

// ---- 内部工具 ----

function handleChange(filePath: string, projectsDir: string, win: BrowserWindow): void {
  // 清除旧的 debounce 计时器
  const existing = debounceTimers.get(filePath)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    debounceTimers.delete(filePath)
    // 使该文件的缓存失效
    invalidateCache(filePath)
    // 推送事件到渲染进程
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.PROJECT_UPDATED, { projectsDir })
    }
  }, DEBOUNCE_MS)

  debounceTimers.set(filePath, timer)
}
