# html-ppt 使用指南

> **致敬与声明**
> 本项目基于 [**lewislulu/html-ppt-skill**](https://github.com/lewislulu/html-ppt-skill) 搭建而来。
> 原项目是一份面向 AI Agent 的 **AgentSkill**：36 套主题 / 15 个完整 deck 模板 /
> 31 种布局 / 47 个动效（27 CSS + 20 Canvas FX）+ 演讲者模式，纯静态 HTML/CSS/JS。
>
> 在保留全部原始资产（`assets/`、`templates/`、`references/`、`SKILL.md`）的基础上，
> 本仓库**新增 `web-app/` 目录**，把原本只能在 Cursor/Claude Code 等 Agent 环境里用
> 自然语言触发的 Skill，封装成一个**普通用户也能在浏览器里点点点**的 Web 应用：
> 填需求 → DeepSeek 生成 → 实时预览 → 一键导出 PDF。
>
> 原项目作者：**lewis** &lt;sudolewis@gmail.com&gt; · License: **MIT**
> 原项目地址：<https://github.com/lewislulu/html-ppt-skill>

本仓库包含两层能力：

| 层 | 路径 | 来源 | 适用人群 |
|---|---|---|---|
| **html-ppt-skill**（核心 Skill） | 仓库根目录 | 来自 `lewislulu/html-ppt-skill` | 想让 Cursor / Claude Code 等 AI Agent 帮你直接编辑 HTML 演示稿的人 |
| **html-ppt-web**（Web 应用，本指南重点） | `web-app/` | 本项目新增 | 想在浏览器里填表单、点按钮就能用 AI 生成 PPT 并导出 PDF 的人 |

> 原项目说明、Skill 完整能力详见 [README.zh-CN.md](README.zh-CN.md) 或原仓库
> <https://github.com/lewislulu/html-ppt-skill>。本文聚焦 **web-app 的安装、使用、导出**。

---

## 1. 环境要求

| 工具 | 版本 | 安装方式 |
|---|---|---|
| **Git** | 任意 | `brew install git` / 系统包管理器 |
| **Node.js** | ≥ 18 | [nodejs.org](https://nodejs.org/) 或 `brew install node` |
| **Google Chrome** | 任意（PDF 导出用到 headless） | macOS 通常已自带 |
| **DeepSeek API Key** | 必须 | 注册 [platform.deepseek.com](https://platform.deepseek.com/) 拿 `sk-...` |

---

## 2. 拉代码 & 安装

```bash
# 1. 克隆仓库
git clone https://github.com/lewislulu/html-ppt-skill.git
cd html-ppt-skill

# 2. 进入 web-app 子目录，安装依赖
cd web-app
npm install
```

> 第一次 `npm install` 会下载 puppeteer 自带的 Chromium（约 200MB），需要几分钟，请耐心等。

---

## 3. 启动服务

```bash
# 在 web-app 目录里
npm run dev      # 开发模式（文件变动自动重启）
# 或
npm start        # 生产模式
```

终端会输出：

```
🚀  html-ppt Web App  →  http://localhost:3000
   项目根目录: /xxx/html-ppt-skill
```

> 如果 3000 被占用，会自动尝试 3001、3002…

浏览器打开提示的地址即可。

---

## 4. 使用流程

### 4.1 填表生成

打开页面后，左侧侧边栏从上到下填：

1. **DeepSeek API Key** — 粘贴你的 `sk-...`，浏览器会自动记住（仅本地 `localStorage`）
2. **模型** — 默认 `deepseek-v4-pro`（旗舰）；`flash` 更便宜；不放心可勾「开启思考模式」（更慢更准）
3. **幻灯片页数** — 1 ~ 60，常用 6~12
4. **主题** — 36 套主题，留空则 AI 自动选；想换换风格选 `tokyo-night`、`aurora`、`cyberpunk-neon`…
5. **基础模板** — 15 个完整 deck 作参考；留空则 AI 从零设计
6. **快速示例** — 直接点一下填进 prompt
7. **PPT 需求** — 描述你想要什么，例如：
   > "2026 AI 技术现状与趋势，高大上风格，含实际案例和数据"

点 **「⚡ 生成 PPT」** 或按 `⌘ + ↵`。

### 4.2 预览 & 翻页

生成完成后右侧自动显示预览。**键盘快捷键**（先点击预览区获得焦点）：

| 键 | 功能 |
|---|---|
| `← →` | 翻页 |
| `T` | 切换主题（如果 `data-themes` 列出了多个） |
| `S` | 演讲者模式（含演讲备注、计时器、下一页预览） |
| `O` | 幻灯片总览 |
| `F` | 全屏 |
| `A` | 切换动画风格 |

也可以用预览区左右两侧的 **◀ ▶** 按钮翻页。

### 4.3 导出 PDF

点顶栏右上角的 **「⬇ 导出 PDF」**：

- 后端用 headless Chrome 进入 **打印模式**，把所有 slide 按 16:9（1920×1080）排版导出
- 入场动画、演讲者控件自动隐藏
- 单页 ≈ 100~300KB，10 页通常 1~3MB
- 文件名格式：`deck-<时间戳>.pdf`

也可以点 **「下载 HTML」** 拿到自包含的 HTML 文件，离线打开仍可翻页演示。

---

## 5. 项目结构

```
html-ppt-skill/
├── README.zh-CN.md               ← 原项目总览（Skill 用法）
├── USAGE.md                       ← 本文档（web-app 用法）
├── SKILL.md                       ← AI Agent 读取的能力说明
├── assets/                        ← 主题、字体、动画、运行时
│   ├── themes/*.css               36 套主题
│   ├── animations/                CSS + Canvas FX 动效
│   ├── base.css                   核心布局
│   └── runtime.js                 键盘导航、演讲者模式
├── templates/                     完整模板（15 个 full-decks + 31 个单页布局）
├── references/                    主题/布局/动画清单文档
├── examples/                      示例 deck
│   └── generated/                 web-app 生成的 deck 都在这里
├── scripts/                       原项目脚本（new-deck.sh、render.sh）
└── web-app/                       Web 应用 ★
    ├── server.js                  Express 后端 + DeepSeek 调用 + PDF 导出
    ├── public/index.html          前端 UI（单文件）
    └── package.json
```

**核心原则：** `web-app/` 只是触发器，html-ppt-skill 是核心。AI 拿到的系统提示 =
`SKILL.md` + `references/*.md`（和在 Cursor 里直接使用 Skill 时一模一样），生成的 HTML
里所有 `/assets/...` 路径由 Express 把仓库根目录挂为静态自动服务。

---

## 6. 常见问题

**Q: API Key 安全吗？**
A: Key 只存在你浏览器的 `localStorage`，每次请求由前端发到本地 server 转发给 DeepSeek。
   server 不持久化 key，仅当次请求使用。

**Q: 为什么生成的页数和我要的不一样？**
A: AI 不严格遵守页数要求时，server 会在日志区显示 `⚠ AI 实际生成 N 页（期望 M）`，
   点「生成」重试通常即可。或换用 `deepseek-v4-pro` + 开启思考模式。

**Q: 导出的 PDF 只有一页？**
A: 确保 server 是最新版（v1+）。旧版有这个 bug，已修复（用 `@media print` +
   强制 slide 垂直堆叠）。重启 server 即可。

**Q: 想加新主题/模板/动画？**
A: 直接在对应目录放新文件即可：
   - 主题：`assets/themes/<name>.css`（参考 `tokyo-night.css` 的 CSS 变量结构）
   - 模板：`templates/full-decks/<name>/{index.html,style.css,README.md}`
   - 动画：`assets/animations/animations.css` 加 keyframes，或 `fx/<name>.js` 加 Canvas FX

   重启 server 自动识别（侧边栏列表会更新）。

**Q: 端口被占用？**
A: server 会自动尝试 +1，或设置环境变量：`PORT=8080 npm run dev`

**Q: 想跑在远程服务器对外提供？**
A: 用 `pm2 start server.js --name html-ppt` 守护，前面挂 nginx 反向代理。
   注意：API Key 应在 server `.env` 里设置 `DEEPSEEK_API_KEY=sk-...`，避免每个用户填。

---

## 7. 进阶：把生成结果当作普通 deck 使用

`web-app/` 把生成的 HTML 存到 `examples/generated/deck-<时间戳>/index.html`，所以：

```bash
# 直接用项目原有的截图脚本导出每张 PNG
./scripts/render.sh examples/generated/deck-1778558331542/index.html all

# 拿出来当起点继续编辑
cp examples/generated/deck-xxx/index.html examples/my-talk/index.html
```

也可以把生成的 HTML 当作新 `templates/full-decks/` 模板提交回仓库。

---

## 致谢

* 核心 Skill（`assets/`、`templates/`、`references/`、`SKILL.md`、`scripts/`）来自
  [**lewislulu/html-ppt-skill**](https://github.com/lewislulu/html-ppt-skill)，作者 lewis &lt;sudolewis@gmail.com&gt;。
* `web-app/` 目录是本仓库新增的封装层，把 Skill 接入浏览器 + DeepSeek API + PDF 导出。

如果你觉得有用，请去原项目点个 ⭐：<https://github.com/lewislulu/html-ppt-skill>

---

**License: MIT** · 详见 [LICENSE](LICENSE)
