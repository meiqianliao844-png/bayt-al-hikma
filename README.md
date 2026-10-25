# 智慧宫 · بَيْتُ الْحِكْمَةِ

为阿拉伯语专业学习者设计的个人知识与复习空间。React 19 + TypeScript + Vite；纯静态前端，无需 API 密钥或数据库即可运行。米白、深绿、金色界面，适配手机与电脑，阿语使用 RTL 和 Times New Roman 字体栈。

## 本地运行

推荐 Node.js 22 或 24（至少 22.12）。

```bash
npm ci
npm run dev
```

按终端提示打开开发服务器。首次启动自动加载 7 个示例知识点、20 道题。数据保存在当前浏览器当前站点的 localStorage；不同域名、端口、浏览器之间不共享数据。没有 ChatGPT 自动同步：将每天整理的 JSON 文件通过“知识包与备份”导入。

```bash
npm run build      # TypeScript 检查与生产构建
npm run preview    # 本机验证 dist 产物，不能作为正式公网服务器
npm test          # 核心逻辑测试
npx playwright install chromium
npm run test:e2e   # 桌面和手机浏览器端到端测试
```

已有系统 Chromium 时可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`。默认 Playwright 会使用其自带浏览器。受限云环境如 npm 默认缓存不可写，可使用 `npm ci --cache /workspace/.npm-cache`。

## 已实现的学习流程

- **每日知识库**：完整标符的原文、释义、词根、构词、可选动词变化、搭配、双语例句、语法、辨析、场景与口译提示；支持新增、编辑、搜索、分类/日期筛选、收藏、删除。删除知识会同步删除其题目和复习记录。
- **发音与跟读**：知识卡和例句支持正常/慢速浏览器阿语朗读；明确检测阿语音色。支持 HTTPS 真人音频 URL、录音、回放和人工跟读对照。录音不上传、不做自动发音评分，离开组件会释放音频，不包含在备份中。麦克风需要 HTTPS 或 localhost 和用户授权。实际 TTS 音色、标符及停顿处理取决于系统引擎，详情中提供停顿/连读说明，不承诺专业播音效果。
- **智慧试炼**：原有八种题型及新增六种词汇专项类型。选择类题目自动批改并解析；翻译、表达、纠错和无选项填空题显示参考与评分要点，由用户自评，避免按字符串误判。选项打乱后展示。新增知识可通过知识包导入相应题目。
- **错题与复习**：每题记录答案、错误次数和答题历史。首次答对次日复习，之后连续答对分别安排 3、7、14、30 天后复习；答错重置为次日。第 5 阶段后保持 30 天复习。某知识的全部关联题都达到第 5 阶段且最近答对，才计为已掌握。
- **导入和备份**：先校验、预览再确认。稳定 ID 去重，默认不覆盖，同 ID 更新需勾选确认；保留学习进度。完整备份包括知识、题目、收藏、答题历史和计划，恢复前预览并明确提示覆盖。可导出原始存储排查损坏。

请定期导出备份。浏览器清理、隐私模式关闭、设备损坏都会造成数据丢失；静态部署升级通常不会清除同站点存储。前端对存储失败明确报错，不把失败保存伪装为成功。

## 每日知识包

见 [导入格式与 ChatGPT 生成指引](docs/IMPORT.md)、[JSON Schema](public/knowledge-pack.schema.json)、[完整示例](public/examples/starter.json)。Schema 版本为 `1`，导入限制 10 MB。示例中的音频 URL 可选，不提供伪造音频资源。

## 架构与后续同步

- `src/core.ts`：类型、校验、合并、复习调度、备份及 `StudyRepository` 持久化接口。
- `src/main.tsx`：页面与学习交互；`src/Audio.tsx`：语音和麦克风生命周期。
- `src/style.css`：响应式样式；`src/seed.json`：首次初始化内容。
- `public/`：可下载的 Schema 和示例包；`tests/`：端到端测试。

未来接入 Supabase：在 `StudyRepository` 边界增加异步适配层与登录状态；按用户隔离知识、题目、收藏、进度和历史，服务端设置 Row Level Security，再增加版本号/更新时间解决多设备冲突。当前版本没有远端同步或用户认证。不要将 service-role、模型 API 或其他私密密钥写入前端；需要模型功能时通过受控服务端代理。Supabase 的公开浏览器配置也必须配合认证及 RLS，不能把本地数据直接暴露为公共表。

## 部署到公开网址

执行 `npm ci && npm run build`，部署 `dist/` 即可。配置采用相对资源路径，支持 GitHub Pages 的仓库子路径。

### Vercel / Netlify

导入 GitHub 仓库；构建命令 `npm run build`，发布目录 `dist`，Node 版本选 22 或 24。不需要环境变量或后端服务。平台部署后提供 HTTPS 公网网址。域名更换前请导出备份再到新站点恢复。

### GitHub Pages

仓库已提供 `.github/workflows/pages.yml`。合并到 `main` 后，在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。推送 `main` 或在 Actions 手动运行 **Deploy Wisdom House**。成功后可访问 `https://<用户名>.github.io/bayt-al-hikma/`，以仓库 Pages 面板实际地址为准。需要有该仓库的 Actions/Pages 权限。

