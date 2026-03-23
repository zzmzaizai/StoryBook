#!/usr/bin/env pwsh
# StoryBook 本地构建脚本（Windows）
# 用法:
#   .\build.ps1            — 构建 Windows 安装包（默认）
#   .\build.ps1 -Debug     — Debug 构建（快，不打包）
#   .\build.ps1 -Clean     — 清理 Rust 编译缓存后构建

param(
    [switch]$Debug,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
    Write-Host "`n▶ $msg" -ForegroundColor Cyan
}
function Write-Ok([string]$msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}
function Write-Fail([string]$msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
}

Write-Host ""
Write-Host "  StoryBook 构建工具" -ForegroundColor Magenta
Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  平台: Windows x64 (本机构建)" -ForegroundColor DarkGray
Write-Host "  跨平台构建 (macOS / Linux) 请推送 tag 触发 GitHub Actions" -ForegroundColor DarkGray
Write-Host ""

# ── 环境检测 ──────────────────────────────────────────────────────────────────

Write-Step "检查构建依赖"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "未找到 Node.js，请从 https://nodejs.org 安装 v18+"
    exit 1
}
$nodeVer = (node --version)
Write-Ok "Node.js $nodeVer"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail "未找到 npm"
    exit 1
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Fail "未找到 Rust/Cargo，请从 https://rustup.rs 安装"
    exit 1
}
$rustVer = (rustc --version)
Write-Ok "Rust $rustVer"

# 检测 WebView2（Windows 必须）
$webview2Key = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
if (-not (Test-Path $webview2Key)) {
    Write-Host "  ⚠ 未检测到 WebView2 Runtime，目标用户需要安装" -ForegroundColor Yellow
    Write-Host "    下载地址: https://developer.microsoft.com/microsoft-edge/webview2/" -ForegroundColor DarkGray
}

# ── 依赖安装 ──────────────────────────────────────────────────────────────────

Write-Step "安装前端依赖"
if (-not (Test-Path "node_modules")) {
    npm ci --silent
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm ci 失败"; exit 1 }
    Write-Ok "依赖安装完成"
} else {
    Write-Ok "依赖已存在，跳过"
}

# ── 清理缓存 ──────────────────────────────────────────────────────────────────

if ($Clean) {
    Write-Step "清理 Rust 编译缓存"
    Push-Location src-tauri
    cargo clean
    Pop-Location
    Write-Ok "缓存已清理"
}

# ── 同步版本号 ────────────────────────────────────────────────────────────────

Write-Step "同步版本号"
node scripts/sync-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Fail "版本号同步失败"
    exit 1
}
Write-Ok "版本号已同步"

# ── 构建 ──────────────────────────────────────────────────────────────────────

$startTime = Get-Date

if ($Debug) {
    Write-Step "Debug 构建（不打包安装器）"
    npm run tauri build -- --debug
} else {
    Write-Step "Release 构建（生成 Windows 安装包）"
    npm run tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-Fail "构建失败"
    exit 1
}

$elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)

# ── 输出产物 ──────────────────────────────────────────────────────────────────

Write-Step "构建产物"
$distDir = "src-tauri\target\release\bundle"
if ($Debug) {
    $distDir = "src-tauri\target\debug\bundle"
}

if (Test-Path "$distDir\msi") {
    $msiFiles = Get-ChildItem "$distDir\msi\*.msi" -ErrorAction SilentlyContinue
    if ($msiFiles) {
        Write-Ok "MSI 安装包:"
        $msiFiles | ForEach-Object {
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "    $($_.Name) ($size MB)" -ForegroundColor DarkGray
        }
    }
}

if (Test-Path "$distDir\nsis") {
    $nsisFiles = Get-ChildItem "$distDir\nsis\*.exe" -ErrorAction SilentlyContinue
    if ($nsisFiles) {
        Write-Ok "NSIS 安装包:"
        $nsisFiles | ForEach-Object {
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "    $($_.Name) ($size MB)" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  构建完成！耗时 $elapsed 秒" -ForegroundColor Green
Write-Host ""
