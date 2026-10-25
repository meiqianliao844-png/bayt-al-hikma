# 每日知识包格式 v1

知识包是 UTF-8 JSON 文件。完整约束见 `public/knowledge-pack.schema.json`（JSON Schema Draft 07），完整示例见 `public/examples/starter.json`。上传前无需改代码，也不能包含 Markdown 代码围栏。每包不超过 10 MB、2000 个知识点、10000 道题。

## 顶层

| 字段            | 说明                                       |
| --------------- | ------------------------------------------ |
| `schemaVersion` | 固定数字 `1`                               |
| `id`            | 知识包稳定 ID，例如 `2026-10-25-diplomacy` |
| `title`         | 包标题                                     |
| `knowledge`     | 知识点数组，允许空数组以单独补充题目       |
| `questions`     | 题目数组，允许空数组                       |

## 知识点

必填：`id`、`arabic`、`meaning`、`date`（实际有效的 `YYYY-MM-DD` 日期）、`category`。

推荐：`root`、`form`、`collocations`（字符串数组）、`examples`（`arabic`/`chinese` 对象数组）、`grammar`、`confusion`、`scenario`、`pauseNote`。

有动词变化时可填 `verb: {"past":"…","present":"…","masdar":"…"}`，现在也允许仅补充已知的一项。无动词资料则省略；明确不适用时填 `verb: {"applicable": false, "note": "名词条目"}`。真人音频可填 `audioUrl`，必须 HTTPS，来源应允许访问及使用；不填则调用系统 TTS。建议所有阿语包含完整且符合句法位置的标符，词根用空格分隔字母；不要给名词编造动词变化或词根。系统做结构校验，不自动鉴定标符和语言知识准确性。

## 练习题

必填：`id`、`knowledgeId`、`type`、`prompt`、`answer`、`explanation`。其中 `knowledgeId` 必须引用包中或当前知识库的知识 ID。

| type             | 题型          | 批改                         |
| ---------------- | ------------- | ---------------------------- |
| `zh-ar`          | 中文选阿语    | 必须提供 `options`，自动批改 |
| `ar-choice`      | 阿语选中文    | 必须提供 `options`，自动批改 |
| `zh-fill`        | 中译阿填空    | 参考答案与自评               |
| `ar-zh`          | 阿译中        | 参考答案与自评               |
| `preposition`    | 介词/搭配填空 | 必须提供 `options`，自动批改 |
| `grammar`        | 语法纠错      | 参考答案与自评               |
| `synonym`        | 近义词辨析    | 必须提供 `options`，自动批改 |
| `interpretation` | 口译情景表达  | 参考答案与自评               |

`options` 至少两项且不重复，`answer` 必须和其中一项完全相同。选择题按用户选择的完整选项判定，保留标符差异；全文搜索会忽略标符和延长线。选项应避免含义歧义。`rubric` 为评分要点字符串数组，开放题强烈建议提供，不把参考译文作为唯一合法译文。

## ID、去重与更新

ID 建议使用不含空格的语义标识，如 `diplomacy-honor-guard`、`diplomacy-honor-guard-zh-ar-v1`。同包内知识 ID 不得重复、题目 ID 不得重复；两类 ID 各有命名空间。禁止 `__proto__`、`constructor`、`prototype` 等保留名称。

- 同一个词义或知识点跨日更新应保持 ID；不要每天更换 ID 造成重复。
- 默认保留当前相同 ID 的知识与题目，添加新 ID。
- 勾选“更新”会对相同 ID 的知识逐字段、逐层补充；未提供的字段保留。数组合并去重，空数组不隐式清除旧内容。题目仍整条替换，避免把新旧答案选项混合。预览显示已有 ID 数量和具体内容。
- 更新保留原题目的复习历史。如果题目考查内容或正确答案实质改变，请使用**新题目 ID**，避免历史进度失真。
- 导入同一包两次不会重复增加条目。当前以条目 ID 去重，不依据包 ID 跳过整个文件。
- 不支持用导入包隐式删除条目；通过知识详情明确删除。
- v1 对未知字段拒绝导入，避免拼写错误被忽略。本次采用向后兼容的可选字段扩展，schemaVersion 仍为 1。后续破坏性变更才需要新版本和迁移逻辑。

