# Claude Code Desktop

**English** | [中文](#中文)

A desktop app to browse, review, and resume your Claude Code sessions.

---

## Screenshots

![Overview](docs/screenshots/main.png)

---

## Features

- **Auto-discovery** — scans `~/.claude/projects/` on startup, no configuration needed
- **Three-panel layout** — Projects / Sessions / Chat History, all resizable
- **Resume sessions** — one click to reopen a session in your terminal (`claude --resume`)
- **New & delete sessions** — start a new session in the terminal, or delete an existing one with confirmation
- **Open project folder** — click the folder icon next to any project to open it in Explorer / Finder
- **Search & sort** — search sessions by title or full chat history content; sort by newest or oldest first; press **Ctrl+F** to focus the search bar
- **Keyword highlight & navigation** — matched keywords are highlighted across session titles and chat messages; use **↑ / ↓** arrows in the Chat History header to jump between matches
- **Collapsible panels** — click any divider to collapse/expand; collapsed panels show initials or `Session#N`
- **Message expand** — long messages are folded to 4 lines by default; click **↓ Expand** to read in full
- **Dark / Light theme** — toggle in the top-right corner, defaults to dark

---

## Quick Start

1. Run `Claude Code Desktop.exe` (Windows) or open the `.app` (macOS)
2. Projects appear automatically in the left panel
3. Click a project → sessions load in the middle panel
4. Click a session card → full chat history loads on the right
5. Want to continue a session? Click **Resume**

---

## Layout

| Panel | Content |
|-------|---------|
| **Projects** (left) | All projects discovered under `~/.claude/projects/` |
| **Sessions** (middle) | Sessions for the selected project, newest first |
| **Session Chat History** (right) | Full conversation for the selected session |

**Browse projects & sessions**
- Launches and scans automatically — no setup required
- Each session card shows title, last active time, and message count
- Refreshes automatically when session files change
- Click the 📁 icon next to a project name to open its folder in Explorer (Windows) or Finder (macOS)

**Create & delete sessions**
- Click **+ New** to start a new Claude Code session in the project directory
- Click the 🗑 icon on a session card to delete it; a confirmation dialog appears before the file is removed

**Search & sort sessions**
- Press **Ctrl+F** or click the search bar to search; triggers after 2 characters
- Searches session titles first; if no title matches, click **Continue searching in chat history?** to search full message content
- Click **✕** to reset search, or switch projects to clear automatically
- Click **↓ / ↑** to toggle sort between newest-first and oldest-first

**Resume a session**

- Click **Resume** on any session card to run `claude --resume <session-id>` in a terminal
- Windows: prefers Windows Terminal, falls back to cmd
- macOS: prefers iTerm2, falls back to Terminal.app

**View chat history**

- **YOU** (blue bubble, right-aligned): your messages
- **CLAUDE** (grey bubble, left-aligned): Claude's replies
- Long messages fold to 4 lines; click **↓ Expand** to read in full, **↑ Collapse** to fold back
- When a keyword is active, matched messages are highlighted; the current match is highlighted in orange, others in yellow
- Use **↑ / ↓** buttons in the Chat History header to navigate between matches (cyclic); the counter shows current position (e.g. `2 / 5`)

**Resize panels**

- Drag any divider to resize freely
- Click a divider to collapse/expand the panel to its left; restores previous width on expand
- Collapsed Projects shows up to 3-character initials (e.g. `GAD`)
- Collapsed Sessions shows index labels (`Session#1`, `Session#2` …)

**Switch theme**
- Click **☀ Light / ☾ Dark** in the top-right corner; defaults to dark

---

## Requirements

| | Windows | macOS |
|-|---------|-------|
| OS | Windows 10 / 11 | macOS 12+ |
| Terminal | Windows Terminal or cmd | iTerm2 or Terminal.app |
| Data path | `%USERPROFILE%\.claude\projects\` | `~/.claude/projects/` |

Requires [Claude Code CLI](https://docs.anthropic.com/claude-code) (`claude` command available in PATH).

---

## Build

```bash
# Install dependencies
bun install

# Development
bun run dev

# Production build
bun run build

# Package (run on the target platform)
bun run dist
```

macOS packaging requires `resources/icon.icns`. Convert from PNG using `iconutil` or an online tool.

---

*Claude Code Desktop v1.0.260330*

---
---

## 中文

一款用于浏览、回顾和恢复 Claude Code 会话的桌面工具。

---

## 截图

![界面概览](docs/screenshots/main.png)

---

## 功能特性

- **自动发现** — 启动后自动扫描 `~/.claude/projects/`，无需手动配置
- **三栏布局** — Projects / Sessions / Chat History，宽度可自由调整
- **恢复会话** — 一键在终端中执行 `claude --resume`
- **新建与删除会话** — 在项目目录启动新会话，或带确认弹窗删除已有会话
- **打开项目目录** — 点击项目名旁的文件夹图标，直接用资源管理器 / Finder 打开对应目录
- **搜索与排序** — 按标题或完整对话内容搜索会话；支持时间升/降序排列；按 **Ctrl+F** 快速激活搜索栏
- **关键词高亮与导航** — 匹配关键词在会话标题和对话消息中同步高亮；Chat History 头部提供 **↑ / ↓** 箭头，可在匹配消息间逐条跳转
- **栏位收缩** — 点击分隔条收缩/展开，收缩后显示首字母缩写或 `Session#N`
- **消息展开** — 长消息默认折叠 4 行，点击 **↓ Expand** 查看完整内容
- **深色/浅色主题** — 右上角一键切换，默认深色

---

## 快速上手

1. 运行 `Claude Code Desktop.exe`（Windows）或打开 `.app`（macOS）
2. 左栏自动列出所有 Claude Code 项目
3. 点击项目 → 中栏显示会话列表
4. 点击会话卡片 → 右栏显示对话历史
5. 点击 **Resume** 继续某个会话

---

## 界面说明

| 栏位 | 内容 |
|------|------|
| **Projects**（左） | 自动发现 `~/.claude/projects/` 下的所有项目 |
| **Sessions**（中） | 当前项目的所有会话，按时间倒序排列 |
| **Session Chat History**（右） | 选中会话的完整对话记录 |

**浏览项目与会话**
- 启动后自动扫描，无需手动配置
- 每张会话卡片显示标题、最后活跃时间、消息数量
- 文件变更时自动刷新
- 点击项目名旁的 📁 图标，可用资源管理器（Windows）或 Finder（macOS）打开项目目录

**新建与删除会话**
- 点击 **+ New** 在当前项目目录启动新的 Claude Code 会话
- 点击会话卡片上的 🗑 图标删除会话，删除前弹窗确认，确认后移除对应 JSONL 文件

**搜索与排序会话**
- 按 **Ctrl+F** 或点击搜索栏开始搜索，输入 2 个字符后触发
- 优先匹配标题；无标题结果时点击 **Continue searching in chat history?** 搜索完整消息内容
- 点击 **✕** 重置搜索，切换项目时自动清空
- 点击 **↓ / ↑** 在"最新优先"与"最旧优先"之间切换排序

**恢复会话**
- 点击 **Resume** 按钮，自动在终端中执行 `claude --resume <session-id>`
- Windows：优先 Windows Terminal，降级到 cmd
- macOS：优先 iTerm2，降级到 Terminal.app

**查看对话记录**

- **YOU**（蓝色气泡，右对齐）：用户消息
- **CLAUDE**（灰色气泡，左对齐）：Claude 回复
- 长消息折叠 4 行，点击 **↓ Expand** 展开，**↑ Collapse** 收起
- 关键词激活时，命中消息高亮显示：当前导航位置为橙色，其余匹配为黄色
- Chat History 头部 **↑ / ↓** 按钮可在匹配消息间循环跳转，计数器显示当前位置（如 `2 / 5`）

**调整栏位宽度**

- 拖拽分隔条自由调整宽度
- 点击分隔条一键收缩/展开，展开时恢复收缩前宽度
- Projects 收缩后显示首字母缩写（最多 3 个字符，如 `GAD`）
- Sessions 收缩后显示序号标签（`Session#1`、`Session#2`…）

**切换主题**
- 右上角 **☀ Light / ☾ Dark** 按钮，默认深色主题

---

## 系统要求

| | Windows | macOS |
|-|---------|-------|
| 操作系统 | Windows 10 / 11 | macOS 12+ |
| 终端 | Windows Terminal 或 cmd | iTerm2 或 Terminal.app |
| 数据路径 | `%USERPROFILE%\.claude\projects\` | `~/.claude/projects/` |

需要已安装 [Claude Code CLI](https://docs.anthropic.com/claude-code)（`claude` 命令在 PATH 中可用）。

---

## 构建

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 生产构建
bun run build

# 打包（在目标平台上执行）
bun run dist
```

macOS 打包需要准备 `resources/icon.icns`，可用 `iconutil` 或在线工具从 PNG 转换。

---

*Claude Code Desktop v1.3.260402*
