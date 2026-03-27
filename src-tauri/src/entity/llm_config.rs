//! LLM 配置实体
//!
//! 存储大语言模型的配置信息，支持多个 Provider 和 Model。
//!
//! # 字段说明
//!
//! | 字段 | 类型 | 说明 |
//! |------|------|------|
//! | id | i32 | 自增主键 |
//! | name | String | 配置名称，如 "OpenAI GPT-4o" |
//! | provider | String | 提供商：openai / anthropic / gemini / ollama |
//! | model | String | 模型名称：gpt-4o-mini / claude-3-5-sonnet / gemini-2.5-pro |
//! | api_key | Option<String> | API 密钥（可加密存储） |
//! | base_url | Option<String> | 自定义网关/兼容服务地址 |
//! | extra_config | Option<Json> | 额外配置：温度、max_tokens、top_p 等 |
//! | is_default | bool | 是否为默认 LLM |
//! | enabled | bool | 是否启用 |

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// LLM 配置实体
///
/// 用于存储大语言模型的配置信息，支持多 Provider、多 Model。
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "llm_config")]
pub struct Model {
    /// 自增主键
    #[sea_orm(primary_key)]
    pub id: i32,

    /// 配置名称，如 "OpenAI GPT-4o"
    pub name: String,

    /// 提供商：openai / anthropic / gemini / ollama
    pub provider: String,

    /// 模型名称：gpt-4o-mini / claude-3-5-sonnet / gemini-2.5-pro
    pub model: String,

    /// API 密钥（建议加密存储）
    pub api_key: Option<String>,

    /// 自定义网关/兼容服务地址
    pub base_url: Option<String>,

    /// 额外配置（JSON 格式）
    ///
    /// 可包含：
    /// - temperature: 温度参数
    /// - max_tokens: 最大输出 token 数
    /// - top_p: 核采样参数
    /// - 其他模型特定参数
    pub extra_config: Option<Json>,

    /// 是否为默认 LLM
    ///
    /// 业务层应保证只有一个默认配置
    pub is_default: bool,

    /// 是否启用
    pub enabled: bool,

    /// 创建时间
    pub created_at: String,

    /// 更新时间
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
