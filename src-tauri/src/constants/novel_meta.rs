use crate::constants::MetaPropertyDto;

pub struct NovelMetaConstants;

impl NovelMetaConstants {
    pub fn get_all_properties() -> Vec<MetaPropertyDto> {
        vec![
            MetaPropertyDto {
                group_name: "通用".to_string(),
                property_name: "大纲".to_string(),
                property_description: "小说的整体大纲，包含故事的主要情节发展和结构安排。建议按卷或篇章划分，明确每个阶段的核心事件、转折点和结局走向，为后续章节创作提供清晰的路线图。".to_string(),
            },
            MetaPropertyDto {
                group_name: "通用".to_string(),
                property_name: "世界观".to_string(),
                property_description: "小说的世界观设定，包括背景环境、规则体系等。详细描述故事发生的时空背景、社会制度、地理环境、历史脉络、文化习俗等，构建一个完整可信的故事世界。".to_string(),
            },
            MetaPropertyDto {
                group_name: "通用".to_string(),
                property_name: "主要情节".to_string(),
                property_description: "小说的主要情节线索，推动故事发展的核心事件。梳理主线剧情的起承转合，标注关键转折点、高潮场景和重要伏笔，确保情节连贯且有张力。".to_string(),
            },
            MetaPropertyDto {
                group_name: "通用".to_string(),
                property_name: "开篇内容".to_string(),
                property_description: "小说开篇的内容设定，用于吸引读者并引入故事背景。设计引人入胜的开场，包括悬念设置、主角登场、世界观初步展示，在前三章内抓住读者注意力。".to_string(),
            },
            MetaPropertyDto {
                group_name: "通用".to_string(),
                property_name: "结尾内容".to_string(),
                property_description: "小说结尾的内容设定，用于收束故事情节并给出结局。规划结局的情感基调、伏笔回收、角色命运交代，给读者留下深刻印象和满足感。".to_string(),
            },
            MetaPropertyDto {
                group_name: "RPG/任务".to_string(),
                property_name: "任务线".to_string(),
                property_description: "小说中的任务线索，包括主线任务和支线任务的规划。主线任务推动核心剧情发展，支线任务丰富故事层次、塑造角色形象，注意任务之间的关联和递进。".to_string(),
            },
            MetaPropertyDto {
                group_name: "RPG/任务".to_string(),
                property_name: "任务关系".to_string(),
                property_description: "任务之间的关系网络，描述任务之间的依赖和关联。标注前置任务、并行任务、互斥任务等关系，确保任务系统逻辑清晰，玩家体验流畅。".to_string(),
            },
            MetaPropertyDto {
                group_name: "RPG/任务".to_string(),
                property_name: "装备".to_string(),
                property_description: "小说中出现的装备设定，包括武器、道具等物品。详细记录装备名称、属性效果、获取方式、升级路径，以及装备对角色能力和剧情的影响。".to_string(),
            },
            MetaPropertyDto {
                group_name: "RPG/任务".to_string(),
                property_name: "宠物".to_string(),
                property_description: "小说中的宠物或伙伴设定，包括其特性和作用。描述宠物的外观、能力、性格、成长潜力，以及与主角的羁绊关系和在战斗/剧情中的定位。".to_string(),
            },
            MetaPropertyDto {
                group_name: "角色设定".to_string(),
                property_name: "主角设定".to_string(),
                property_description: "主角的详细档案，包括性格、外貌、背景、核心动机及初始状态。深入挖掘主角的内心世界、成长弧线、独特魅力，让读者产生共鸣和代入感。".to_string(),
            },
            MetaPropertyDto {
                group_name: "角色设定".to_string(),
                property_name: "主要配角".to_string(),
                property_description: "重要配角或伙伴的设定，包含他们在故事中的作用和与主角的关系。塑造有血有肉的配角形象，赋予他们独立的性格、目标和成长轨迹。".to_string(),
            },
            MetaPropertyDto {
                group_name: "角色设定".to_string(),
                property_name: "反派设定".to_string(),
                property_description: "主要反派的档案，包括其邪恶计划、性格特征及对抗主角的理由。打造有深度、有魅力的反派，让其行为有合理动机，成为推动剧情的重要力量。".to_string(),
            },
            MetaPropertyDto {
                group_name: "角色设定".to_string(),
                property_name: "势力阵营".to_string(),
                property_description: "故事世界中的势力分布（如宗门、国家、公司），包括它们的地盘和资源。构建多方势力的博弈格局，明确各势力的利益诉求、实力对比和相互关系。".to_string(),
            },
            MetaPropertyDto {
                group_name: "力量体系".to_string(),
                property_name: "力量体系".to_string(),
                property_description: "世界的能力层级划分，如修炼等级、魔法阶位、科技水平或异能分类。设计清晰、有层次的力量体系，确保升级逻辑合理，各层级有明显差异和标志性特征。".to_string(),
            },
            MetaPropertyDto {
                group_name: "力量体系".to_string(),
                property_name: "金手指/外挂".to_string(),
                property_description: "主角独有的特殊优势、系统或外挂，是推动剧情逆袭的关键要素。设定金手指的触发条件、使用限制、成长空间，避免过于强大导致故事失去张力。".to_string(),
            },
            MetaPropertyDto {
                group_name: "情节风格".to_string(),
                property_name: "核心冲突".to_string(),
                property_description: "贯穿全书的主要矛盾或主角必须解决的终极难题。设计多层次的冲突结构，包括外部冲突（人vs人/环境/社会）和内部冲突（人vs自我），推动角色成长。".to_string(),
            },
            MetaPropertyDto {
                group_name: "情节风格".to_string(),
                property_name: "叙事风格".to_string(),
                property_description: "写作的语言风格基调，如：热血、幽默、悬疑、暗黑或唯美。确定整体叙事风格并保持一致，在关键场景可适当调整以增强情感冲击力。".to_string(),
            },
            MetaPropertyDto {
                group_name: "情节风格".to_string(),
                property_name: "情感线".to_string(),
                property_description: "故事中感情戏（爱情、亲情、友情）的发展规划和关键转折点。设计情感线的起伏节奏，标注重要情感节点，让情感发展自然且有感染力。".to_string(),
            },
            MetaPropertyDto {
                group_name: "商业卖点".to_string(),
                property_name: "核心看点".to_string(),
                property_description: "本书最吸引读者的\"爽点\"或特色（如：无限流、种田、穿越、克苏鲁等）。明确作品的核心卖点，在关键情节中反复强化，形成独特的阅读体验和记忆点。".to_string(),
            },
        ]
    }
}