此交付仅创建代码和部署工作流，不自动向 GitHub 推送、不自动开通 Pages，也不声明已生成公网网站。

## Git 交付与合并

开发提交保存在当前 `work` 分支。推送并提 PR 的推荐方式：

```bash
git push -u origin work
# 在 GitHub 以 main 为 base、work 为 compare 创建 Pull Request
# 或在已完成 GitHub CLI 登录的本机：
gh pr create --base main --head work --title 'feat: 智慧宫阿语学习网站' --body '完成知识库、语音跟读、每日练习、间隔复习、导入和备份；附测试与部署文档。'
```

也可以由有权限的维护者在干净工作区合并：

```bash
git switch main
git pull --ff-only origin main
git merge --no-ff work
git push origin main
```

合并前建议运行 `npm ci && npm test && npm run build`，以及安装 Chromium 后的端到端测试。请不要覆盖自己的未提交修改。

验证范围与浏览器能力限制见 [验证记录](docs/VALIDATION.md)。Amiri 字体按 SIL Open Font License 1.1 分发，许可随部署保存在 `public/licenses/Amiri-OFL.txt`。修改 Schema 或首批示例时以 `src/knowledge-pack.schema.json` 与 `src/seed.json` 为源，开发启动和构建会自动同步下载文件。

## 深度词汇档案升级

知识详情新增八个标签页：基本释义、词形变化、词根词族、近反义词、固定搭配、例句、易混辨析、练习。沿用现有正常 / 慢速朗读、录音、收藏及复习功能。名词双数、破碎复数、阴阳性、动词六类词形与常见人称可逐步补充；关系条目区分严格近义、相关词和语义对立。没有资料不会自动编造。

在“知识包与备份”下载深度词汇示例后导入，可体验三个互相链接的 ك ت ب 词族档案与十类技能练习。新示例不会自动写入现有学习库。`src/vocabulary.ts` 定义可选结构，`src/VocabularyProfile.tsx` 负责分区展示；`src/vocabulary-sample.json` 构建时同步到下载目录。

本次仍使用 v1 数据和原 `hikma-v1` 存储键，旧知识包、备份继续接受。同 ID 默认保留；勾选更新时对知识递归补充，避免遗漏字段造成资料丢失。题目整条更新；收藏、错题、历史及间隔计划保持。完整约定见 [IMPORT.md](docs/IMPORT.md)。Schema 只保证数据结构，不能替代语言事实核对。

部署继续使用原 `.github/workflows/pages.yml`，合并到 main 才触发现有 GitHub Pages 流程。

## 阿塞拜疆校服新闻专题

本批上传资料经明确适配器转换为 **51 组动词卡片、55 条分类术语及 277 道练习**。新版首次加载时追加到现有学习库，保留相同 ID 的用户内容、收藏和复习记录；不清空存储。在“每日知识库”点击“查看新闻专题”可按新闻主题分组，或进入专题练习。原始 JSON 也可直接从导入入口选择，由适配器转换后预览。

运行 `npm run convert:news` 可复现生成；转换报告及知识包可从网页下载。原始格式、字段映射、特殊词形与数据保留机制见 [专题导入说明](docs/NEWS-IMPORT.md)。新闻事实未独立核验，例句为上传包提供的教学例句。

## 海绵宝宝01专题

新增 **54 组动词搭配、54 条词汇、283 道练习**，与已有校服新闻专题共同保留。在“每日知识库”点击“查看海绵宝宝01”按原主题学习；4 条字幕核对备注可展开查看。源包没有逐条 source/usage_note，且词汇字段与新闻包不同，已显式适配；含中文说明的动名词字段不作为标准词形硬填。

运行 `npm run convert:sponge` 可重建标准知识包与报告；旧学习数据和进度不清空。详见 [动画专题导入说明](docs/SPONGE-IMPORT.md)。

## 点选练习、背单词与批注

全部练习在作答时转换为选择题，无需输入答案。保留原题 ID、标准答案和已有记录；旧知识包仍能导入，原始题型与评分字段只用于数据兼容，学习界面统一点选。无选项旧题从现有题目/卡片的真实答案中选择干扰项；没有可用干扰项时提供“以上均不符合”，不编造阿语词形。

新增“背单词”：按分类、收藏或到期筛选，每轮 10/20/50 张；先看阿语，点击显示释义，再标记认识或再学。不熟悉的词在本轮末尾追加一次，并按 1/3/7/14/30 天计划保存独立背词进度。已有题目进度不改动。

知识详情和背词翻面均支持“我的批注”，可中阿混写、编辑和保存；批注、背词进度随完整备份恢复。仍使用原 hikma-v1/version:1，仅追加可选字段 annotations/wordProgress。删除知识时同步移除该词批注与背词记录，其他词不变。

阿语标题、词形、例句、选择项与 RTL 输入区统一指定 Times New Roman；混排正文通过仅覆盖阿语 Unicode 范围的本地字体映射优先使用 Times New Roman。字体由设备提供，不分发未授权的商业字体文件。
