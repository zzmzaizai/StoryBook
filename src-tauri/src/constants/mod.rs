pub mod novel_meta;
pub mod chapter_meta;

pub use novel_meta::*;
pub use chapter_meta::*;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MetaPropertyDto {
    pub group_name: String,
    pub property_name: String,
    pub property_description: String,
}
