下面给你一个适合 **Tauri v2 + rig + sea-orm** 的、比较清晰且可扩展的 **LLM + Agent 模块设计方案**。目标是：

- **LLM 配置可持久化到数据库**
- **支持多个 Provider / Model**
- **可设置默认 LLM**
- **Agent 配置可持久化**
- **Agent 可绑定指定 LLM，或走默认 LLM**
- **Prompt 支持数据库自定义，也支持系统默认 prompt**
- **commands 中可以按 AgentCode 调用**
- **每个 Agent 独立文件实现逻辑**

我会分成这几个部分：

1. 总体架构
2. 数据表设计
3. Rust 模块目录建议
4. SeaORM 实体示例
5. Agent 默认提示词配置文件夹设计
6. LLM 工厂类设计
7. Agent 工厂类设计
8. 默认 Prompt 配置设计
9. LLM 服务层设计
10. Agent 抽象设计
11. 每个 Agent 独立文件的实现方式
12. commands 调用方式
13. 一次完整调用流程
14. 额外建议

---

# 1. 总体架构

建议分层：

```text
src-tauri/src/
├─ commands/
│  └─ agent_commands.rs
├─ ai/
│  ├─ mod.rs
│  ├─ llm/
│  │  ├─ mod.rs
│  │  ├─ factory.rs          # LLM 工厂类
│  │  ├─ provider.rs
│  │  ├─ executor.rs         # LLM 执行器
│  │  ├─ service.rs
│  │  └─ types.rs
│  ├─ agent/
│  │  ├─ mod.rs
│  │  ├─ factory.rs          # Agent 工厂类
│  │  ├─ service.rs
│  │  ├─ traits.rs
│  │  ├─ registry.rs
│  │  └─ handlers/
│  │     ├─ mod.rs
│  │     ├─ novel_outline_handler.rs
│  │     ├─ chapter_timeline_handler.rs
│  │     └─ character_design_handler.rs
│  └─ prompts/              # Agent 默认提示词配置
│     ├─ mod.rs
│     ├─ novel_outline.toml
│     ├─ chapter_timeline.toml
│     └─ character_design.toml
├─ entity/
│  ├─ llm_config.rs
│  └─ agent_config.rs
├─ state.rs
└─ infrastructure/
   └─ db.rs
```

### 核心职责

