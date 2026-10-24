export const demoBooks = [
  { id: 1, slug: "foundation", title: "小学基础", description: "从日常表达开始", difficulty: 1, word_count: 819, mastered_count: 612, learning_count: 21 },
  { id: 2, slug: "middle-school", title: "初中核心", description: "常用基础词", difficulty: 2, word_count: 1418, mastered_count: 940, learning_count: 18 },
  { id: 3, slug: "high-school", title: "高中核心", description: "阅读与写作高频词", difficulty: 3, word_count: 3665, mastered_count: 128, learning_count: 23 },
  { id: 4, slug: "cet4", title: "CET-4", description: "大学英语四级", difficulty: 4, word_count: 3739, mastered_count: 0, learning_count: 0 },
  { id: 5, slug: "cet6", title: "CET-6", description: "大学英语六级", difficulty: 5, word_count: 2078, mastered_count: 0, learning_count: 0 },
  { id: 7, slug: "postgraduate", title: "考研", description: "考研英语", difficulty: 7, word_count: 4533, mastered_count: 0, learning_count: 0 },
  { id: 8, slug: "ielts", title: "IELTS", description: "雅思", difficulty: 8, word_count: 3427, mastered_count: 0, learning_count: 0 },
  { id: 9, slug: "toefl", title: "TOEFL", description: "托福", difficulty: 9, word_count: 9212, mastered_count: 0, learning_count: 0 },
  { id: 12, slug: "gre", title: "GRE", description: "高难度学术词汇", difficulty: 12, word_count: 7199, mastered_count: 0, learning_count: 0 },
];

export const demoContent = {
  phonetic: "/rɪˈzɪliənt/",
  partOfSpeech: "adj.",
  coreMeaning: "有恢复力的；适应力强的；能从困难中迅速恢复的",
  scenarios: ["考试常用", "学术常用"],
  frequency: { level: "高频", note: "常用于人物品质、商业组织与自然系统" },
  examples: [
    { en: "She showed remarkable resilience in the face of repeated setbacks.", zh: "面对一再的挫折，她表现出了非凡的韧性。" },
    { en: "The resilient coastal ecosystem can bounce back after storms.", zh: "这种有恢复力的沿海生态系统能在风暴后恢复活力。" },
  ],
  bestPractices: [
    {
      type: "人物故事",
      en: "After his business failed, Aaron took a month to reflect, learn, and plan. He started small, listened to feedback, and kept improving. Two years later, his new company not only survived — it thrived. Friends often say his resilience is his greatest strength.",
      zh: "生意失败后，Aaron 花了一个月反思、学习和规划。他从小处着手，倾听反馈并不断改进。两年后，他的新公司不仅存活下来，还蓬勃发展。朋友们常说，他的韧性是他最大的优势。",
    },
    { type: "新闻标题", en: "Local businesses prove resilient after a difficult winter.", zh: "经历严冬后，当地企业展现出强劲韧性。" },
  ],
  roots: { breakdown: "re-（回；再） + salire（跳、跃） + -ent（形容词后缀）", meaning: "字面联想：能够再次弹回来的 → 有恢复力的" },
  wordFamily: [
    { word: "resilience", zh: "n. 韧性；恢复力" },
    { word: "resiliency", zh: "n. 弹性；复原力" },
    { word: "resiliently", zh: "adv. 有韧性地" },
  ],
  collocations: [
    { phrase: "be resilient to sth.", zh: "对……有抵抗力" },
    { phrase: "build resilience", zh: "培养韧性" },
    { phrase: "resilient communities", zh: "有韧性的社区" },
  ],
  memoryTips: [
    "想象一个弹簧被压下去，松手后立刻弹回原位。resilient 就是“能回弹”的人、物或系统。",
    "与 persistent 区分：persistent 强调持续不放弃；resilient 强调受挫后恢复。",
    "词形网络：resilient（形容词）→ resilience（名词）。",
  ],
};

export const demoWord = {
  id: 3218,
  headword: "resilient",
  phonetic: "/rɪˈzɪliənt/",
  partOfSpeech: "adj.",
  meaning: "有恢复力的；适应力强的",
  status: "learning",
  position: 128,
  book: { slug: "high-school", title: "高中核心", wordCount: 3665 },
  aiContent: demoContent,
  aiModel: "qwen3.8-flash",
};

export const demoReview = [
  { id: 3218, headword: "resilient", source_pos: "adj.", source_meaning: "有恢复力的" },
  { id: 2811, headword: "articulate", source_pos: "adj.", source_meaning: "善于表达的" },
  { id: 1920, headword: "benevolent", source_pos: "adj.", source_meaning: "仁慈的" },
  { id: 1664, headword: "commence", source_pos: "v.", source_meaning: "开始" },
  { id: 3580, headword: "pragmatic", source_pos: "adj.", source_meaning: "务实的" },
];

