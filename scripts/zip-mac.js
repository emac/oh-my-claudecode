/**
 * macOS 构建产物打包脚本
 * 将 dist/ 目录下的 .dmg 文件复制并重命名为统一格式
 * 输出文件名格式：<name>-v<version>-mac-<arch>.dmg
 * name 和 version 读取自 package.json
 *
 * electron-builder 生成的 dmg 文件名示例：
 *   Claude Code Desktop-1.2.260331-arm64.dmg
 *   Claude Code Desktop-1.2.260331.dmg  (x64)
 *
 * @author Alfie
 */

const fs = require('fs')
const path = require('path')

// ── 读取 package.json ───────────────────────────────────────
const pkgPath = path.resolve(__dirname, '../package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const { name, version } = pkg

if (!name || !version) {
  console.error('错误：package.json 缺少 name 或 version 字段')
  process.exit(1)
}

// ── 路径配置 ────────────────────────────────────────────────
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const outputDir = path.join(rootDir, 'dist-zip')

// ── 检查 dist 目录 ──────────────────────────────────────────
if (!fs.existsSync(distDir)) {
  console.error(`错误：dist 目录不存在：${distDir}`)
  console.error('请先运行 bun run dist 生成 dmg 文件')
  process.exit(1)
}

// ── 查找所有 .dmg 文件 ──────────────────────────────────────
const dmgFiles = fs.readdirSync(distDir).filter((f) => f.endsWith('.dmg'))

if (dmgFiles.length === 0) {
  console.error('错误：dist/ 目录下未找到 .dmg 文件')
  console.error('请先在 macOS 上运行 bun run dist 生成 dmg 文件')
  process.exit(1)
}

// ── 创建输出目录 ─────────────────────────────────────────────
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// ── 处理每个 dmg 文件 ────────────────────────────────────────
let successCount = 0

for (const dmgFile of dmgFiles) {
  const srcPath = path.join(distDir, dmgFile)

  // 识别架构：文件名含 arm64 则为 arm64，否则为 x64
  const arch = dmgFile.includes('arm64') ? 'arm64' : 'x64'
  const destName = `${name}-v${version}-mac-${arch}.dmg`
  const destPath = path.join(outputDir, destName)

  // 删除旧的同名文件
  if (fs.existsSync(destPath)) {
    fs.unlinkSync(destPath)
    console.log(`已删除旧文件：${destName}`)
  }

  fs.copyFileSync(srcPath, destPath)

  const stat = fs.statSync(destPath)
  const sizeMB = (stat.size / 1024 / 1024).toFixed(1)
  console.log(`✓ ${dmgFile}`)
  console.log(`  → ${destName} (${sizeMB} MB)`)
  successCount++
}

console.log(`\n共处理 ${successCount} 个 dmg 文件，输出目录：${outputDir}`)
