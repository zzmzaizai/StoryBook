#!/usr/bin/env node
/**
 * StoryBook 本地 CI 检查脚本
 * 覆盖以下四项检查：
 * 1. cargo fmt --all -- --check
 * 2. cargo check
 * 3. cargo clippy --all-targets -- -D warnings
 * 4. npm run build
 */
import { spawn } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import process from 'process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const srcTauri = resolve(root, 'src-tauri')

const steps = [
  {
    name: 'Rust 格式检查',
    command: 'cargo',
    args: ['fmt', '--all', '--', '--check'],
    cwd: srcTauri,
  },
  {
    name: 'Rust 编译检查',
    command: 'cargo',
    args: ['check'],
    cwd: srcTauri,
  },
  {
    name: 'Rust Lint',
    command: 'cargo',
    args: ['clippy', '--all-targets', '--', '-D', 'warnings'],
    cwd: srcTauri,
  },
  {
    name: '前端构建验证',
    command: 'npm',
    args: ['run', 'build'],
    cwd: root,
  },
]

function resolveCommand(command, args) {
  if (process.platform === 'win32') {
    if (command === 'npm') {
      return {
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', command, ...args],
      }
    }

    if (command === 'cargo') {
      return {
        command: 'cargo.exe',
        args,
      }
    }
  }

  return { command, args }
}

function runStep(step) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`\n=== ${step.name} ===`)
    console.log(`$ ${step.command} ${step.args.join(' ')}`)

    const resolved = resolveCommand(step.command, step.args)

    const child = spawn(resolved.command, resolved.args, {
      cwd: step.cwd,
      stdio: 'inherit',
      shell: false,
    })

    child.on('error', (error) => {
      rejectPromise(error)
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise()
      } else {
        rejectPromise(new Error(`${step.name} 失败，退出码 ${code}`))
      }
    })
  })
}

async function main() {
  for (const step of steps) {
    await runStep(step)
  }

  console.log('\n✅ 四项检查全部通过')
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`)
  process.exit(1)
})
