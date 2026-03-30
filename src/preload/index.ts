/**
 * Electron preload 脚本：通过 contextBridge 暴露安全的 IPC API 给渲染进程
 * @author Alfie
 */

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../main/types'
import type { SessionMetadata, Message } from '../main/types'
import type { ProjectInfo } from '../main/projectDiscovery'

/** 暴露给渲染进程的 API */
export interface ElectronAPI {
  getProjects: () => Promise<ProjectInfo[]>
  getSessions: (projectsDir: string, realPath: string) => Promise<SessionMetadata[]>
  getSessionMessages: (sessionId: string, projectsDir: string) => Promise<Message[]>
  launchResume: (sessionId: string, projectPath: string) => Promise<void>
  watchProject: (projectsDir: string) => Promise<void>
  onProjectUpdated: (callback: (data: { projectsDir: string }) => void) => () => void
}

const api: ElectronAPI = {
  getProjects: () => ipcRenderer.invoke('get-projects'),

  getSessions: (projectsDir, realPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SESSIONS, projectsDir, realPath),

  getSessionMessages: (sessionId, projectsDir) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_MESSAGES, sessionId, projectsDir),

  launchResume: (sessionId, projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_RESUME, sessionId, projectPath),

  watchProject: (projectsDir) =>
    ipcRenderer.invoke(IPC_CHANNELS.WATCH_PROJECT, projectsDir),

  onProjectUpdated: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { projectsDir: string }): void =>
      callback(data)
    ipcRenderer.on(IPC_CHANNELS.PROJECT_UPDATED, handler)
    // 返回取消订阅函数
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROJECT_UPDATED, handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
