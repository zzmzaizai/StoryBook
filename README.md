# StoryBook - AI Novel Editor

<p align="center">
  <strong>A cross-platform desktop app for AI-assisted novel planning and writing, built with Tauri v2</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2.5.0-blue?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/Rust-1.70+-orange?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript" alt="JavaScript" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

<p align="center">
  <a href="./README.zh-CN.md">中文</a> | English
</p>

---

## Introduction

StoryBook is a local-first desktop application for novel creation. It combines project management, chapter editing, metadata organization, timeline planning, and configurable AI assistance in a single Tauri application.

The current codebase focuses on a practical writing workflow:

- manage novel projects locally
- edit chapters and characters
- maintain novel metadata and timeline outlines
- configure LLMs and Agents
- use AI to generate novel info, metadata, timeline drafts, and chat responses

## Current Features

### Project Management

- Create, update, and delete novel projects
- Store novel base information such as title, summary, style, target audience, and length type
- Save AI original requirement text for AI-created novels
- Maintain writing settings separately from the base novel record

### Workspace

- `Basic` tab for novel profile and writing settings
- `Meta` tab for structured novel metadata editing
- `Timeline` tab for volume/chapter-range planning
- `Workflow` tab as a lightweight placeholder for future orchestration

### Chapter and Character Management

- Chapter CRUD with a custom CodeMirror-based Markdown editor
- Character CRUD with role, gender, and personality fields
- Word count tracking stored on the chapter side

### AI Features Available Now

- AI-generated novel base info from a free-text requirement
- Streaming AI chat in the assistant page
- AI generation for novel metadata with streaming output into the editor
- AI generation for timeline content with structured JSON response and form autofill
- Writing settings can be injected into AI prompts when a novel context is available

### LLM and Agent System

- Manage LLM configurations in-app
- Manage Agent runtime bindings in-app
- Agent definitions, names, descriptions, and prompts are loaded from `src-tauri/src/ai/prompts/*.toml`
- Agent runtime config only stores `agent_code`, optional `llm_config_id`, and optional `extra_config`
- If an Agent has no runtime config row, it still works and falls back to the default LLM
- Built-in Agents currently include:
  - `general_chat`
  - `novel_info_generator`
  - `novel_outline`
  - `chapter_timeline`
  - `character_design`
  - `meta_generator`
  - `chapter_content`
  - `chapter_polish`

### Security and Local Storage

- Local password access page
- SQLite-based local data storage
- Tauri Store for local settings persistence

## LLM Provider Support

The current implementation supports real requests for these providers:

- OpenAI
- DeepSeek
- OpenRouter
- Ollama (OpenAI-compatible endpoint)

The codebase contains provider abstractions for more models, but not every listed provider is fully wired for real requests yet.

## What Is Not Fully Implemented

The repository still contains some placeholder or incomplete areas. Examples:

- workflow automation is not finished
- some AI entry points were added recently and are still evolving
- advanced structured writing pipelines are not fully connected end-to-end
- some documentation from older iterations overstated the current scope

This README reflects the current implemented behavior rather than the original roadmap.

## Supported Novel Styles

Current built-in style enum values:

| Style | Description |
|-------|-------------|
| Urban | Modern / city themes |
| Fantasy | Fantasy world |
| Suspense | Mystery / suspense |
| Comedy | Light / humorous |
| Romance | Relationship-driven |
| Horror | Horror / thriller |
| Sci-Fi | Science fiction |
| Historical | Historical themes |
| Wuxia | Martial arts |
| Xianxia | Cultivation fantasy |

## Tech Stack

### Frontend

- Vanilla JavaScript
- Vite
- CodeMirror 6
- markdown-it
- Tauri API v2

### Backend

- Tauri v2
- Rust
- SeaORM
- SQLite
- Tokio
- rig-core

## Project Structure

```text
StoryBook/
├── src/
│   ├── api/                     # Tauri invoke wrappers
│   ├── components/              # Reusable UI pieces and modals
│   ├── lib/                     # Modal, markdown editor, tabs, toast, store
│   ├── pages/
│   │   ├── dashboard.js
│   │   ├── novels.js
│   │   ├── chapters.js
│   │   ├── characters.js
│   │   ├── chat.js
│   │   ├── llm-config.js
│   │   ├── agent-config.js
│   │   ├── security.js
│   │   ├── workspace.js
│   │   └── workspace/
│   │       ├── workspace-basic.js
│   │       ├── workspace-meta.js
│   │       ├── workspace-timeline.js
│   │       └── workspace-workflow.js
│   ├── state/                   # Lightweight frontend state
│   ├── style/                   # Global and page styles
│   ├── main.js
│   └── router.js
├── src-tauri/
│   ├── src/
│   │   ├── ai/                  # LLM, Agent, prompt loading, AI execution
│   │   ├── commands/            # Tauri commands
│   │   ├── constants/           # Built-in meta and chapter property definitions
│   │   ├── entity/              # SeaORM entities
│   │   ├── repository/          # Repository layer
│   │   ├── seeds/               # Seed data
│   │   ├── db.rs                # SQLite init and migration-like column checks
│   │   ├── lib.rs               # Tauri app entry
│   │   ├── storage.rs           # App storage paths
│   │   └── tray.rs              # Tray support
│   └── Cargo.toml
├── package.json
├── vite.config.js
└── README.md
```

## Quick Start

### Requirements

- Node.js >= 18
- Rust >= 1.70
- npm

### Install

```bash
git clone https://github.com/zzmzaizai/storybook.git
cd storybook
npm install
```

### Development

```bash
npm run tauri:dev
```

### Production Build

```bash
npm run tauri:build
```

Build artifacts are generated under `src-tauri/target/release/bundle/`.

## Data Storage

- Main data: SQLite in the user app data directory
- Local settings: Tauri Store plugin
- Novel-related files: managed under the app storage directory

## Notes for Developers

- The frontend uses direct DOM rendering instead of a framework
- Workspace tabs and AI features are evolving quickly; reading the current code is more reliable than relying on older screenshots or external descriptions
- Some recently added AI flows use streaming events, others use structured JSON responses depending on the editor scenario

## License

This project is licensed under the MIT License. See `LICENSE` for details.

## Links

- Gitee: https://gitee.com/zzmzaizai/storybook
- GitHub: https://github.com/zzmzaizai/storybook
