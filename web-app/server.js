/**
 * html-ppt Web App — server.js
 *
 * 架构说明：
 *   - html-ppt-skill 是核心（SKILL.md + assets + templates），保持不动
 *   - 本 server 的作用只是：接收用户输入 → 调用 DeepSeek API（带完整 SKILL.md 上下文）
 *     → 得到 AI 生成的 HTML → 保存到 examples/generated/ → 返回路径给前端预览
 *   - Express 把整个项目根目录挂为静态文件，生成的 HTML 里的 /assets/... 路径天然可用
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const OpenAI  = require('openai');
const puppeteer = require('puppeteer');

const app  = express();
const ROOT = path.join(__dirname, '..');   // html-ppt-skill 项目根目录
const GEN  = path.join(ROOT, 'examples', 'generated');

app.use(express.json({ limit: '4mb' }));

// ── 静态文件：把整个 html-ppt-skill 根目录挂出去 ─────────────────────────────
// 这样生成的 HTML 里的 /assets/themes/xxx.css、/assets/runtime.js 等路径全部可用
app.use(express.static(ROOT));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── 工具：读文件 ──────────────────────────────────────────────────────────────
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

// ── 系统提示：完整 SKILL.md + 所有 references ────────────────────────────────
// 和 Cursor Agent 读到的上下文完全一样
const SYSTEM_PROMPT = [
  read('SKILL.md'),
  '---\n# references/themes.md\n'     + read('references/themes.md'),
  '---\n# references/layouts.md\n'    + read('references/layouts.md'),
  '---\n# references/animations.md\n' + read('references/animations.md'),
  '---\n# references/full-decks.md\n' + read('references/full-decks.md'),
  `---
# 路径规则（本 web 应用专用）

本应用用 Express 把 html-ppt-skill 项目根目录挂在 / 下，所以生成的 HTML 里
所有 asset 路径改用绝对路径：

  /assets/fonts.css
  /assets/base.css
  /assets/themes/<主题名>.css
  /assets/animations/animations.css
  /assets/runtime.js
  /assets/animations/fx-runtime.js   （仅在用 data-fx 时才引入）

body 标签的 data-themes / data-theme-base 也用绝对路径：
  <body data-themes="tokyo-night,aurora,minimal-white" data-theme-base="/assets/themes/">

# 输出格式要求

- 只输出完整 HTML 文件，从 <!DOCTYPE html> 开始
- 不要包含 markdown 代码块（不要 \`\`\`html ... \`\`\`）
- 不要在 HTML 前后加任何解释文字
- **结构必须是 <body> → <div class="deck"> → 多个 <section class="slide">**
  （runtime.js 找不到 .deck 就完全不启动，翻页 / 键盘 / 演讲者模式全部失效）
- 第一张 slide 必须带 is-active：<section class="slide is-active">
- 每张幻灯片必须有 <div class="notes">...</div>（演讲备注）
- 所有颜色只用 CSS 变量 var(--xxx)，不要硬编码色值
- **不要**在幻灯片内容里加页码角标（如"1/8"、"第2页"等），页码由外部 UI 统一展示
- 最后一个 script 必须是 <script src="/assets/runtime.js"></script>

# 最小结构示例

<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>...</title>
  <link rel="stylesheet" href="/assets/fonts.css">
  <link rel="stylesheet" href="/assets/base.css">
  <link rel="stylesheet" id="theme-link" href="/assets/themes/tokyo-night.css">
  <link rel="stylesheet" href="/assets/animations/animations.css">
</head>
<body data-themes="tokyo-night,aurora,minimal-white" data-theme-base="/assets/themes/">
  <div class="deck">
    <section class="slide is-active" data-title="封面">
      <h1>...</h1>
      <div class="notes">...</div>
    </section>
    <section class="slide" data-title="第二页">
      ...
      <div class="notes">...</div>
    </section>
  </div>
  <script src="/assets/runtime.js"></script>
</body>
</html>`,
].join('\n\n');

// ── API：获取可用模板列表 ─────────────────────────────────────────────────────
app.get('/api/templates', (_req, res) => {
  const dir = path.join(ROOT, 'templates', 'full-decks');
  try {
    const list = fs.readdirSync(dir)
      .filter(d => fs.statSync(path.join(dir, d)).isDirectory())
      .map(name => {
        const readme = read(`templates/full-decks/${name}/README.md`);
        const lines  = readme.split('\n').filter(Boolean);
        const label  = (lines.find(l => l.startsWith('#')) || '').replace(/^#+\s*/, '') || name;
        const desc   = lines.find(l => !l.startsWith('#')) || '';
        return { name, label, desc: desc.slice(0, 120) };
      });
    res.json(list);
  } catch { res.json([]); }
});