- **ai/llm/**
  负责：
  - LLM 工厂类：统一创建不同 provider 的 LLM 客户端
  - 从 DB 读取 LLMConfig
  - 解析 provider/model/api_key/base_url
  - 构建 rig client
  - 发起 LLM 调用

- **ai/agent/**
  负责：
  - Agent 工厂类：统一创建和管理 Agent 实例
  - 从 DB 读取 AgentConfig
  - 合并默认 prompt + 自定义 prompt
  - 根据 AgentCode 找到对应 Agent 实现
  - 将上下文传入 Agent，组织消息，调用 LLM

- **ai/prompts/**
  负责：
  - 存储每个 Agent 的默认提示词配置
  - 每个 Agent 一个独立的 TOML 文件
  - 支持系统提示词、用户提示词模板

### 核心职责

- **entity/**
  SeaORM 实体

- **domain/llm/**
  负责：
  - 从 DB 读取 LLMConfig
  - 解析 provider/model/api_key/base_url
  - 构建 rig client
  - 发起 LLM 调用

- **domain/agent/**
  负责：
  - 从 DB 读取 AgentConfig
  - 合并默认 prompt + 自定义 prompt
  - 根据 AgentCode 找到对应 Agent 实现
  - 将上下文传入 Agent，组织消息，调用 LLM

- **commands/**
  Tauri command 对外入口

---

# 2. 数据表设计

---

## 2.1 LLMConfig 表

建议字段：

```text
llm_config
- id: uuid / string
- name: string                // 配置名称，如 "OpenAI GPT-4o"
- provider: string            // openai / anthropic / deepseek / openrouter / ollama
- model: string               // gpt-4o-mini / claude-3-5-sonnet / deepseek-chat
- api_key: string nullable    // 可加密存储
- base_url: string nullable   // 自定义网关/兼容服务
- extra_config: json nullable // 温度、max_tokens、top_p 等
- is_default: bool
- enabled: bool
- created_at
- updated_at
```

### 说明

- `provider`：用字符串枚举即可
- `extra_config`：JSON 很重要，避免未来改表
- `is_default`：建议业务层保证只有一个默认
- `enabled`：方便停用

---

## 2.2 AgentConfig 表

建议字段：

```text
agent_config
- id: uuid / string
- agent_code: string            // 唯一，如 novel_outline / chapter_timeline / character_design
- name: string                  // 显示名称
- description: string nullable
- llm_config_id: uuid nullable  // 如果为空，则走默认LLM
- custom_prompt: text nullable  // 用户自定义prompt
- use_system_prompt: bool       // 是否启用系统默认prompt
- enabled: bool
- extra_config: json nullable   // agent专属配置，如输出风格、字数等
- created_at
- updated_at
```

### 说明

- `agent_code` 是关键路由字段
- `custom_prompt` 允许覆盖或追加默认 prompt
- `use_system_prompt` 表示是否加载系统内置 prompt
- `extra_config` 可扩展参数，比如：
  - 输出语言
  - 风格
  - 温度偏好
  - 是否 JSON 输出

---

# 3. Rust 模块目录建议

建议按“领域”而不是“数据库表”组织。

---

## 3.1 Agent 目录

```rust
domain/agent/
```

### `traits.rs`
定义 Agent 的统一接口

### `registry.rs`
通过 `agent_code` 找到具体 Agent 实现

### `service.rs`
对外统一调用入口：加载 config、加载 prompt、加载 llm、执行 agent

### `prompt_loader.rs`
读取配置文件里的系统默认 prompt

### `agents/*.rs`
每个 Agent 一个文件

---

## 3.2 LLM 目录

```rust
domain/llm/
```

### `types.rs`
LLM 参数定义

### `provider.rs`
不同 provider 枚举和适配

### `service.rs`
根据 LLMConfig 构建 rig 调用器

---

# 4. SeaORM 实体示例

下面给一个简化版本。

---

## 4.1 `entity/llm_config.rs`

```rust
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "llm_config")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    pub name: String,
    pub provider: String,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,

    pub extra_config: Option<Json>,
    pub is_default: bool,
    pub enabled: bool,

    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
```

---

## 4.2 `entity/agent_config.rs`

```rust
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "agent_config")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    pub agent_code: String,
    pub name: String,
    pub description: Option<String>,
    pub llm_config_id: Option<String>,

    pub custom_prompt: Option<String>,
    pub use_system_prompt: bool,
    pub enabled: bool,

    pub extra_config: Option<Json>,

    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
```

---

# 5. 默认 Prompt 配置设计

你说“提示词可以读取系统中定义的默认提示词（来自配置文件）”。

建议放一个配置文件，比如：

```toml
# infrastructure/config/prompts.toml

[novel_outline]
system_prompt = """
你是一个专业的小说策划编辑。
你的任务是根据用户提供的小说题材、核心设定、世界观和风格偏好，生成完整的大纲。
要求：
1. 输出故事主线
2. 输出三幕式结构
3. 输出关键冲突
4. 输出结局方向
5. 保持逻辑自洽
"""

[chapter_timeline]
system_prompt = """
你是一个专业的长篇小说章节规划助手。
你需要根据小说大纲和当前章节范围，生成详细的章节时间线与事件推进表。
要求：
1. 每章有核心事件
2. 每章有冲突推进
3. 每章有情绪变化
4. 节奏合理
"""

[character_design]
system_prompt = """
你是一个专业的小说角色设计师。
请根据故事背景设计角色，包括：
1. 基本资料
2. 性格特征
3. 核心动机
4. 成长弧线
5. 与主要角色的关系
"""
```

---

## 5.1 PromptLoader

```rust
use serde::Deserialize;
use std::{collections::HashMap, fs};

#[derive(Debug, Deserialize)]
pub struct PromptItem {
    pub system_prompt: String,
}

#[derive(Debug, Deserialize)]
pub struct PromptConfig {
    #[serde(flatten)]
    pub items: HashMap<String, PromptItem>,
}

pub fn load_prompt_config(path: &str) -> anyhow::Result<PromptConfig> {
    let content = fs::read_to_string(path)?;
    let config: PromptConfig = toml::from_str(&content)?;
    Ok(config)
}
```

---

# 6. LLM 服务层设计

这里核心是：
**根据 AgentConfig 找到对应 LLMConfig，如果没有则找默认 LLMConfig。**

---

## 6.1 provider 枚举

```rust
#[derive(Debug, Clone)]
pub enum LlmProvider {
    OpenAi,
    Anthropic,
    DeepSeek,
    OpenRouter,
    Ollama,
    Unknown(String),
}

impl From<&str> for LlmProvider {
    fn from(value: &str) -> Self {
        match value.to_lowercase().as_str() {
            "openai" => Self::OpenAi,
            "anthropic" => Self::Anthropic,
            "deepseek" => Self::DeepSeek,
            "openrouter" => Self::OpenRouter,
            "ollama" => Self::Ollama,
            other => Self::Unknown(other.to_string()),
        }
    }
}
```

---

## 6.2 LLM 解析结果

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmRuntimeConfig {
    pub provider: String,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}
```

---

## 6.3 LLMService

```rust
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use crate::entity::llm_config;

pub struct LlmService;

impl LlmService {
    pub async fn get_default_llm(db: &DatabaseConnection) -> anyhow::Result<llm_config::Model> {
        let model = llm_config::Entity::find()
            .filter(llm_config::Column::IsDefault.eq(true))
            .filter(llm_config::Column::Enabled.eq(true))
            .one(db)
            .await?
            .ok_or_else(|| anyhow::anyhow!("默认 LLM 未配置"))?;

        Ok(model)
    }

    pub async fn get_llm_by_id(
        db: &DatabaseConnection,
        id: &str,
    ) -> anyhow::Result<llm_config::Model> {
        let model = llm_config::Entity::find_by_id(id.to_string())
            .one(db)
            .await?
            .ok_or_else(|| anyhow::anyhow!("LLMConfig 不存在"))?;

        if !model.enabled {
            return Err(anyhow::anyhow!("LLMConfig 已禁用"));
        }

        Ok(model)
    }
}
```

---

## 6.4 通过 rig 调用模型

这里因为你用了 `rig`，建议做一个统一适配层，比如：

```rust
pub struct LlmExecutor;

impl LlmExecutor {
    pub async fn complete(
        llm: &crate::entity::llm_config::Model,
        system_prompt: &str,
        user_prompt: &str,
    ) -> anyhow::Result<String> {
        match llm.provider.to_lowercase().as_str() {
            "openai" => {
                // 这里根据 rig 的 openai client 构建调用
                // 示例伪代码
                // let client = rig::providers::openai::Client::new(llm.api_key.clone().unwrap());
                // let agent = client.agent(&llm.model).preamble(system_prompt).build();
                // let resp = agent.prompt(user_prompt).await?;
                // Ok(resp)

                Ok(format!("mock openai result: {}", user_prompt))
            }
            _ => Err(anyhow::anyhow!("暂不支持的 provider: {}", llm.provider)),
        }
    }
}
```

你后续可以把 OpenAI / OpenRouter / Ollama 都接进来。

---

# 7. Agent 抽象设计

重点是：
**每个 Agent 独立文件，但统一接口。**

---

## 7.1 定义 AgentTrait

```rust
use async_trait::async_trait;
use serde_json::Value;

pub struct AgentContext {
    pub input: Value,
}

pub struct AgentExecutionContext {
    pub system_prompt: String,
    pub custom_prompt: Option<String>,
}

#[async_trait]
pub trait AgentHandler: Send + Sync {
    fn code(&self) -> &'static str;

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String>;

    async fn execute(
        &self,
        llm: &crate::entity::llm_config::Model,
        exec_ctx: AgentExecutionContext,
        ctx: AgentContext,
    ) -> anyhow::Result<String> {
        let user_prompt = self.build_user_prompt(ctx).await?;

        let final_system_prompt = match &exec_ctx.custom_prompt {
            Some(custom) if !custom.trim().is_empty() => {
                format!("{}\n\n{}", exec_ctx.system_prompt, custom)
            }
            _ => exec_ctx.system_prompt.clone(),
        };

        crate::domain::llm::service::LlmExecutor::complete(
            llm,
            &final_system_prompt,
            &user_prompt,
        )
        .await
    }
}
```

---

# 8. 每个 Agent 独立文件实现方式

---

## 8.1 小说大纲 Agent

`domain/agent/agents/novel_outline_agent.rs`

```rust
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;

use crate::domain::agent::traits::{AgentContext, AgentHandler};

pub struct NovelOutlineAgent;

#[derive(Debug, Deserialize)]
struct NovelOutlineInput {
    title: Option<String>,
    genre: String,
    theme: Option<String>,
    world_setting: String,
    core_conflict: String,
    style: Option<String>,
    target_length: Option<String>,
}

#[async_trait]
impl AgentHandler for NovelOutlineAgent {
    fn code(&self) -> &'static str {
        "novel_outline"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: NovelOutlineInput = serde_json::from_value::<NovelOutlineInput>(ctx.input)?;

        let prompt = format!(
            r#"
请根据以下信息生成小说大纲：

标题：{}
题材：{}
主题：{}
世界观/设定：{}
核心冲突：{}
风格：{}
目标篇幅：{}

请输出：
1. 故事简介
2. 故事主线
3. 三幕式结构
4. 主要冲突
5. 结局方向
6. 可延展支线
"#,
            input.title.unwrap_or_default(),
            input.genre,
            input.theme.unwrap_or_default(),
            input.world_setting,
            input.core_conflict,
            input.style.unwrap_or_default(),
            input.target_length.unwrap_or_default(),
        );

        Ok(prompt)
    }
}
```

---

## 8.2 章节时间线 Agent

`chapter_timeline_agent.rs`

```rust
use async_trait::async_trait;
use serde::Deserialize;

use crate::domain::agent::traits::{AgentContext, AgentHandler};

pub struct ChapterTimelineAgent;

#[derive(Debug, Deserialize)]
struct ChapterTimelineInput {
    outline: String,
    chapter_start: u32,
    chapter_end: u32,
    current_arc_goal: Option<String>,
}

#[async_trait]
impl AgentHandler for ChapterTimelineAgent {
    fn code(&self) -> &'static str {
        "chapter_timeline"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: ChapterTimelineInput = serde_json::from_value(ctx.input)?;

        Ok(format!(
            r#"
请基于以下小说大纲，为第 {} 到第 {} 章生成章节时间线。

小说大纲：
{}

当前篇章目标：
{}

请输出表格化内容，每章包含：
1. 章节号
2. 时间点/时间推进
3. 核心事件
4. 冲突推进
5. 人物状态变化
6. 伏笔/回收
"#,
            input.chapter_start,
            input.chapter_end,
            input.outline,
            input.current_arc_goal.unwrap_or_default()
        ))
    }
}
```

---

## 8.3 角色设计 Agent

`character_design_agent.rs`

```rust
use async_trait::async_trait;
use serde::Deserialize;

use crate::domain::agent::traits::{AgentContext, AgentHandler};

pub struct CharacterDesignAgent;

#[derive(Debug, Deserialize)]
struct CharacterDesignInput {
    story_background: String,
    role_type: String,
    keywords: Vec<String>,
    relationship_hint: Option<String>,
}

#[async_trait]
impl AgentHandler for CharacterDesignAgent {
    fn code(&self) -> &'static str {
        "character_design"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: CharacterDesignInput = serde_json::from_value(ctx.input)?;

        Ok(format!(
            r#"
请设计一个小说角色：

故事背景：
{}

角色定位：
{}

关键词：
{}

关系提示：
{}

请输出：
1. 姓名
2. 基本资料
3. 外貌特征
4. 性格特征
5. 核心动机
6. 成长弧线
7. 与主角/其他角色关系
8. 可用于剧情推进的秘密或矛盾点
"#,
            input.story_background,
            input.role_type,
            input.keywords.join("、"),
            input.relationship_hint.unwrap_or_default(),
        ))
    }
}
```

---

# 9. Agent 注册与调度

你需要一个 registry，根据 `agent_code` 获取 Agent 实现。

---

## 9.1 registry.rs

```rust
use std::sync::Arc;

use crate::domain::agent::agents::{
    chapter_timeline_agent::ChapterTimelineAgent,
    character_design_agent::CharacterDesignAgent,
    novel_outline_agent::NovelOutlineAgent,
};
use crate::domain::agent::traits::AgentHandler;

pub fn get_agent_handler(agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
    match agent_code {
        "novel_outline" => Some(Arc::new(NovelOutlineAgent)),
        "chapter_timeline" => Some(Arc::new(ChapterTimelineAgent)),
        "character_design" => Some(Arc::new(CharacterDesignAgent)),
        _ => None,
    }
}
```

---

# 10. AgentService 统一调用入口

这是核心。

---

## 10.1 service.rs

```rust
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde_json::Value;

use crate::domain::agent::{
    prompt_loader::load_prompt_config,
    registry::get_agent_handler,
    traits::{AgentContext, AgentExecutionContext},
};
use crate::domain::llm::service::LlmService;
use crate::entity::agent_config;

pub struct AgentService;

impl AgentService {
    pub async fn invoke_by_code(
        db: &DatabaseConnection,
        prompt_config_path: &str,
        agent_code: &str,
        input: Value,
    ) -> anyhow::Result<String> {
        let agent_cfg = agent_config::Entity::find()
            .filter(agent_config::Column::AgentCode.eq(agent_code))
            .filter(agent_config::Column::Enabled.eq(true))
            .one(db)
            .await?
            .ok_or_else(|| anyhow::anyhow!("AgentConfig 不存在或已禁用: {}", agent_code))?;

        let llm = match &agent_cfg.llm_config_id {
            Some(id) => LlmService::get_llm_by_id(db, id).await?,
            None => LlmService::get_default_llm(db).await?,
        };

        let prompt_config = load_prompt_config(prompt_config_path)?;
        let system_prompt = if agent_cfg.use_system_prompt {
            prompt_config
                .items
                .get(agent_code)
                .map(|x| x.system_prompt.clone())
                .unwrap_or_default()
        } else {
            String::new()
        };

        let handler = get_agent_handler(agent_code)
            .ok_or_else(|| anyhow::anyhow!("未找到 Agent 处理器: {}", agent_code))?;

        let exec_ctx = AgentExecutionContext {
            system_prompt,
            custom_prompt: agent_cfg.custom_prompt.clone(),
        };

        let result = handler
            .execute(&llm, exec_ctx, AgentContext { input })
            .await?;

        Ok(result)
    }
}
```

---

# 11. Tauri command 调用

你说“commands 函数中可以调用某个Agent”。

建议做一个统一 command。

---

## 11.1 请求结构

```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct InvokeAgentRequest {
    pub agent_code: String,
    pub input: Value,
}
```

---

## 11.2 state.rs

```rust
use sea_orm::DatabaseConnection;
use std::sync::Arc;

pub struct AppState {
    pub db: DatabaseConnection,
    pub prompt_config_path: String,
}
```

---

## 11.3 command

```rust
use tauri::State;

use crate::{
    domain::agent::service::AgentService,
    state::AppState,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct InvokeAgentRequest {
    pub agent_code: String,
    pub input: Value,
}

#[tauri::command]
pub async fn invoke_agent(
    state: State<'_, AppState>,
    req: InvokeAgentRequest,
) -> Result<String, String> {
    AgentService::invoke_by_code(
        &state.db,
        &state.prompt_config_path,
        &req.agent_code,
        req.input,
    )
    .await
    .map_err(|e| e.to_string())
}
```

前端可直接传：

```ts
await invoke("invoke_agent", {
  req: {
    agentCode: "novel_outline",
    input: {
      title: "天命长夜",
      genre: "仙侠",
      worldSetting: "宗门林立、王朝与修真并存的世界",
      coreConflict: "主角因特殊血脉被各方争夺",
      style: "史诗、沉浸、成长",
      targetLength: "300万字"
    }
  }
})
```

---

# 12. 建议增加一个 AgentCode 枚举常量层

避免到处写字符串。

```rust
pub struct AgentCodes;

impl AgentCodes {
    pub const NOVEL_OUTLINE: &'static str = "novel_outline";
    pub const CHAPTER_TIMELINE: &'static str = "chapter_timeline";
    pub const CHARACTER_DESIGN: &'static str = "character_design";
}
```

---

# 13. Prompt 合并策略建议

你这里有两个来源：

- 系统默认 prompt（配置文件）
- 数据库 custom_prompt

建议明确策略，否则后期容易乱。

推荐：

### 策略 A：默认 prompt + custom prompt 追加
适合大多数情况

```text
最终 system prompt = system_default + "\n\n" + custom_prompt
```

### 策略 B：custom_prompt 完全覆盖默认 prompt
适合高级用户

可以在 `AgentConfig` 表中加一个字段：

```text
prompt_merge_mode: append | override
```

这样更灵活。

---

# 14. LLMConfig 建议加密 api_key

如果这是桌面应用，API key 很敏感。
建议不要明文存储。

可选方案：

- 简单：本地加密后入库
- 更好：使用系统密钥链
  - macOS Keychain
  - Windows Credential Manager
  - Linux Secret Service

如果当前先赶进度，至少做一层对称加密，不要纯明文。

---

# 15. rig 集成建议

因为 rig 各 provider 的调用风格可能稍有差异，你最好抽一层：

```rust
pub trait LlmAdapter {
    async fn complete(&self, system_prompt: &str, user_prompt: &str) -> anyhow::Result<String>;
}
```

然后分别实现：

- `OpenAiAdapter`
- `AnthropicAdapter`
- `OllamaAdapter`
- `OpenRouterAdapter`

然后在 `LlmExecutor` 中根据 provider 构建对应 adapter。

这样以后支持 function calling / structured output / streaming 时，会非常舒服。

---

# 16. 建议返回结构化结果，不要只返回 String

实际 AI 小说系统里，后面你很可能需要：

- 原始内容
- 使用的 model
- token 信息
- 耗时
- prompt
- 失败原因
- 是否缓存命中

所以 command 返回最好不是简单字符串。

例如：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentInvokeResponse {
    pub agent_code: String,
    pub llm_config_id: String,
    pub model: String,
    pub content: String,
}
```

这样前端更好用。

---

# 17. 推荐的最终调用流程

完整流程如下：

### 1. 前端调用 command
传入：
- `agent_code`
- `input`

### 2. Command 调用 AgentService

### 3. AgentService 查数据库中的 AgentConfig
- 是否启用
- 绑定哪个 llm_config_id
- 自定义 prompt 是什么
- 是否使用系统 prompt

### 4. AgentService 选择 LLM
- 有 llm_config_id -> 用指定 LLM
- 没有 -> 用默认 LLM

### 5. AgentService 加载默认 prompt 配置文件
根据 `agent_code` 找到系统 prompt

### 6. AgentService 从 registry 找到对应 AgentHandler

### 7. AgentHandler 构建 user prompt
把业务上下文拼好

### 8. LlmExecutor 调用 rig
- provider
- model
- api_key
- base_url
- 参数

### 9. 返回结果给 command
### 10. command 返回给前端

---

# 18. 你这个场景下最推荐的“最小可行实现”

如果你现在要先快速落地，我建议你先只做这几个：

## 表
- `llm_config`
- `agent_config`

## Agent
- `novel_outline`
- `chapter_timeline`
- `character_design`

## 功能
- 默认 LLM
- Agent 指定 LLM
- 系统 prompt + custom prompt 拼接
- 一个统一 `invoke_agent` command

这样就够你把整个“AI小说生成链条”跑起来了。

---

# 19. 一个更完整的核心接口定义建议

如果你想后面更稳，建议直接用下面这种接口。

---

## Agent 输入输出统一定义

```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct InvokeAgentRequest {
    pub agent_code: String,
    pub input: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvokeAgentResponse {
    pub agent_code: String,
    pub llm_config_id: String,
    pub provider: String,
    pub model: String,
    pub content: String,
}
```

---

## AgentService 返回这个结构

```rust
pub async fn invoke_by_code(
    db: &DatabaseConnection,
    prompt_config_path: &str,
    agent_code: &str,
    input: Value,
) -> anyhow::Result<InvokeAgentResponse>
```

---

# 20. 最后给你的结论

你的需求非常适合下面这个设计：

## 数据层
- `LLMConfig`：保存 provider/model/api_key/base_url/default
- `AgentConfig`：保存 agent_code / llm绑定 / 自定义prompt / 是否用系统prompt

## 业务层
- `LlmService`：负责解析和获取 LLM 配置
- `LlmExecutor`：负责通过 rig 发起调用
- `AgentService`：统一调度 Agent 执行
- `AgentHandler trait`：统一 Agent 规范

## 文件组织
- 每个 Agent 一个独立文件
- 用 `registry` 按 `agent_code` 路由
- `commands` 只负责接收请求并调用 `AgentService`

