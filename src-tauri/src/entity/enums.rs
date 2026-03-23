use serde::{Deserialize, Serialize};


/// 小说风格枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum NovelStyle {
    /// 都市
    #[default]
    Urban = 1,
    /// 奇幻
    Fantasy = 2,
    /// 悬疑
    Suspense = 3,
    /// 喜剧
    Comedy = 4,
    /// 言情
    Romance = 5,
    /// 恐怖
    Horror = 6,
    /// 科幻
    Scifi = 7,
    /// 历史
    Historical = 8,
    /// 武侠
    Wuxia = 9,
    /// 仙侠
    Xianxia = 10,
    /// 剧本
    Script = 11,
    /// 论文
    Thesis = 12,
    /// 散文
    Essay = 13,
    /// 诗歌
    Poetry = 14,
    /// 报告
    Report = 15,
}

impl NovelStyle {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            NovelStyle::Urban => "都市",
            NovelStyle::Fantasy => "奇幻",
            NovelStyle::Suspense => "悬疑",
            NovelStyle::Comedy => "喜剧",
            NovelStyle::Romance => "言情",
            NovelStyle::Horror => "恐怖",
            NovelStyle::Scifi => "科幻",
            NovelStyle::Historical => "历史",
            NovelStyle::Wuxia => "武侠",
            NovelStyle::Xianxia => "仙侠",
            NovelStyle::Script => "剧本",
            NovelStyle::Thesis => "论文",
            NovelStyle::Essay => "散文",
            NovelStyle::Poetry => "诗歌",
            NovelStyle::Report => "报告",
        }
    }
}

/// 小说状态枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum NovelStatus {
    /// 构思中
    #[default]
    Concept = 1,
    /// 进行中
    InProgress = 2,
    /// 已完本
    Completed = 3,
    /// 已废弃
    Abandoned = 4,
}

impl NovelStatus {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            NovelStatus::Concept => "构思",
            NovelStatus::InProgress => "进行中",
            NovelStatus::Completed => "已完本",
            NovelStatus::Abandoned => "已废弃",
        }
    }
}

/// 小说篇幅长度类型枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum NovelLengthType {
    /// 超长篇
    SuperLong = 1,
    /// 长篇
    Long = 2,
    /// 中篇
    #[default]
    Medium = 3,
    /// 短文
    Short = 4,
    /// 其他待定
    Other = 5,
}

impl NovelLengthType {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            NovelLengthType::SuperLong => "超长篇",
            NovelLengthType::Long => "长篇",
            NovelLengthType::Medium => "中篇",
            NovelLengthType::Short => "短文",
            NovelLengthType::Other => "其他待定",
        }
    }
}

/// 目标读者群体枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum TargetAudience {
    /// 男性读者
    Male = 1,
    /// 女性读者
    Female = 2,
    /// 儿童读者
    Children = 3,
    /// 全体读者
    #[default]
    All = 4,
}

impl TargetAudience {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            TargetAudience::Male => "男性读者",
            TargetAudience::Female => "女性读者",
            TargetAudience::Children => "儿童读者",
            TargetAudience::All => "全体读者",
        }
    }
}

/// 小说章节状态枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum NovelChapterStatus {
    /// 起草
    #[default]
    Draft = 0,
    /// 构思
    Concept = 1,
    /// 草稿
    RoughDraft = 2,
    /// 正文
    Final = 3,
    /// 修订版
    Revision = 7,
    /// 已确认
    Confirmed = 10,
    /// 已废弃
    Abandoned = 44,
}

impl NovelChapterStatus {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            NovelChapterStatus::Draft => "起草",
            NovelChapterStatus::Concept => "构思",
            NovelChapterStatus::RoughDraft => "草稿",
            NovelChapterStatus::Final => "正文",
            NovelChapterStatus::Revision => "修订版",
            NovelChapterStatus::Confirmed => "已确认",
            NovelChapterStatus::Abandoned => "已废弃",
        }
    }
}

/// 角色属性枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum CharacterRoleAttribute {
    /// 主角
    Protagonist = 1,
    /// 女主角
    Heroine = 2,
    /// 男主角
    Hero = 3,
    /// 反派
    Villain = 4,
    /// 配角
    Supporting = 5,
    /// 路人
    #[default]
    Passerby = 6,
}

impl CharacterRoleAttribute {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            CharacterRoleAttribute::Protagonist => "主角",
            CharacterRoleAttribute::Heroine => "女主角",
            CharacterRoleAttribute::Hero => "男主角",
            CharacterRoleAttribute::Villain => "反派",
            CharacterRoleAttribute::Supporting => "配角",
            CharacterRoleAttribute::Passerby => "路人",
        }
    }
}

/// 角色性别枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum CharacterGender {
    /// 男性
    Male = 1,
    /// 女性
    Female = 2,
    /// 中性
    #[default]
    Neutral = 3,
}

impl CharacterGender {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            CharacterGender::Male => "男性",
            CharacterGender::Female => "女性",
            CharacterGender::Neutral => "中性",
        }
    }
}

/// 角色类型枚举
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum CharacterType {
    /// 人类
    #[default]
    Human = 1,
    /// 非人类
    NonHuman = 2,
}

impl CharacterType {
    /// 获取枚举的中文标签
    pub fn label(&self) -> &'static str {
        match self {
            CharacterType::Human => "人类",
            CharacterType::NonHuman => "非人类",
        }
    }
}