// ── API：获取可用主题列表（直接从 assets/themes/*.css 解析 CSS 变量） ─────────
function parseThemeCss(cssText) {
  // 匹配 --bg:#xxx 或 --accent:#xxx，跳过 gradient 等
  const get = (name) => {
    const re = new RegExp(`--${name}\\s*:\\s*([^;]+);`, 'i');
    const m = re.exec(cssText);
    if (!m) return null;
    let v = m[1].trim();
    // 取第一个颜色值（避免 linear-gradient 整段返回）
    const hex = /#[0-9a-f]{3,8}\b/i.exec(v);
    if (hex) return hex[0];
    const rgb = /rgba?\([^)]+\)/i.exec(v);
    if (rgb) return rgb[0];
    return v;
  };
  const bg     = get('bg')     || '#fff';
  const accent = get('accent') || get('accent-1') || '#666';
  // 简易亮/暗判断：取 bg 的亮度
  const isDark = (() => {
    const hex = /^#([0-9a-f]{3,8})$/i.exec(bg);
    if (!hex) return false;
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return (r*299 + g*587 + b*114) / 1000 < 128;
  })();
  return { accent, bg, dark: isDark };
}

app.get('/api/themes', (_req, res) => {
  const dir = path.join(ROOT, 'assets', 'themes');
  try {
    const list = fs.readdirSync(dir)
      .filter(f => f.endsWith('.css'))
      .map(f => {
        const name = f.replace('.css', '');
        const css  = read(`assets/themes/${f}`);
        return { name, ...parseThemeCss(css) };
      });
    res.json(list);
  } catch { res.json([]); }
});

