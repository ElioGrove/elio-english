#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.resolve(process.argv[2] || "");
const bookDir = path.join(sourceRoot, "book");
const output = path.join(root, "migrations", "0002_vocabulary.sql");

if (!process.argv[2]) {
  console.error("Usage: node scripts/build-vocabulary-migration.mjs /path/to/kajweb/dict");
  process.exit(1);
}

const plans = [
  {
    slug: "foundation",
    title: "小学基础",
    description: "从文具、颜色、家庭与日常表达开始",
    difficulty: 1,
    sourceIds: [
      "PEPXiaoXue3_1", "PEPXiaoXue3_2", "PEPXiaoXue4_1", "PEPXiaoXue4_2",
      "PEPXiaoXue5_1", "PEPXiaoXue5_2", "PEPXiaoXue6_1", "PEPXiaoXue6_2",
    ],
  },
  { slug: "middle-school", title: "初中核心", description: "常用基础词与学校生活表达", difficulty: 2, sourceIds: ["ChuZhongluan_2"] },
  { slug: "high-school", title: "高中核心", description: "阅读、写作与高考高频词", difficulty: 3, sourceIds: ["GaoZhongluan_2"] },
  { slug: "cet4", title: "CET-4", description: "大学英语四级核心词汇", difficulty: 4, sourceIds: ["CET4luan_2"] },
  { slug: "cet6", title: "CET-6", description: "大学英语六级进阶词汇", difficulty: 5, sourceIds: ["CET6_2"] },
  { slug: "bec", title: "BEC 商务", description: "工作、商业与沟通场景词汇", difficulty: 6, sourceIds: ["BEC_2"] },
  { slug: "postgraduate", title: "考研", description: "考研英语阅读与写作词汇", difficulty: 7, sourceIds: ["KaoYan_2"] },
  { slug: "ielts", title: "IELTS", description: "雅思听说读写高频词汇", difficulty: 8, sourceIds: ["IELTSluan_2"] },
  { slug: "toefl", title: "TOEFL", description: "托福学术场景与校园词汇", difficulty: 9, sourceIds: ["TOEFL_2"] },
  { slug: "sat", title: "SAT", description: "SAT 阅读与论证词汇", difficulty: 10, sourceIds: ["SAT_2"] },
  { slug: "gmat", title: "GMAT", description: "商科逻辑与分析写作词汇", difficulty: 11, sourceIds: ["GMATluan_2"] },
  { slug: "gre", title: "GRE", description: "高难度学术与精确表达词汇", difficulty: 12, sourceIds: ["GRE_2"] },
];

const zipFiles = readdirSync(bookDir).filter((name) => name.endsWith(".zip"));
const zipFor = (sourceId) => {
  const matches = zipFiles.filter((name) => name.endsWith(`_${sourceId}.zip`));
  if (matches.length !== 1) throw new Error(`Expected one zip for ${sourceId}, found ${matches.length}`);
  return path.join(bookDir, matches[0]);
};

const sql = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const normalize = (value) => value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
const words = new Map();
let nextWordId = 1;
const bookRows = [];

for (const plan of plans) {
  const seen = new Set();
  let position = 0;
  const associations = [];

  for (const sourceId of plan.sourceIds) {
    const raw = execFileSync("unzip", ["-p", zipFor(sourceId)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      const headword = String(record.headWord || "").trim();
      const normalized = normalize(headword);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      position += 1;

      const content = record.content?.word?.content || {};
      const translation = Array.isArray(content.trans) ? content.trans[0] : undefined;
      const word = words.get(normalized) || {
        id: nextWordId++,
        headword,
        normalized,
        phonetic: content.usphone || content.ukphone || content.phone || null,
        pos: translation?.pos || null,
        meaning: translation?.tranCn || null,
      };
      words.set(normalized, word);
      associations.push({ wordId: word.id, position });
    }
  }

  bookRows.push({ ...plan, count: associations.length, associations });
}

const lines = [
  "PRAGMA foreign_keys = ON;",
  "BEGIN TRANSACTION;",
];

for (const [index, book] of bookRows.entries()) {
  lines.push(`INSERT INTO books(id, slug, title, description, difficulty, word_count, source_id) VALUES (${index + 1}, ${sql(book.slug)}, ${sql(book.title)}, ${sql(book.description)}, ${book.difficulty}, ${book.count}, ${sql(book.sourceIds.join(","))});`);
}

const wordRows = [...words.values()];
for (let start = 0; start < wordRows.length; start += 150) {
  const values = wordRows.slice(start, start + 150).map((word) =>
    `(${word.id},${sql(word.headword)},${sql(word.normalized)},${sql(word.phonetic)},${sql(word.pos)},${sql(word.meaning)})`
  );
  lines.push(`INSERT INTO words(id, headword, normalized, source_phonetic, source_pos, source_meaning) VALUES\n${values.join(",\n")};`);
}

for (const [bookIndex, book] of bookRows.entries()) {
  for (let start = 0; start < book.associations.length; start += 200) {
    const values = book.associations.slice(start, start + 200).map(({ wordId, position }) =>
      `(${bookIndex + 1},${wordId},${position})`
    );
    lines.push(`INSERT INTO book_words(book_id, word_id, position) VALUES\n${values.join(",\n")};`);
  }
}

lines.push("COMMIT;");
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, lines.join("\n\n") + "\n");

console.log(JSON.stringify({
  output,
  books: bookRows.map(({ slug, title, count }) => ({ slug, title, count })),
  uniqueWords: wordRows.length,
}, null, 2));

