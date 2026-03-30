# Claude Code Desktop — 用户手册

> 一款用于管理和回顾 Claude Code 会话记录的桌面工具。

---

## 界面概览

![全局概览](docs/screenshots/1.png)

应用采用三栏布局：

| 栏位 | 内容 |
|------|------|
| **Projects**（左） | 自动发现 `~/.claude/projects/` 下的所有项目 |
| **Sessions**（中） | 当前项目的所有会话，按时间倒序排列 |
| **Session Chat History**（右） | 选中会话的完整对话记录 |

---

## 核心功能

### 1. 浏览项目与会话

- 启动后自动扫描 `~/.claude/projects/`，无需手动配置
- 左栏点击项目，中栏立即显示该项目下的所有会话
- 每张会话卡片显示：**标题**、**最后活跃时间**、**消息数量**
- 文件变更时自动刷新（基于 chokidar 文件监听）

### 2. 恢复会话

点击会话卡片右侧的 **Resume** 按钮，自动在 Windows Terminal 中打开新标签页并执行：

```
claude --resume <session-id>
```

> 若系统未安装 Windows Terminal，降级为 `cmd.exe` 窗口。

### 3. 查看对话记录

![对话记录](docs/screenshots/3.png)

- 点击任意会话卡片，右栏即加载完整对话
- **YOU**（蓝色气泡，右对齐）：用户消息
- **CLAUDE**（灰色气泡，左对齐）：Claude 回复
- 长消息默认折叠 4 行，点击 **↓ Expand** 展开完整内容，再点 **↑ Collapse** 收起

### 4. 调整栏位宽度

**拖拽调整：**
- 鼠标悬停在两个分隔条上，光标变为 `↔`，按住拖动即可自由调整宽度

**一键收缩 / 展开：**

![收缩状态](docs/screenshots/2.png)

- 直接**点击分隔条**切换收缩/展开
- Projects 收缩后显示项目名首字母缩写（最多 3 个字符，如 `GAD`、`WOR`）
- Sessions 收缩后显示序号标签（`Session#1`、`Session#2`…）
- 展开时自动恢复收缩前的宽度

### 5. 切换主题

点击右上角 **☀ Light / ☾ Dark** 按钮，在深色和浅色主题之间切换，默认使用深色主题。

---

## 快速上手

1. 运行 `Claude Code Desktop.exe`
2. 左栏自动列出所有 Claude Code 项目
3. 点击项目 → 中栏显示会话列表
4. 点击会话卡片 → 右栏显示对话历史
5. 需要继续某个会话？点击 **Resume**

---

## 系统要求

- **操作系统**：Windows 10 / 11
- **依赖**：已安装 [Claude Code CLI](https://docs.anthropic.com/claude-code)（`claude` 命令可用）
- **会话数据路径**：`%USERPROFILE%\.claude\projects\`

---

*Claude Code Desktop v1.0.260330*