// ── API：生成 PPT（SSE 流式） ─────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const {
    prompt,          // 用户的 PPT 需求
    slideCount = 8,  // 页数
    baseTemplate,    // 选择的基础模板（full-deck 名称）
    theme,           // 选择的主题
    apiKey,
    model = 'deepseek-v4-pro',
    enableThinking = false,
  } = req.body;

  if (!prompt?.trim()) return res.status(400).json({ error: '请填写 PPT 需求' });
  const key = apiKey?.trim() || process.env.DEEPSEEK_API_KEY;
  if (!key) return res.status(400).json({ error: '请填写 DeepSeek API Key' });

  // SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const sse = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const deckId = `deck-${Date.now()}`;

  try {
    const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: key });

    // ── 构建用户消息（和在 Cursor 里说的话一样） ──
    let userMsg = '';

    // 如果选了基础模板，把模板 HTML 作为参考
    if (baseTemplate) {
      const tplHtml = read(`templates/full-decks/${baseTemplate}/index.html`);
      const tplCss  = read(`templates/full-decks/${baseTemplate}/style.css`);
      const tplNote = read(`templates/full-decks/${baseTemplate}/README.md`);
      if (tplHtml) {
        userMsg += `## 参考模板：${baseTemplate}\n`;
        userMsg += `说明：${tplNote}\n\n`;
        userMsg += `模板 HTML（参考结构和风格，内容替换为用户需求）：\n\`\`\`html\n${tplHtml}\n\`\`\`\n\n`;
        if (tplCss) userMsg += `模板 CSS（内联进 <style> 块）：\n\`\`\`css\n${tplCss}\n\`\`\`\n\n`;
      }
    }

    // 主题指定
    if (theme) {
      userMsg += `## 指定主题：${theme}\n`;
      userMsg += `<link rel="stylesheet" id="theme-link" href="/assets/themes/${theme}.css">\n\n`;
    }

    // 核心需求（页数明确写出来）
    userMsg += `## 用户需求\n${prompt}\n\n`;
    userMsg += `## 硬性要求\n`;
    userMsg += `- 必须恰好生成 **${slideCount} 张幻灯片**（即 ${slideCount} 个 <section class="slide"> 元素）\n`;
    userMsg += `- 资源路径全部用 /assets/... 绝对路径\n`;
    userMsg += `- 输出完整 HTML，不加任何 markdown 包裹或解释文字\n`;

    sse('status', { message: `🤖 调用 ${model} · ${slideCount} 页 · ${theme || '自动选主题'}` });

    const params = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMsg },
      ],
      stream: true,
      max_tokens: 16000,
    };
    if (enableThinking) {
      params.thinking = { type: 'enabled' };
      params.reasoning_effort = 'high';
    }

    const stream = await openai.chat.completions.create(params);

    let html = '';
    let thinkLen = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta ?? {};
      if (delta.reasoning_content) {
        thinkLen += delta.reasoning_content.length;
        sse('thinking', { text: delta.reasoning_content });
      }
      if (delta.content) {
        html += delta.content;
        sse('token', { text: delta.content });
      }
    }

    // 去掉 AI 可能加的 markdown 包裹
    let clean = html
      .replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    if (!clean.toLowerCase().startsWith('<!doctype') && !clean.toLowerCase().startsWith('<html')) {
      return sse('error', { message: '模型输出不是有效 HTML，请重试。' }), res.end();
    }

    // ── 后处理：保证结构正确 ─────────────────────────────────────────────
    // 1. 统计 slide 数量
    const slideMatches = clean.match(/<section[^>]*class\s*=\s*["'][^"']*\bslide\b[^"']*["'][^>]*>/gi) || [];
    const actualCount  = slideMatches.length;

    // 2. 若没有 <div class="deck"> 包裹，自动补上
    if (!/<div[^>]*class\s*=\s*["'][^"']*\bdeck\b/i.test(clean) && actualCount > 0) {
      // 找到第一个 <section class="slide"> 前插入 <div class="deck">，</body> 前闭合
      const firstIdx = clean.search(/<section[^>]*class\s*=\s*["'][^"']*\bslide\b/i);
      const bodyEnd  = clean.search(/<\/body>/i);
      if (firstIdx >= 0 && bodyEnd > firstIdx) {
        clean = clean.slice(0, firstIdx)
              + '<div class="deck">\n'
              + clean.slice(firstIdx, bodyEnd)
              + '</div>\n'
              + clean.slice(bodyEnd);
      }
    }

    // 3. 第一个 slide 没有 is-active 就加上
    if (!/<section[^>]*\bis-active\b/i.test(clean)) {
      clean = clean.replace(
        /<section(\s+[^>]*?)?class\s*=\s*["']([^"']*\bslide\b[^"']*)["']/i,
        (_m, attrs = '', cls) => `<section${attrs || ''}class="${cls} is-active"`
      );
    }

    // 4. 保证有 runtime.js（AI 偶尔会漏）
    if (!/\/assets\/runtime\.js/.test(clean)) {
      clean = clean.replace(/<\/body>/i, '<script src="/assets/runtime.js"></script>\n</body>');
    }

    // 保存
    fs.mkdirSync(path.join(GEN, deckId), { recursive: true });
    fs.writeFileSync(path.join(GEN, deckId, 'index.html'), clean, 'utf8');

    const countMsg = actualCount === slideCount
      ? `✅ 完成 · ${actualCount} 页`
      : `⚠ AI 生成了 ${actualCount} 页（你要 ${slideCount} 页，可点击「生成」重试）`;

    sse('complete', {
      deckId,
      previewUrl: `/examples/generated/${deckId}/index.html`,
      htmlLen: clean.length,
      thinkLen,
      actualCount,
      requestedCount: slideCount,
      message: countMsg,
    });

  } catch (err) {
    sse('error', { message: `❌ ${err?.message ?? err}` });
  }
  res.end();
});

// ── API：导出 PDF ─────────────────────────────────────────────────────────────
// 思路：puppeteer 打开 deck，遍历每张 slide（用 hash #/n），截屏为 PDF 页拼起来
let _browser = null;
async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  _browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}

app.post('/api/export/:deckId/pdf', async (req, res) => {
  const deckId = req.params.deckId.replace(/[^a-z0-9-]/gi, '');
  const htmlPath = path.join(GEN, deckId, 'index.html');
  if (!fs.existsSync(htmlPath)) return res.status(404).json({ error: 'deck not found' });

  // 16:9 标准 slide 尺寸 1920x1080（base.css 的 @media print 已配置 page-break-after:always）
  const W = 1920, H = 1080;
  const port = req.app.locals.port || 3000;
  const url  = `http://localhost:${port}/examples/generated/${deckId}/index.html`;

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    await page.emulateMediaType('print');

    // 注入打印样式 + 直接操作 DOM 强制 slide 垂直堆叠
    await page.evaluate((W, H) => {
      // 移除 runtime.js 注入的演讲者控件、进度条等
      ['#presenter-overlay','#presenter-toggle','.nav-hint','.deck-progress','.progress-bar','.overview','.notes-overlay']
        .forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));

      // 注入终极覆盖样式
      const style = document.createElement('style');
      style.textContent = `
        @page { size: ${W}px ${H}px; margin: 0; }
        html, body {
          margin: 0 !important; padding: 0 !important;
          width: ${W}px !important; height: auto !important;
          overflow: visible !important;
        }
        .deck {
          position: static !important;
          width: ${W}px !important;
          height: auto !important;
          overflow: visible !important;
          display: block !important;
        }
        .slide, section.slide {
          position: relative !important;
          display: flex !important;
          width:  ${W}px !important;
          height: ${H}px !important;
          opacity: 1 !important;
          visibility: visible !important;
          transform: none !important;
          pointer-events: auto !important;
          page-break-after: always !important;
          break-after: page !important;
          overflow: hidden !important;
          z-index: auto !important;
          inset: auto !important;
          top: auto !important; left: auto !important;
          margin: 0 !important;
        }
        .slide:last-child { page-break-after: auto !important; break-after: auto !important; }
        /* 入场动画状态强制成最终态 */
        [data-anim], [class*="anim-"] {
          opacity: 1 !important;
          transform: none !important;
          animation: none !important;
          transition: none !important;
        }
        .notes { display: none !important; }
      `;
      document.head.appendChild(style);
    }, W, H);

    // 等一下让浏览器重排 + 字体/图片加载
    await new Promise(r => setTimeout(r, 800));

    const total = await page.evaluate(() => {
      return document.querySelectorAll('.deck .slide, section.slide').length;
    });
    if (!total) {
      await page.close();
      return res.status(400).json({ error: '未找到 slide 元素' });
    }

    const pdfBuf = await page.pdf({
      width:  `${W}px`,
      height: `${H}px`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await page.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${deckId}.pdf"`);
    res.setHeader('X-Slide-Count', String(total));
    res.end(pdfBuf);
  } catch (e) {
    console.error('PDF 导出失败', e);
    res.status(500).json({ error: e.message });
  }
});

