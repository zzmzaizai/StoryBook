const { invoke } = window.__TAURI__.core;

export const ENUMS = {
  NovelStyle: {
    1: '都市', 2: '奇幻', 3: '悬疑', 4: '喜剧', 5: '言情',
    6: '恐怖', 7: '科幻', 8: '历史', 9: '武侠', 10: '仙侠'
  },
  NovelStatus: {
    1: '构思', 2: '进行中', 3: '已完本', 4: '已废弃'
  },
  NovelLengthType: {
    1: '超长篇', 2: '长篇', 3: '中篇', 4: '短文', 5: '其他待定'
  },
  TargetAudience: {
    1: '男性读者', 2: '女性读者', 3: '儿童读者', 4: '全体读者'
  },
  NovelChapterStatus: {
    0: '起草', 1: '构思', 2: '草稿', 3: '正文', 7: '修订版', 10: '已确认', 44: '已废弃'
  },
  CharacterRoleAttribute: {
    1: '主角', 2: '女主角', 3: '男主角', 4: '反派', 5: '配角', 6: '路人'
  },
  CharacterGender: {
    1: '男性', 2: '女性', 3: '中性'
  },
  CharacterType: {
    1: '人类', 2: '非人类'
  }
};

export const api = {
  createNovel: (title) => invoke('create_novel', { title }),
  listNovels: (page = 0, pageSize = 12) => invoke('list_novels', { page, pageSize }),
  countNovels: () => invoke('count_novels'),
  getNovel: (id) => invoke('get_novel', { id }),
  updateNovel: (payload) => invoke('update_novel', payload),
  deleteNovel: (id) => invoke('delete_novel', { id }),

  createChapter: (novelId, chapterName) => invoke('create_chapter', { novelId, chapterName }),
  listChapters: (novelId, page = 0, pageSize = 20) =>
    invoke('list_chapters', { novelId, page, pageSize }),
  getChapter: (id) => invoke('get_chapter', { id }),
  saveChapter: (id, chapterName, content, status) =>
    invoke('save_chapter', { id, chapterName, content, status }),
  deleteChapter: (id) => invoke('delete_chapter', { id }),

  createCharacter: (novelId, name) => invoke('create_character', { novelId, name }),
  listCharacters: (novelId, page = 0, pageSize = 20) =>
    invoke('list_characters', { novelId, page, pageSize }),
  getCharacter: (id) => invoke('get_character', { id }),
  saveCharacter: (id, name, nickname, age, personality, roleAttribute, gender, characterType, sortOrder) =>
    invoke('save_character', { 
      id, 
      name, 
      nickname, 
      age, 
      personality, 
      roleAttribute, 
      gender, 
      characterType, 
      sortOrder 
    }),
  deleteCharacter: (id) => invoke('delete_character', { id }),

  createTimeline: (novelId, title) => invoke('create_timeline', { novelId, title }),
  listTimelines: (novelId) => invoke('list_timelines', { novelId }),
  getTimeline: (id) => invoke('get_timeline', { id }),
  updateTimeline: (id, title, description, timelineOutline, startChapterNumber, endChapterNumber, charactersDescription, chapterMetas) =>
    invoke('update_timeline', { id, title, description, timelineOutline, startChapterNumber, endChapterNumber, charactersDescription, chapterMetas }),
  deleteTimeline: (id) => invoke('delete_timeline', { id }),
  getChapterMetaProperties: () => invoke('get_chapter_meta_properties'),

  createMeta: (novelId, propertyName, propertyValue) =>
    invoke('create_meta', { novelId, propertyName, propertyValue }),
  listMeta: (novelId) => invoke('list_meta', { novelId }),
  getMeta: (id) => invoke('get_meta', { id }),
  getMetaByName: (novelId, propertyName) =>
    invoke('get_meta_by_name', { novelId, propertyName }),
  updateMeta: (id, propertyValue) => invoke('update_meta', { id, propertyValue }),
  upsertMeta: (novelId, propertyName, propertyValue) =>
    invoke('upsert_meta', { novelId, propertyName, propertyValue }),
  deleteMeta: (id) => invoke('delete_meta', { id }),
  getNovelMetaProperties: () => invoke('get_novel_meta_properties'),
};