## 最小示例

```json
{
  "schemaVersion": 1,
  "id": "2026-10-25-mini",
  "title": "今日阿语积累",
  "knowledge": [
    {
      "id": "harmony",
      "arabic": "الْوِئَامُ",
      "meaning": "和谐；和睦",
      "date": "2026-10-25",
      "category": "外交表达"
    }
  ],
  "questions": [
    {
      "id": "harmony-meaning-v1",
      "knowledgeId": "harmony",
      "type": "ar-choice",
      "prompt": "الْوِئَامُ 的意思是什么？",
      "options": ["和睦", "冲突", "仪式"],
      "answer": "和睦",
      "explanation": "وِئَام 表示和睦、和谐的关系。"
    }
  ]
}
```

## 给 ChatGPT 的可复制指令

> 请把今天的阿拉伯语学习内容整理为智慧宫 v1 JSON 知识包。请先参考我提供的 knowledge-pack.schema.json 和 starter.json，严格按字段生成一个合法 UTF-8 JSON 文件，不含 Markdown 围栏。每条知识提供稳定语义 ID、完整标符的阿语、中文释义、学习日期、分类、准确的词根与构词、适用时的动词三式、常见搭配、双语例句、语法、易混点、使用场景与口译提示、停顿和连读说明。不要编造不确定知识。每点配有解析的题目，覆盖选择题、搭配、翻译及口译等类型，题目引用正确知识 ID；客观题提供唯一正确选项，开放题提供参考答案和评分要点。同义改写不作为错误。未提供真实音频时省略 audioUrl。跨日相同知识沿用 ID，实质改变题义时新建题目 ID。date 使用我指定的学习日期。

导入顺序：选择文件 → 查看校验信息 → 预览知识和题目 → 决定是否更新相同 ID → 确认 → 阅读新增/更新结果。失败时修正提示中的 JSON 路径或关联 ID，再重新选择文件。备份文件与知识包格式不同，请在“选择备份恢复”入口恢复备份。

## 深度词汇档案（v1 兼容扩展）

原有五个知识必填字段、`schemaVersion: 1`、`hikma-v1` 本地存储键与备份的 `version: 1` 均保持不变。旧包无需转换。新增字段全部可选，首次可只填释义，再通过同一 ID 更新。

完整新例子：[vocabulary.json](../public/examples/vocabulary.json)，包含 `كَتَبَ`、`كِتَابٌ`、`كَاتِبٌ` 三个互相链接的档案、11 道题，覆盖 10 类技能（互译分两个方向）。已有示例 `starter.json` 不变，现有用户不会被自动重置或自动导入新例子。

| 字段                                                      | 内容                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `verb`                                                    | 原有 past/present/masdar，加 imperative、activeParticiple、passiveParticiple、conjugations 人称列表、applicable、note |
| `vocabulary.partOfSpeech` / `transliteration` / `variety` | 词性、辅助音译、MSA 或明确地区的方言                                                                                  |
| `vocabulary.noun`                                         | applicable、singular、dual、gender、masculine、feminine、plurals、derivatives、note                                   |
| `vocabulary.family`                                       | arabic、chinese、可选 knowledgeId、partOfSpeech、commonness（common / rare）、note                                    |
| `vocabulary.relations`                                    | arabic、chinese、relation、distinction（必填区别说明）、可选 knowledgeId / variety                                    |
| `vocabulary.phrases`                                      | arabic、chinese、kind（verb-preposition / phrase / idiom）、可选 note                                                 |
| `vocabulary.contrasts`                                    | arabic、chinese、interchangeable、notInterchangeable                                                                  |
| `vocabulary.usage`                                        | register、frequency、mistakes 数组、interpretation、note                                                              |
| `vocabulary.sources`                                      | label、可选 HTTPS url、note；不得编造出处                                                                             |
| `examples` 新增可选字段                                   | context、variety、HTTPS audioUrl；原 arabic/chinese 保留                                                              |