// ── API：历史记录 ─────────────────────────────────────────────────────────────
app.get('/api/decks', (_req, res) => {
  try {
    fs.mkdirSync(GEN, { recursive: true });
    const list = fs.readdirSync(GEN)
      .filter(d => fs.existsSync(path.join(GEN, d, 'index.html')))
      .sort().reverse().slice(0, 30)
      .map(d => ({ id: d, url: `/examples/generated/${d}/index.html`, ts: d.replace('deck-', '') }));
    res.json(list);
  } catch { res.json([]); }
});

app.delete('/api/decks/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9-]/gi, '');
  try { fs.rmSync(path.join(GEN, id), { recursive: true, force: true }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 启动 ──────────────────────────────────────────────────────────────────────
function start(port) {
  const srv = app.listen(port, () => {
    app.locals.port = port;   // 让 puppeteer 知道当前端口
    console.log(`\n🚀  html-ppt Web App  →  http://localhost:${port}`);
    console.log(`   项目根目录: ${ROOT}\n`);
  });
  srv.on('error', e => {
    if (e.code === 'EADDRINUSE') { console.log(`   端口 ${port} 被占用，尝试 ${port + 1}...`); start(port + 1); }
    else throw e;
  });
}
start(Number(process.env.PORT) || 3000);

// 优雅退出，关闭 puppeteer
process.on('SIGINT',  async () => { if (_browser) await _browser.close().catch(()=>{}); process.exit(0); });
process.on('SIGTERM', async () => { if (_browser) await _browser.close().catch(()=>{}); process.exit(0); });




git remote add origin git@github-personal:zouyunchong//SKILL-TO-PPT.git
git branch -M master
git push -u origin master
