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

有动词变化时填 `verb: {"past":"…","present":"…","masdar":"…"}`，无动词则省略该字段，不能填空对象。真人音频可填 `audioUrl`，必须 HTTPS，来源应允许访问及使用；不填则调用系统 TTS。建议所有阿语包含完整且符合句法位置的标符，词根用空格分隔字母；不要给名词编造动词变化或词根。系统做结构校验，不自动鉴定标符和语言知识准确性。

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
- 勾选“更新”会替换相同 ID 的完整内容，不做字段级合并；需包含想保留的可选字段。预览显示已有 ID 数量和具体内容。
- 更新保留原题目的复习历史。如果题目考查内容或正确答案实质改变，请使用**新题目 ID**，避免历史进度失真。
- 导入同一包两次不会重复增加条目。当前以条目 ID 去重，不依据包 ID 跳过整个文件。
- 不支持用导入包隐式删除条目；通过知识详情明确删除。
- v1 对未知字段拒绝导入，避免拼写错误被忽略。后续扩展需升级 schemaVersion、类型、校验器和迁移逻辑后再发布。

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