`noun.plurals` 每项含 arabic、kind（broken / sound-masculine / sound-feminine / other）及可选 note。`verb.conjugations` 每项含 pronoun 与已知的 past/present/imperative/note。不适用的完整词类用 applicable:false。单个人称没有命令式时省略词形，并在 note 解释。不确定的内容可省略、留空字符串或空数组；“没有资料”不等于“不适用”。词根和词型不自动机械推导。

关系类别必须明确：`synonym` 严格近义、`near-synonym` 有差别的近义、`related` 相关词、`antonym` 严格反义、`semantic-opposite` 特定语境下的语义对立。没有真实反义词可不提供；例如写下和擦去仅在具体操作语境对立。不要给每个词强行填满五种关系。示例为标准语教学用例句，并非官方语料或新闻原文。

已有档案通过 knowledgeId 或完全相同的 arabic 链接；目标未导入时显示说明，不创建虚构词条。为使跨标符变化链接稳定，建议使用 knowledgeId。

### 补充与更新语义

新导入记录仍需提供 id、arabic、meaning、date、category；其余可选字段只提供这次需要补充的内容。默认不修改已有 ID；勾选更新才应用补充。对象递归合并；列表按 arabic+关系类别（词形/例句/词族）、pronoun（变位）、label（资料）识别并补充同项，纯字符串列表合并去重。重复导入保持幂等。删除或清空内容需要在“编辑知识”明确操作，不通过空列表暗中删除资料。

编辑页面保留常用字段与双语例句表单，并增加可展开的 vocabulary JSON 编辑区；保存前由同一 Schema 校验，格式错误不保存。更新题目时，语义、正确答案实质改变仍必须使用新题目 ID；旧 ID 的复习记录会保留。

### 新练习类型与评分

| type         | 技能                           |
| ------------ | ------------------------------ |
| conjugation  | 动词变位                       |
| noun-number  | 单复数转换                     |
| root         | 词根识别                       |
| derivation   | 派生词辨析                     |
| antonym      | 反义词或明确标注的语义对立匹配 |
| context-fill | 例句语境填空                   |

介词、近义、互译与纠错继续沿用 preposition、synonym、zh-fill / ar-zh、grammar，不改变原有题型含义。全部题目仍需 answer、explanation 和 knowledgeId。

新增 `grading`：

- `choice`：选项客观批改，必须有 options，answer 必须在其中。新类型提供 options 且未指定 grading 时默认此模式。
- `exact`：仅用于单一词形、词根或限定空格的输入，忽略标符、延长线和多余空格；支持 acceptedAnswers 数组。允许 conjugation、noun-number、root、preposition、context-fill、zh-fill。出题者须确保这是限定答案的练习，不能把开放翻译放入此模式。若要考标符差别，使用带完整词形的选择题。
- `self`：先展示参考与 rubric，再自评。不逐字匹配开放译文。ar-zh、interpretation、grammar 强制自评；新类型无 options 时也默认自评。

旧八种题型在未提供 grading 时维持原评分方式。词汇档案的“练习”页可查看对应题目并开始练习；不会依据词根自动编造不存在的形式或干扰项。

### ChatGPT 生成指令补充

> 请使用附件最新 knowledge-pack.schema.json，保持 schemaVersion:1。除原有知识字段外，尽可能补充 vocabulary 和扩展 verb 字段，仅填写确认的资料。所有阿语词形、搭配、例句尽可能完整标符；标明现代标准阿拉伯语或具体地区方言，区分严格近义 / 有差别近义 / 相关词，严格反义 / 语义对立，常用 / 罕见派生。每条搭配和例句附准确中文；标明例句是教学编写还是有来源的原文，引用来源必须真实。没有严格反义词不要硬造，不适用填 applicable:false，未知省略。沿用已有知识 ID 补充可选字段，保留五个必填基本字段。题目覆盖需要的词汇技能，有唯一答案才用 choice 或限定形式 exact，其他使用 self 和评分要点，不能用字符串匹配判开放翻译错误。
