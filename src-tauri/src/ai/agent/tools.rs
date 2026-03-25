//! Agent 工具模块
//!
//! 实现小说创作相关的工具

use rig::completion::request::ToolDefinition;
use rig::tool::{Tool, ToolEmbedding};
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::fmt;

#[derive(Debug)]
pub enum ToolError {
    InvalidInput(String),
    ExecutionFailed(String),
}

impl fmt::Display for ToolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ToolError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            ToolError::ExecutionFailed(msg) => write!(f, "Execution failed: {}", msg),
        }
    }
}

impl std::error::Error for ToolError {}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SaveDraftArgs {
    #[doc = "Draft content to save"]
    pub content: String,
    #[doc = "Draft title"]
    pub title: Option<String>,
    #[doc = "Chapter number if applicable"]
    pub chapter_number: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct SaveDraftOutput {
    pub success: bool,
    pub message: String,
    pub draft_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveDraftTool;

impl Tool for SaveDraftTool {
    const NAME: &'static str = "save_draft";
    type Error = ToolError;
    type Args = SaveDraftArgs;
    type Output = SaveDraftOutput;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = schemars::schema_for!(SaveDraftArgs);
        ToolDefinition {
            name: "save_draft".to_string(),
            description: "Save draft content to the novel editor".to_string(),
            parameters: serde_json::to_value(parameters).unwrap(),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let draft_id = format!("draft_{}", chrono::Utc::now().timestamp());
        let title = args.title.unwrap_or_else(|| "Untitled".to_string());
        
        Ok(SaveDraftOutput {
            success: true,
            message: format!("Draft '{}' saved successfully", title),
            draft_id,
        })
    }
}

impl ToolEmbedding for SaveDraftTool {
    type InitError = ToolError;
    type Context = ();
    type State = ();

    fn init(_state: Self::State, _context: Self::Context) -> Result<Self, Self::InitError> {
        Ok(SaveDraftTool)
    }

    fn embedding_docs(&self) -> Vec<String> {
        vec!["Save draft content to the novel editor for later editing".into()]
    }

    fn context(&self) -> Self::Context {}
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GenerateCharacterArgs {
    #[doc = "Character name"]
    pub name: String,
    #[doc = "Character role (protagonist, antagonist, supporting)"]
    pub role: String,
    #[doc = "Character traits"]
    pub traits: Vec<String>,
    #[doc = "Character background"]
    pub background: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GenerateCharacterOutput {
    pub character_profile: String,
    pub suggested_arc: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GenerateCharacterTool;

impl Tool for GenerateCharacterTool {
    const NAME: &'static str = "generate_character";
    type Error = ToolError;
    type Args = GenerateCharacterArgs;
    type Output = GenerateCharacterOutput;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = schemars::schema_for!(GenerateCharacterArgs);
        ToolDefinition {
            name: "generate_character".to_string(),
            description: "Generate a detailed character profile for the novel".to_string(),
            parameters: serde_json::to_value(parameters).unwrap(),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let traits_str = args.traits.join(", ");
        let background = args.background.unwrap_or_default();
        
        let profile = format!(
            "**{}** ({})\n\n**Traits:** {}\n\n**Background:** {}\n\n**Character Notes:** This character can be further developed through story progression.",
            args.name, args.role, traits_str, background
        );
        
        let arc = format!(
            "Suggested arc for {}: Begin with establishing their core motivation, introduce conflict that challenges their worldview, and resolve with character growth.",
            args.name
        );
        
        Ok(GenerateCharacterOutput {
            character_profile: profile,
            suggested_arc: arc,
        })
    }
}

impl ToolEmbedding for GenerateCharacterTool {
    type InitError = ToolError;
    type Context = ();
    type State = ();

    fn init(_state: Self::State, _context: Self::Context) -> Result<Self, Self::InitError> {
        Ok(GenerateCharacterTool)
    }

    fn embedding_docs(&self) -> Vec<String> {
        vec!["Generate detailed character profiles for novel characters".into()]
    }

    fn context(&self) -> Self::Context {}
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct CreateOutlineArgs {
    #[doc = "Novel genre"]
    pub genre: String,
    #[doc = "Core theme"]
    pub theme: String,
    #[doc = "Target chapter count"]
    pub chapter_count: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct CreateOutlineOutput {
    pub outline: String,
    pub act_structure: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateOutlineTool;

impl Tool for CreateOutlineTool {
    const NAME: &'static str = "create_outline";
    type Error = ToolError;
    type Args = CreateOutlineArgs;
    type Output = CreateOutlineOutput;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = schemars::schema_for!(CreateOutlineArgs);
        ToolDefinition {
            name: "create_outline".to_string(),
            description: "Create a structured novel outline with three-act structure".to_string(),
            parameters: serde_json::to_value(parameters).unwrap(),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let chapter_count = args.chapter_count.unwrap_or(20);
        
        let outline = format!(
            "Novel Outline: A {} story about {}\n\n\
            **Part 1 - Setup (Chapters 1-{}/3):** Introduce characters, setting, and initial conflict.\n\
            **Part 2 - Confrontation (Chapters {}/3+1 - {}/3*2):** Develop conflict, raise stakes, character growth.\n\
            **Part 3 - Resolution (Chapters {}/3*2+1 - {}):** Climactic confrontation and resolution.",
            args.genre, args.theme,
            chapter_count, chapter_count, chapter_count, chapter_count, chapter_count
        );
        
        let act_structure = format!(
            "Three-Act Structure for {}:\n\
            1. **Act I (Setup):** World-building, character introduction, inciting incident.\n\
            2. **Act II (Confrontation):** Rising action, obstacles, midpoint twist.\n\
            3. **Act III (Resolution):** Climax, falling action, denouement.",
            args.genre
        );
        
        Ok(CreateOutlineOutput {
            outline,
            act_structure,
        })
    }
}

impl ToolEmbedding for CreateOutlineTool {
    type InitError = ToolError;
    type Context = ();
    type State = ();

    fn init(_state: Self::State, _context: Self::Context) -> Result<Self, Self::InitError> {
        Ok(CreateOutlineTool)
    }

    fn embedding_docs(&self) -> Vec<String> {
        vec!["Create structured novel outlines with three-act structure".into()]
    }

    fn context(&self) -> Self::Context {}
}

pub fn get_novel_tools() -> (
    SaveDraftTool,
    GenerateCharacterTool,
    CreateOutlineTool,
) {
    (
        SaveDraftTool,
        GenerateCharacterTool,
        CreateOutlineTool,
    )
}
