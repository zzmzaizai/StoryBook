use crate::constants::MetaPropertyDto;

pub struct ChapterMetaConstants;

impl ChapterMetaConstants {
    pub fn get_all_properties() -> Vec<MetaPropertyDto> {
        vec![
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "conception".to_string(),
                property_description: "构思：用简单的一段话说明这个章节要写些什么。明确本章的核心目标、要推进的剧情线、要展示的角色特质，为写作提供清晰的方向指引。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "foreshadowing".to_string(),
                property_description: "伏笔：记录本章节埋下的伏笔或与前后章节的联系。标注伏笔的类型（悬念伏笔、情感伏笔、剧情伏笔）、埋设方式和预期回收时机，确保伏笔有始有终。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "structure".to_string(),
                property_description: "起承转合：描述本章节的情节结构和叙事节奏。规划开篇如何引入、中段如何发展、转折如何设置、结尾如何收束，形成完整且有张力的叙事闭环。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "summary".to_string(),
                property_description: "总结：用简短的语言概括本章节的主要内容。提炼本章的核心事件、关键信息和情感走向，方便后续回顾和读者快速了解章节要点。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "keyplot".to_string(),
                property_description: "关键情节：列出本章节中的关键情节和转折点。标注每个情节的重要性等级、对主线的影响程度，以及情节之间的因果逻辑关系。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "characterdevelopment".to_string(),
                property_description: "角色发展：描述本章节中主要角色的成长和变化。记录角色的心理转变、能力提升、关系变化，以及这些变化对后续剧情的影响。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "conflict".to_string(),
                property_description: "冲突：说明本章节中的主要冲突及其表现。分析冲突的双方、冲突的根源、冲突的表现形式，以及冲突如何推动剧情和角色发展。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "climax".to_string(),
                property_description: "高潮：描述本章节的高潮部分和情感爆发点。设计高潮的铺垫方式、爆发时机、情感强度，让读者在关键时刻获得强烈的阅读体验。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "resolution".to_string(),
                property_description: "结局：说明本章节如何解决或铺垫冲突。规划结局的处理方式（圆满解决、悬念留白、引出新冲突），为下一章节做好衔接。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "theme".to_string(),
                property_description: "主题：说明本章节体现的主题思想和价值观。明确本章要传达的核心观念，通过情节和角色行为自然呈现，避免生硬说教。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "symbolism".to_string(),
                property_description: "象征：记录本章节中使用的象征和隐喻手法。标注象征物的选择、隐喻的含义、与主题的关联，增加文本的深度和艺术性。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "emotion".to_string(),
                property_description: "情感：描述本章节要传达的情感基调和氛围。确定主导情绪（紧张、温馨、悲伤、欢乐等），规划情感曲线的起伏变化，引导读者的情感体验。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "dialogue".to_string(),
                property_description: "对话：记录重要的对话内容和对话技巧。标注关键对话的目的、说话人的性格体现、潜台词设计，让对话既推动剧情又展现角色。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "description".to_string(),
                property_description: "描写：描述本章节中的环境描写和细节刻画。规划场景的视觉呈现、感官细节、氛围营造，让读者身临其境感受故事世界。".to_string(),
            },
            MetaPropertyDto {
                group_name: "章节元数据".to_string(),
                property_name: "pacing".to_string(),
                property_description: "节奏：说明本章节的叙事节奏和推进速度。根据章节在整体结构中的位置调整节奏，高潮前可适当放慢铺垫，高潮时加快节奏增强紧张感。".to_string(),
            },
        ]
    }
}
