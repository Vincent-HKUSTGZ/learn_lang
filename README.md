# Little English

面向中文母语英语初学者的个人学习网站。现有三门完整课程：自我介绍（A1）、日常生活（A1–A2）、食物与喜好（A2）。

## 学习流程

- 先写学习前的表达，最后与自己的新表达对照
- BBC 原声短片段盲听 + 大意选择题
- 本站原创对话：每课 8 道听写，判题、提示、答案、重试与错题本
- 逐句中英对照、英式发音提示、跟读录音和下载
- 每课 3 个语法点、4 个短语、4 个词汇、文化与语境
- 自由表达、句式模板、文本回顾与 10 分钟／次日复习卡

答题采用标准答案和显式同义答案匹配，忽略大小写、标点及部分常见缩写。查看答案后的正确输入不会计为独立答对，必须重新听写。自由表达和录音只供自查，不宣称自动评分。

## 音频与来源

网页使用本地静态音频，不依赖 YouTube iframe 或浏览器 speechSynthesis。播放器进度来自音频真实时长；支持拖动、慢速、循环和单句播放，同一时间只播放一个音频。

| 课程 | 官方视频 | 本站引用区间 |
| --- | --- | --- |
| 自我介绍 | https://www.youtube.com/watch?v=I_tRSrPru94 | 14.038–21.944 秒 |
| 日常生活 | https://www.youtube.com/watch?v=bq6GBbh3uhU | 21.040–37.480 秒 |
| 食物 | https://www.youtube.com/watch?v=4C4wlOAscvY | 69.840–82.240 秒 |

BBC 原声仅用于简短教学引用，文字每段不超过 25 个词；封面取自视频画面，原视频版权属于原作者。所有来源在课程内可点击。本项目与 BBC 无隶属关系。

听写、跟读、短语和词汇为本站编写的配套内容，使用 en-GB-SoniaNeural / en-GB-RyanNeural 英式 AI 音频，**不是 BBC 原声或完整视频转录**。两种音频在页面中明确区分。

## 本地进度

进度、输入、错题、收藏、复习时间和自查保存在当前浏览器 `little-english-v1` 中，不上传。旧法语进度键未清除。更换浏览器、设备或访问域名不会自动同步；可下载 JSON 备份并在新浏览器恢复。恢复仅填充尚未开始的课程，不覆盖已有课程。录音只在内存中暂存，刷新前请下载。

## 本地运行

```bash
pnpm install
pnpm dev
```

## GitHub Pages

```bash
pnpm build:pages
```

静态网站生成到 `docs/`，可由 GitHub Pages 直接发布。

现有 GitHub Actions 发布 `main` 分支中的 `docs/`。更新后先构建，再提交源代码和 `docs/`。现有公开网址为 https://zhensun.cn/learn_lang/ 。

## 校验

```bash
node scripts/test-english.mjs
pnpm exec tsc --noEmit --incremental false
pnpm build
pnpm build:pages
```

## 后续增加或更换课程

- `lib/english/catalog.ts`：课程书架元信息和官方视频 URL。
- `lib/english/courses.json`：场景对话、题目、答案、解析、短语、词汇和输出任务。
- `public/english/`：课程封面与实际音频。数据中的数组顺序必须与文件编号一致。
- `lib/english/audio-manifest.json`：实际时长和逐句定位，由音频脚本生成，不手填估计值。
- `scripts/prepare-english-audio.py --source-dir <目录>`：输入已取得的合法素材文件，提取声明区间并生成配套 AI 音频。需安装 `edge-tts` 和 `imageio-ffmpeg`；使用语音服务需联网。文本或声音变更会根据输入指纹重新生成，不会沿用旧发音。

新增课程 ID 时同步更新目录、内容、脚本来源映射、进度校验允许的 ID 和测试。不要把未校对的字幕当作练习答案，也不要将 AI 生成音频标注为博主原声。
