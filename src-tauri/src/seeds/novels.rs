use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NovelSeed {
    pub title: String,
    pub description: Option<String>,
    pub image: Option<String>,
    pub style: i32,
    pub target_audience: i32,
    pub length_type: i32,
    pub estimated_chapter_count: Option<i32>,
    pub estimated_total_word_count: Option<i64>,
    pub estimated_words_per_chapter: Option<i32>,
    pub status: i32,
}

pub fn get_novel_seeds() -> Vec<NovelSeed> {
    vec![
        NovelSeed {
            title: "星际迷途".to_string(),
            description: Some("在遥远的未来，人类已经掌握了星际旅行的技术。一艘探索飞船在执行任务时意外穿越到了未知的星系，船员们必须团结一致，寻找回家的路。".to_string()),
            image: None,
            style: 7,
            target_audience: 4,
            length_type: 2,
            estimated_chapter_count: Some(200),
            estimated_total_word_count: Some(600000),
            estimated_words_per_chapter: Some(3000),
            status: 2,
        },
        NovelSeed {
            title: "古风江湖".to_string(),
            description: Some("少年剑客初入江湖，在这风云变幻的武侠世界中，他将经历怎样的奇遇与磨难？一段关于成长、友情与爱情的传奇故事。".to_string()),
            image: None,
            style: 9,
            target_audience: 4,
            length_type: 3,
            estimated_chapter_count: Some(80),
            estimated_total_word_count: Some(240000),
            estimated_words_per_chapter: Some(3000),
            status: 1,
        },
        NovelSeed {
            title: "都市奇缘".to_string(),
            description: Some("一个普通的上班族，在一次意外中获得了特殊能力。从此，他的生活发生了翻天覆地的变化，平凡的日子不再平凡。".to_string()),
            image: None,
            style: 1,
            target_audience: 1,
            length_type: 3,
            estimated_chapter_count: Some(100),
            estimated_total_word_count: Some(300000),
            estimated_words_per_chapter: Some(3000),
            status: 2,
        },
    ]
}
