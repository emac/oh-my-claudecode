/**
 * 单元测试：decodeProjectPath / encodeProjectPath
 * 基于真实观测验证的编码规则：[:\.] 全部替换为 -
 * @author Alfie
 */
import { describe, it, expect } from 'vitest'
import { decodeProjectPath, encodeProjectPath } from '../pathDecoder'

describe('encodeProjectPath（真实编码规则验证）', () => {
  it('C:\\Users\\bin.shen\\Workspace 编码正确', () => {
    // 观测值：C--Users-bin-shen-Workspace
    expect(encodeProjectPath('C:\\Users\\bin.shen\\Workspace')).toBe('C--Users-bin-shen-Workspace')
  })

  it('C:\\Users\\bin.shen\\Workspace\\claude-code-desktop 编码正确', () => {
    expect(encodeProjectPath('C:\\Users\\bin.shen\\Workspace\\claude-code-desktop')).toBe(
      'C--Users-bin-shen-Workspace-claude-code-desktop'
    )
  })

  it('D:\\git.repo\\claude\\gitlab-agent 编码正确', () => {
    // 观测值：D--git-repo-claude-gitlab-agent
    expect(encodeProjectPath('D:\\git.repo\\claude\\gitlab-agent')).toBe(
      'D--git-repo-claude-gitlab-agent'
    )
  })
})

describe('decodeProjectPath', () => {
  it('解码标准 Windows 驱动器路径', () => {
    // C--Users-bin-shen-Workspace → C:\Users-bin-shen-Workspace（best-effort，- 变 \）
    const result = decodeProjectPath('C--Users-bin-shen-Workspace')
    expect(result).not.toBeNull()
    expect(result).toMatch(/^C:\\/)
  })

  it('小写驱动器字母转为大写', () => {
    const result = decodeProjectPath('d--git-repo-project')
    expect(result).not.toBeNull()
    expect(result).toMatch(/^D:\\/)
  })

  it('空字符串返回 null', () => {
    expect(decodeProjectPath('')).toBeNull()
  })

  it('只有空格返回 null', () => {
    expect(decodeProjectPath('   ')).toBeNull()
  })

  it('非 Windows 路径（无驱动器字母前缀）返回 null', () => {
    expect(decodeProjectPath('home-user-project')).toBeNull()
  })

  it('解码结果以驱动器字母:\\开头', () => {
    const result = decodeProjectPath('C--Users-bin-shen-Workspace-claude-code-desktop')
    expect(result).not.toBeNull()
    expect(result!.startsWith('C:\\')).toBe(true)
  })
})

describe('encodeProjectPath 幂等性', () => {
  it('两次编码结果一致', () => {
    const path = 'C:\\Users\\bin.shen\\Workspace'
    expect(encodeProjectPath(path)).toBe(encodeProjectPath(path))
  })
})
