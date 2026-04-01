/**
 * Windows 便携包打包脚本
 * 将 dist/win-unpacked/ 目录打包为 ZIP 文件
 * 输出文件名格式：<name>-v<version>-win.zip
 * name 和 version 读取自 package.json
 *
 * 构建流程：
 *   1. bun run pack   → 生成 dist/win-unpacked/（不触发代码签名，无需管理员权限）
 *   2. bun run zip:win → 将 win-unpacked/ 打包为 ZIP
 *
 * @author Alfie
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

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
const sourceDir = path.join(rootDir, 'dist', 'win-unpacked')
const outputDir = path.join(rootDir, 'dist-zip')
const zipName = `${name}-v${version}-win.zip`
const zipPath = path.join(outputDir, zipName)

// ── 检查源目录 ───────────────────────────────────────────────
if (!fs.existsSync(sourceDir)) {
  console.error(`错误：源目录不存在：${sourceDir}`)
  console.error('请先运行 bun run pack 生成 dist/win-unpacked/')
  process.exit(1)
}

// ── 创建输出目录 ─────────────────────────────────────────────
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// ── 删除旧的同名 ZIP ─────────────────────────────────────────
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath)
  console.log(`已删除旧文件：${zipName}`)
}

console.log(`正在打包：${sourceDir}`)
console.log(`输出到：${zipPath}`)

// ── 写入临时 PowerShell 脚本（避免多行内联问题） ──────────────
// 使用项目 dist-zip 目录，避免 os.tmpdir() 短路径名格式问题
const tmpScript = path.join(outputDir, 'ccd-zip.ps1')

const psContent = [
  `$source = '${sourceDir.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`,
  `$output = '${zipPath.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`,
  `Compress-Archive -Path "$source\\*" -DestinationPath $output -Force`,
].join('\r\n')

fs.writeFileSync(tmpScript, psContent, 'utf-8')

try {
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpScript}"`, {
    stdio: 'inherit',
    encoding: 'utf-8'
  })

  fs.unlinkSync(tmpScript)

  const stat = fs.statSync(zipPath)
  const sizeMB = (stat.size / 1024 / 1024).toFixed(1)
  console.log(`\n✓ 打包成功：${zipName} (${sizeMB} MB)`)
  console.log(`  路径：${zipPath}`)
} catch (err) {
  if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript)
  console.error('打包失败：', err.message)
  process.exit(1)
}
