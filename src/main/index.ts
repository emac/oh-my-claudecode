/**
 * Electron 主进程入口
 * @author Alfie
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from './types'
import { discoverProjects } from './projectDiscovery'
import { getSessions, getSessionMessages } from './sessionReader'
import { launchResume, launchNew } from './sessionLauncher'
import { watchProject, closeAllWatchers } from './sessionWatcher'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Claude Code Desktop — Session Control',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.claude-code-desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await closeAllWatchers()
  if (process.platform !== 'darwin') app.quit()
})

// ---- IPC Handlers ----

function registerIpcHandlers(): void {
  /** 获取所有已发现项目 */
  ipcMain.handle('get-projects', async () => {
    return discoverProjects()
  })

  /** 获取指定项目的所有 session 元数据 */
  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, async (_event, projectsDir: string, realPath: string) => {
    return getSessions(projectsDir, realPath)
  })

  /** 获取指定 session 的完整对话消息 */
  ipcMain.handle(
    IPC_CHANNELS.GET_SESSION_MESSAGES,
    async (_event, sessionId: string, projectsDir: string) => {
      return getSessionMessages(sessionId, projectsDir)
    }
  )

  /** 在外部终端启动 claude --resume */
  ipcMain.handle(IPC_CHANNELS.LAUNCH_RESUME, async (_event, sessionId: string, projectPath: string) => {
    await launchResume(sessionId, projectPath)
  })

  /** 在外部终端启动 claude（新 session） */
  ipcMain.handle(IPC_CHANNELS.LAUNCH_NEW, async (_event, projectPath: string) => {
    await launchNew(projectPath)
  })

  /** 开始监听项目目录 */
  ipcMain.handle(IPC_CHANNELS.WATCH_PROJECT, async (_event, projectsDir: string) => {
    if (mainWindow) {
      watchProject(projectsDir, mainWindow)
    }
  })
}
