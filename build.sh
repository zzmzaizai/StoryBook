#!/usr/bin/env bash
# StoryBook 本地构建脚本（macOS / Linux）
# 用法:
#   ./build.sh                    — 构建当前平台安装包（默认）
#   ./build.sh --debug            — Debug 构建（快，不打包）
#   ./build.sh --clean            — 清理 Rust 编译缓存后构建
#   ./build.sh --target <triple>  — 指定 Rust target（如 x86_64-unknown-linux-gnu）
set -euo pipefail

DEBUG=false
CLEAN=false
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug) DEBUG=true; shift ;;
    --clean) CLEAN=true; shift ;;
    --target) TARGET="$2"; shift 2 ;;
    *) shift ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
MAGENTA='\033[0;35m'; GRAY='\033[0;90m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}▶ $1${RESET}"; }
ok()    { echo -e "  ${GREEN}✓ $1${RESET}"; }
fail()  { echo -e "  ${RED}✗ $1${RESET}"; exit 1; }

echo ""
ARCH=$(uname -m)
OS=$(uname)

echo -e "  ${MAGENTA}StoryBook 构建工具${RESET}"
echo -e "  ${GRAY}─────────────────────────────────────${RESET}"
if [[ "$OS" == "Darwin" ]]; then
  if [[ "$ARCH" == "arm64" ]]; then
    echo -e "  ${GRAY}平台: macOS Apple Silicon (aarch64)${RESET}"
  else
    echo -e "  ${GRAY}平台: macOS Intel (x86_64)${RESET}"
  fi
else
  echo -e "  ${GRAY}平台: Linux ${ARCH}${RESET}"
fi
if [[ -n "$TARGET" ]]; then
  echo -e "  ${CYAN}目标: $TARGET${RESET}"
fi
echo -e "  ${GRAY}跨平台构建 (其他平台) 请推送 tag 触发 GitHub Actions${RESET}"
echo ""

# ── 环境检测 ──────────────────────────────────────────────────────────────────

step "检查构建依赖"

if ! command -v node &>/dev/null; then
  fail "未找到 Node.js，请从 https://nodejs.org 安装 v18+"
fi
ok "Node.js $(node --version)"

if ! command -v cargo &>/dev/null; then
  fail "未找到 Rust/Cargo，请从 https://rustup.rs 安装"
fi
ok "Rust $(rustc --version)"

# macOS 额外检测
if [[ "$(uname)" == "Darwin" ]]; then
  if ! command -v xcode-select &>/dev/null || ! xcode-select -p &>/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠ 未找到 Xcode Command Line Tools${RESET}"
    echo -e "    运行: xcode-select --install"
  fi
fi

# Linux 额外检测
if [[ "$OS" == "Linux" ]]; then
  if command -v dpkg &>/dev/null; then
    # Debian/Ubuntu
    MISSING=()
    for pkg in libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev; do
      if ! dpkg -s "$pkg" &>/dev/null 2>&1; then
        MISSING+=("$pkg")
      fi
    done
    if [ ${#MISSING[@]} -gt 0 ]; then
      echo -e "  ${RED}✗ 缺少系统依赖: ${MISSING[*]}${RESET}"
      echo -e "    运行: sudo apt-get install -y ${MISSING[*]} libayatana-appindicator3-dev librsvg2-dev patchelf"
      exit 1
    fi
  elif command -v rpm &>/dev/null; then
    # Fedora/RHEL/CentOS
    MISSING=()
    for pkg in webkit2gtk4.1-devel openssl-devel gtk3-devel; do
      if ! rpm -q "$pkg" &>/dev/null 2>&1; then
        MISSING+=("$pkg")
      fi
    done
    if [ ${#MISSING[@]} -gt 0 ]; then
      echo -e "  ${RED}✗ 缺少系统依赖: ${MISSING[*]}${RESET}"
      echo -e "    运行: sudo dnf install -y ${MISSING[*]} libayatana-appindicator-gtk3-devel librsvg2-devel patchelf"
      exit 1
    fi
  fi
fi

# ── 依赖安装 ──────────────────────────────────────────────────────────────────

step "安装前端依赖"
if [[ ! -d "node_modules" ]]; then
  npm ci --silent || fail "npm ci 失败"
  ok "依赖安装完成"
else
  ok "依赖已存在，跳过"
fi

# ── 清理缓存 ──────────────────────────────────────────────────────────────────

if [[ "$CLEAN" == "true" ]]; then
  step "清理 Rust 编译缓存"
  (cd src-tauri && cargo clean)
  ok "缓存已清理"
fi

# ── 同步版本号 ────────────────────────────────────────────────────────────────

step "同步版本号"
node scripts/sync-version.js || fail "版本号同步失败"
ok "版本号已同步"

# ── 构建 ──────────────────────────────────────────────────────────────────────

step "构建 Tauri 应用"
START_TIME=$(date +%s)

BUILD_ARGS=""
if [[ -n "$TARGET" ]]; then
  BUILD_ARGS="--target $TARGET"
fi

if [[ "$DEBUG" == "true" ]]; then
  echo -e "  ${GRAY}Debug 模式（不打包安装器）${RESET}"
  npm run tauri build -- --debug $BUILD_ARGS
else
  npm run tauri build -- $BUILD_ARGS
fi

if [[ $? -ne 0 ]]; then
  fail "构建失败"
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# ── 输出产物 ──────────────────────────────────────────────────────────────────

step "构建产物"

DIST_DIR="src-tauri/target"
if [[ -n "$TARGET" ]]; then
  DIST_DIR="$DIST_DIR/$TARGET"
fi
if [[ "$DEBUG" == "true" ]]; then
  DIST_DIR="$DIST_DIR/debug/bundle"
else
  DIST_DIR="$DIST_DIR/release/bundle"
fi

if [[ -d "$DIST_DIR/dmg" ]]; then
  DMG_FILES=$(find "$DIST_DIR/dmg" -name "*.dmg" 2>/dev/null)
  if [[ -n "$DMG_FILES" ]]; then
    ok "DMG 安装包:"
    echo "$DMG_FILES" | while read -r f; do
      SIZE=$(du -h "$f" | cut -f1)
      echo -e "    ${GRAY}$(basename "$f") ($SIZE)${RESET}"
    done
  fi
fi

if [[ -d "$DIST_DIR/deb" ]]; then
  DEB_FILES=$(find "$DIST_DIR/deb" -name "*.deb" 2>/dev/null)
  if [[ -n "$DEB_FILES" ]]; then
    ok "DEB 安装包:"
    echo "$DEB_FILES" | while read -r f; do
      SIZE=$(du -h "$f" | cut -f1)
      echo -e "    ${GRAY}$(basename "$f") ($SIZE)${RESET}"
    done
  fi
fi

if [[ -d "$DIST_DIR/appimage" ]]; then
  APPIMAGE_FILES=$(find "$DIST_DIR/appimage" -name "*.AppImage" 2>/dev/null)
  if [[ -n "$APPIMAGE_FILES" ]]; then
    ok "AppImage 安装包:"
    echo "$APPIMAGE_FILES" | while read -r f; do
      SIZE=$(du -h "$f" | cut -f1)
      echo -e "    ${GRAY}$(basename "$f") ($SIZE)${RESET}"
    done
  fi
fi

echo ""
echo -e "  ${GRAY}─────────────────────────────────────${RESET}"
echo -e "  ${GREEN}构建完成！耗时 ${ELAPSED} 秒${RESET}"
echo ""
