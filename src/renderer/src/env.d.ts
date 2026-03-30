/**
 * 渲染进程全局类型声明
 * @author Alfie
 */

import type { SessionMetadata, Message } from '../../main/types'
import type { ProjectInfo } from '../../main/projectDiscovery'

export interface ElectronAPI {
  getProjects: () => Promise<ProjectInfo[]>
  getSessions: (projectsDir: string, realPath: string) => Promise<SessionMetadata[]>
  getSessionMessages: (sessionId: string, projectsDir: string) => Promise<Message[]>
  launchResume: (sessionId: string, projectPath: string) => Promise<void>
  watchProject: (projectsDir: string) => Promise<void>
  onProjectUpdated: (callback: (data: { projectsDir: string }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
