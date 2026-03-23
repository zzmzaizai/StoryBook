pub async fn generate_outline(prompt: String) -> Result<String, String> {
    Ok(format!("AI 大纲建议：\n{}", prompt))
}
