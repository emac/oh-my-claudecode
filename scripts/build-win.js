/**
 * Windows 一键构建脚本
 * 执行流程：
 *   1. electron-vite build（编译 TypeScript / React）
 *   2. electron-builder --dir（生成 dist/win-unpacked/，忽略 winCodeSign 符号链接错误）
 *   3. 验证 win-unpacked 产物存在
 *   4. 调用 zip-win.js 打包为 ZIP
 *
 * 背景：electron-builder 在无管理员权限 / 未开启开发者模式的 Windows 上
 * 会因无法创建符号链接而报错退出，但 win-unpacked 目录已正确生成。
 * 本脚本检查产物存在性，将符号链接错误视为可忽略的警告。
 *
 * @author Alfie
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const winUnpacked = path.join(rootDir, 'dist', 'win-unpacked', 'Claude Code Desktop.exe')
const winCodeSignCache = path.join(
  process.env['USERPROFILE'] || process.env['HOME'] || '',
  'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign'
)

/** 运行命令，返回退出码 */
function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: rootDir })
  return result.status ?? 1
}

// ── Step 1：编译源码 ─────────────────────────────────────────
const buildCode = run('bun', ['run', 'build'])
if (buildCode !== 0) {
  console.error('\n✗ electron-vite build 失败，终止')
  process.exit(buildCode)
}

// ── Step 2：生成 win-unpacked（忽略 winCodeSign 符号链接错误） ──
const packCode = run('bun', ['run', 'pack'])

// packCode 非零时，检查产物是否实际生成
if (packCode !== 0) {
  if (!fs.existsSync(winUnpacked)) {
    console.error('\n✗ electron-builder --dir 失败且未生成产物，终止')
    process.exit(packCode)
  }
  console.warn('\n⚠ electron-builder 返回非零退出码（winCodeSign 符号链接错误，可忽略）')
  console.warn('  产物已正常生成，继续打包...')
}

// ── Step 3：打包为 ZIP ───────────────────────────────────────
const zipCode = run('node', ['scripts/zip-win.js'])
if (zipCode !== 0) {
  console.error('\n✗ zip-win.js 打包失败')
  process.exit(zipCode)
}

// ── Step 4：清空 winCodeSign 缓存目录 ────────────────────────
console.log('\n> 清空 winCodeSign 缓存...')
if (!fs.existsSync(winCodeSignCache)) {
  console.log('  缓存目录不存在，跳过')
} else {
  const entries = fs.readdirSync(winCodeSignCache)
  for (const entry of entries) {
    const entryPath = path.join(winCodeSignCache, entry)
    fs.rmSync(entryPath, { recursive: true, force: true })
  }
  console.log(`  已清空 ${entries.length} 个条目：${winCodeSignCache}`)
}

console.log('\n✓ build:win 完成')
