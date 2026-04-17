/* html-ppt :: runtime.js
 * Keyboard-driven deck runtime. Zero dependencies.
 *
 * Features:
 *   ← → / space / PgUp PgDn / Home End  navigation
 *   F  fullscreen
 *   S  presenter mode (opens a NEW WINDOW with current/next slide preview + notes + timer)
 *       The original window stays as audience view, synced via BroadcastChannel.
 *       Slide previews use CSS transform:scale() at design resolution for pixel-perfect layout.
 *   N  quick notes overlay (bottom drawer)
 *   O  slide overview grid
 *   T  cycle themes (reads data-themes on <html> or <body>)
 *   A  cycle demo animation on current slide
 *   URL hash #/N  deep-link to slide N (1-based)
 *   Progress bar auto-managed
 */
(function () {
  'use strict';

  const ANIMS = ['fade-up','fade-down','fade-left','fade-right','rise-in','drop-in',
    'zoom-pop','blur-in','glitch-in','typewriter','neon-glow','shimmer-sweep',
    'gradient-flow','stagger-list','counter-up','path-draw','parallax-tilt',
    'card-flip-3d','cube-rotate-3d','page-turn-3d','perspective-zoom',
    'marquee-scroll','kenburns','confetti-burst','spotlight','morph-shape','ripple-reveal'];

  function ready(fn){ if(document.readyState!='loading')fn(); else document.addEventListener('DOMContentLoaded',fn);}

  ready(function () {
    const deck = document.querySelector('.deck');
    if (!deck) return;
    const slides = Array.from(deck.querySelectorAll('.slide'));
    if (!slides.length) return;

    let idx = 0;
    const total = slides.length;

    /* ===== BroadcastChannel for presenter sync ===== */
    const CHANNEL_NAME = 'html-ppt-presenter-' + (location.pathname + location.search);
    let bc;
    try { bc = new BroadcastChannel(CHANNEL_NAME); } catch(e) { bc = null; }

    // Are we running inside the presenter popup?
    const isPresenterWindow = location.hash.indexOf('__presenter__') !== -1;

    /* ===== progress bar ===== */
    let bar = document.querySelector('.progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'progress-bar';
      bar.innerHTML = '<span></span>';
      document.body.appendChild(bar);
    }
    const barFill = bar.querySelector('span');

    /* ===== notes overlay (N key) ===== */
    let notes = document.querySelector('.notes-overlay');
    if (!notes) {
      notes = document.createElement('div');
      notes.className = 'notes-overlay';
      document.body.appendChild(notes);
    }

    /* ===== overview grid (O key) ===== */
    let overview = document.querySelector('.overview');
    if (!overview) {
      overview = document.createElement('div');
      overview.className = 'overview';
      slides.forEach((s, i) => {
        const t = document.createElement('div');
        t.className = 'thumb';
        const title = s.getAttribute('data-title') ||
          (s.querySelector('h1,h2,h3')||{}).textContent || ('Slide '+(i+1));
        t.innerHTML = '<div class="n">'+(i+1)+'</div><div class="t">'+title.trim().slice(0,80)+'</div>';
        t.addEventListener('click', () => { go(i); toggleOverview(false); });
        overview.appendChild(t);
      });
      document.body.appendChild(overview);
    }

    /* ===== navigation ===== */
    function go(n, fromRemote){
      n = Math.max(0, Math.min(total-1, n));
      slides.forEach((s,i) => {
        s.classList.toggle('is-active', i===n);
        s.classList.toggle('is-prev', i<n);
      });
      idx = n;
      barFill.style.width = ((n+1)/total*100)+'%';
      const numEl = document.querySelector('.slide-number');
      if (numEl) { numEl.setAttribute('data-current', n+1); numEl.setAttribute('data-total', total); }

      // notes (bottom overlay)
      const note = slides[n].querySelector('.notes, aside.notes, .speaker-notes');
      notes.innerHTML = note ? note.innerHTML : '';

      // hash
      const hashTarget = '#/'+(n+1);
      if (location.hash !== hashTarget && !isPresenterWindow) {
        history.replaceState(null,'', hashTarget);
      }

      // re-trigger entry animations
      slides[n].querySelectorAll('[data-anim]').forEach(el => {
        const a = el.getAttribute('data-anim');
        el.classList.remove('anim-'+a);
        void el.offsetWidth;
        el.classList.add('anim-'+a);
      });

      // counter-up
      slides[n].querySelectorAll('.counter').forEach(el => {
        const target = parseFloat(el.getAttribute('data-to')||el.textContent);
        const dur = parseInt(el.getAttribute('data-dur')||'1200',10);
        const start = performance.now();
        const from = 0;
        function tick(now){
          const t = Math.min(1,(now-start)/dur);
          const v = from + (target-from)*(1-Math.pow(1-t,3));
          el.textContent = (target % 1 === 0) ? Math.round(v) : v.toFixed(1);
          if (t<1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });

      // Broadcast to other window (audience ↔ presenter)
      if (!fromRemote && bc) {
        bc.postMessage({ type: 'go', idx: n });
      }
    }

    /* ===== listen for remote navigation ===== */
    if (bc) {
      bc.onmessage = function(e) {
        if (e.data && e.data.type === 'go' && typeof e.data.idx === 'number') {
          go(e.data.idx, true);
        }
      };
    }

    function toggleNotes(force){ notes.classList.toggle('open', force!==undefined?force:!notes.classList.contains('open')); }
    function toggleOverview(force){ overview.classList.toggle('open', force!==undefined?force:!overview.classList.contains('open')); }

    /* ========== PRESENTER MODE (new window) ========== */
    let presenterWin = null;

    function openPresenterWindow() {
      if (presenterWin && !presenterWin.closed) {
        presenterWin.focus();
        return;
      }

      // Collect all slides' HTML and notes
      const slideData = slides.map((s, i) => {
        const note = s.querySelector('.notes, aside.notes, .speaker-notes');
        return {
          html: s.outerHTML,
          notes: note ? note.innerHTML : '',
          title: s.getAttribute('data-title') ||
            (s.querySelector('h1,h2,h3')||{}).textContent || ('Slide '+(i+1))
        };
      });

      // Collect all stylesheets — use absolute URLs so popup can resolve them
      const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(el => {
        if (el.tagName === 'LINK') return '<link rel="stylesheet" href="' + el.href + '">';
        return '<style>' + el.textContent + '</style>';
      }).join('\n');

      // Collect body classes (e.g. tpl-presenter-mode-reveal) so scoped CSS works
      const bodyClasses = document.body.className || '';
      // Collect <html> attributes for theme variables
      const htmlAttrs = Array.from(root.attributes).map(a => a.name+'="'+a.value+'"').join(' ');

      const presenterHTML = buildPresenterHTML(slideData, styleSheets, total, idx, bodyClasses, htmlAttrs);

      presenterWin = window.open('', 'html-ppt-presenter', 'width=1200,height=800,menubar=no,toolbar=no');
      if (!presenterWin) {
        alert('请允许弹出窗口以使用演讲者视图');
        return;
      }
      presenterWin.document.open();
      presenterWin.document.write(presenterHTML);
      presenterWin.document.close();
    }

    function buildPresenterHTML(slideData, styleSheets, total, startIdx, bodyClasses, htmlAttrs) {
      const slidesJSON = JSON.stringify(slideData);

      // Build the srcdoc template for slide iframes.
      // Each iframe gets its own viewport (1920x1080) so all CSS
      // (vw/vh/clamp/percentage) resolves identically to the audience view.
      // We use a placeholder %%SLIDE_HTML%% that gets replaced per-slide.
      const iframeSrcdocTemplate = '<!DOCTYPE html>'
        + '<html ' + htmlAttrs.replace(/"/g, '&quot;') + '>'
        + '<head><meta charset="utf-8">'
        + styleSheets.replace(/"/g, '&quot;')
        + '<style>'
        + 'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}'
        + '.deck{position:relative;width:100vw;height:100vh;overflow:hidden}'
        + '.slide{position:absolute!important;inset:0!important;width:100vw!important;height:100vh!important;opacity:1!important;transform:none!important;display:block!important;overflow:hidden!important}'
        + '.notes,aside.notes,.speaker-notes{display:none!important}'
        + '.progress-bar,.notes-overlay,.overview,.deck-header,.deck-footer,.slide-number{display:none!important}'
        + '</style></head>'
        + '<body class="' + bodyClasses.replace(/"/g, '&quot;') + '">'
        + '<div class="deck">%%SLIDE_HTML%%</div>'
        + '</body></html>';

      return '<!DOCTYPE html>\n'
+ '<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
+ '<title>Presenter View</title>\n'
+ '<style>\n'
+ '  * { margin: 0; padding: 0; box-sizing: border-box; }\n'
+ '  html, body { width: 100%; height: 100%; overflow: hidden; background: #0d0d0d; color: #e6edf3; font-family: "Noto Sans SC", -apple-system, sans-serif; }\n'
+ '  .pv-grid { display: grid; grid-template-columns: 1.4fr 1fr; grid-template-rows: 1fr auto; height: 100vh; gap: 12px; padding: 12px; }\n'
+ '  .pv-current-wrap { grid-row: 1; grid-column: 1; display: flex; flex-direction: column; min-height: 0; }\n'
+ '  .pv-right { grid-row: 1; grid-column: 2; display: flex; flex-direction: column; gap: 10px; min-height: 0; }\n'
+ '  .pv-bar { grid-row: 2; grid-column: 1 / -1; display: flex; align-items: center; gap: 16px; padding: 8px 16px; background: rgba(255,255,255,.04); border-radius: 8px; font-size: 13px; }\n'
+ '  .pv-label { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #6e7681; font-weight: 700; margin-bottom: 6px; padding-left: 2px; flex-shrink: 0; }\n'
+ '\n'
+ '  /* Slide preview: iframe at 1920x1080 scaled to fit container */\n'
+ '  .pv-stage { flex: 1; position: relative; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; overflow: hidden; background: #0d1117; min-height: 0; }\n'
+ '  .pv-stage iframe { position: absolute; top: 0; left: 0; width: 1920px; height: 1080px; transform-origin: top left; border: none; pointer-events: none; }\n'
+ '\n'
+ '  .pv-next-wrap { flex: 0 0 35%; display: flex; flex-direction: column; min-height: 0; }\n'
+ '  .pv-next-stage { opacity: .85; }\n'
+ '  .pv-next-end { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #484f58; letter-spacing: .1em; }\n'
+ '\n'
+ '  .pv-notes { flex: 1; display: flex; flex-direction: column; min-height: 0; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 12px 16px; }\n'
+ '  .pv-notes-body { flex: 1; overflow-y: auto; font-size: 18px; line-height: 1.75; color: #d0d7de; font-family: "Noto Sans SC", -apple-system, sans-serif; }\n'
+ '  .pv-notes-body p { margin: 0 0 .7em 0; }\n'
+ '  .pv-notes-body strong { color: #f0883e; }\n'
+ '  .pv-notes-body em { color: #58a6ff; font-style: normal; }\n'
+ '  .pv-notes-body code { font-family: monospace; font-size: .9em; background: rgba(255,255,255,.08); padding: 1px 6px; border-radius: 4px; }\n'
+ '  .pv-empty { color: #484f58; font-style: italic; }\n'
+ '\n'
+ '  .pv-timer { font-family: "SF Mono","JetBrains Mono",monospace; font-size: 26px; font-weight: 700; color: #3fb950; letter-spacing: .04em; }\n'
+ '  .pv-count { font-weight: 600; color: #e6edf3; font-size: 15px; }\n'
+ '  .pv-title { color: #8b949e; font-size: 13px; flex: 1; text-align: right; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }\n'
+ '  .pv-hint { font-size: 11px; color: #484f58; margin-left: auto; }\n'
+ '</style>\n'
+ '</head>\n<body>\n'
+ '<div class="pv-grid">\n'
+ '  <div class="pv-current-wrap">\n'
+ '    <div class="pv-label">CURRENT</div>\n'
+ '    <div class="pv-stage" id="pv-current"><iframe id="iframe-cur"></iframe></div>\n'
+ '  </div>\n'
+ '  <div class="pv-right">\n'
+ '    <div class="pv-next-wrap">\n'
+ '      <div class="pv-label">NEXT</div>\n'
+ '      <div class="pv-stage pv-next-stage" id="pv-next"><iframe id="iframe-nxt"></iframe></div>\n'
+ '    </div>\n'
+ '    <div class="pv-notes">\n'
+ '      <div class="pv-label">SPEAKER SCRIPT · 逐字稿</div>\n'
+ '      <div class="pv-notes-body" id="pv-notes"></div>\n'
+ '    </div>\n'
+ '  </div>\n'
+ '  <div class="pv-bar">\n'
+ '    <div class="pv-timer" id="pv-timer">00:00</div>\n'
+ '    <div class="pv-count" id="pv-count">1 / ' + total + '</div>\n'
+ '    <div class="pv-title" id="pv-title"></div>\n'
+ '    <div class="pv-hint">← → 翻页 · R 重置计时 · Esc 关闭</div>\n'
+ '  </div>\n'
+ '</div>\n'
+ '<script>\n'
+ '(function(){\n'
+ '  var slideData = ' + slidesJSON + ';\n'
+ '  var total = ' + total + ';\n'
+ '  var idx = ' + startIdx + ';\n'
+ '  var CHANNEL_NAME = ' + JSON.stringify(CHANNEL_NAME) + ';\n'
+ '  var SRCDOC_TPL = ' + JSON.stringify(iframeSrcdocTemplate) + ';\n'
+ '  var bc; try { bc = new BroadcastChannel(CHANNEL_NAME); } catch(e) {}\n'
+ '\n'
+ '  var iframeCur = document.getElementById("iframe-cur");\n'
+ '  var iframeNxt = document.getElementById("iframe-nxt");\n'
+ '  var pvNotes = document.getElementById("pv-notes");\n'
+ '  var pvCount = document.getElementById("pv-count");\n'
+ '  var pvTitle = document.getElementById("pv-title");\n'
+ '  var pvTimer = document.getElementById("pv-timer");\n'
+ '\n'
+ '  /* Timer */\n'
+ '  var timerStart = Date.now();\n'
+ '  setInterval(function(){\n'
+ '    var s = Math.floor((Date.now() - timerStart) / 1000);\n'
+ '    pvTimer.textContent = String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");\n'
+ '  }, 1000);\n'
+ '\n'
+ '  /* Scale iframe (1920x1080) to fit its container */\n'
+ '  function fitScale(container) {\n'
+ '    var cw = container.clientWidth, ch = container.clientHeight;\n'
+ '    if (!cw || !ch) return 0.3;\n'
+ '    return Math.min(cw / 1920, ch / 1080);\n'
+ '  }\n'
+ '\n'
+ '  function setIframeSrcdoc(iframe, slideHTML) {\n'
+ '    var doc = SRCDOC_TPL.replace("%%SLIDE_HTML%%", slideHTML);\n'
+ '    iframe.srcdoc = doc;\n'
+ '  }\n'
+ '\n'
+ '  var endEl = null;\n'
+ '  function update(n) {\n'
+ '    n = Math.max(0, Math.min(total - 1, n));\n'
+ '    idx = n;\n'
+ '    /* Current slide — render in iframe */\n'
+ '    setIframeSrcdoc(iframeCur, slideData[n].html);\n'
+ '    /* Next slide */\n'
+ '    if (n + 1 < total) {\n'
+ '      iframeNxt.style.display = "";\n'
+ '      if (endEl) { endEl.remove(); endEl = null; }\n'
+ '      setIframeSrcdoc(iframeNxt, slideData[n + 1].html);\n'
+ '    } else {\n'
+ '      iframeNxt.style.display = "none";\n'
+ '      if (!endEl) {\n'
+ '        endEl = document.createElement("div");\n'
+ '        endEl.className = "pv-next-end";\n'
+ '        endEl.textContent = "— END —";\n'
+ '        document.getElementById("pv-next").appendChild(endEl);\n'
+ '      }\n'
+ '    }\n'
+ '    /* Notes */\n'
+ '    pvNotes.innerHTML = slideData[n].notes || "<span class=\\"pv-empty\\">（这一页还没有逐字稿）</span>";\n'
+ '    pvCount.textContent = (n + 1) + " / " + total;\n'
+ '    pvTitle.textContent = slideData[n].title;\n'
+ '    reScale();\n'
+ '  }\n'
+ '\n'
+ '  function reScale() {\n'
+ '    var cs = fitScale(document.getElementById("pv-current"));\n'
+ '    iframeCur.style.transform = "scale(" + cs + ")";\n'
+ '    var ns = fitScale(document.getElementById("pv-next"));\n'
+ '    iframeNxt.style.transform = "scale(" + ns + ")";\n'
+ '  }\n'
+ '\n'
+ '  if (bc) {\n'
+ '    bc.onmessage = function(e) {\n'
+ '      if (e.data && e.data.type === "go") update(e.data.idx);\n'
+ '    };\n'
+ '  }\n'
+ '\n'
+ '  function go(n) {\n'
+ '    update(n);\n'
+ '    if (bc) bc.postMessage({ type: "go", idx: idx });\n'
+ '  }\n'
+ '  document.addEventListener("keydown", function(e) {\n'
+ '    switch(e.key) {\n'
+ '      case "ArrowRight": case " ": case "PageDown": go(idx + 1); e.preventDefault(); break;\n'
+ '      case "ArrowLeft": case "PageUp": go(idx - 1); e.preventDefault(); break;\n'
+ '      case "Home": go(0); break;\n'
+ '      case "End": go(total - 1); break;\n'
+ '      case "r": case "R": timerStart = Date.now(); pvTimer.textContent = "00:00"; break;\n'
+ '      case "Escape": window.close(); break;\n'
+ '    }\n'
+ '  });\n'
+ '\n'
+ '  window.addEventListener("resize", reScale);\n'
+ '  setTimeout(function(){ update(idx); }, 100);\n'
+ '})();\n'
+ '</' + 'script>\n'
+ '</body></html>';
    }

    function fullscreen(){ const el=document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen&&el.requestFullscreen();
      else document.exitFullscreen&&document.exitFullscreen();
    }

    // theme cycling
    const root = document.documentElement;
    const themesAttr = root.getAttribute('data-themes') || document.body.getAttribute('data-themes');
    const themes = themesAttr ? themesAttr.split(',').map(s=>s.trim()).filter(Boolean) : [];
    let themeIdx = 0;

    // Auto-detect theme base path from existing <link id="theme-link">
    let themeBase = root.getAttribute('data-theme-base');
    if (!themeBase) {
      const existingLink = document.getElementById('theme-link');
      if (existingLink) {
        // el.getAttribute('href') gives the raw relative path written in HTML
        const rawHref = existingLink.getAttribute('href') || '';
        const lastSlash = rawHref.lastIndexOf('/');
        themeBase = lastSlash >= 0 ? rawHref.substring(0, lastSlash + 1) : 'assets/themes/';
      } else {
        themeBase = 'assets/themes/';
      }
    }

    function cycleTheme(){
      if (!themes.length) return;
      themeIdx = (themeIdx+1) % themes.length;
      const name = themes[themeIdx];
      let link = document.getElementById('theme-link');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.id = 'theme-link';
        document.head.appendChild(link);
      }
      link.href = themeBase + name + '.css';
      root.setAttribute('data-theme', name);
      const ind = document.querySelector('.theme-indicator');
      if (ind) ind.textContent = name;
    }

    // animation cycling on current slide
    let animIdx = 0;
    function cycleAnim(){
      animIdx = (animIdx+1) % ANIMS.length;
      const a = ANIMS[animIdx];
      const target = slides[idx].querySelector('[data-anim-target]') || slides[idx];
      ANIMS.forEach(x => target.classList.remove('anim-'+x));
      void target.offsetWidth;
      target.classList.add('anim-'+a);
      target.setAttribute('data-anim', a);
      const ind = document.querySelector('.anim-indicator');
      if (ind) ind.textContent = a;
    }

    document.addEventListener('keydown', function (e) {
      if (e.metaKey||e.ctrlKey||e.altKey) return;
      switch (e.key) {
        case 'ArrowRight': case ' ': case 'PageDown': case 'Enter': go(idx+1); e.preventDefault(); break;
        case 'ArrowLeft': case 'PageUp': case 'Backspace': go(idx-1); e.preventDefault(); break;
        case 'Home': go(0); break;
        case 'End': go(total-1); break;
        case 'f': case 'F': fullscreen(); break;
        case 's': case 'S': openPresenterWindow(); break;
        case 'n': case 'N': toggleNotes(); break;
        case 'o': case 'O': toggleOverview(); break;
        case 't': case 'T': cycleTheme(); break;
        case 'a': case 'A': cycleAnim(); break;
        case 'Escape': toggleOverview(false); toggleNotes(false); break;
      }
    });

    // hash deep-link
    function fromHash(){
      const m = /^#\/(\d+)/.exec(location.hash||'');
      if (m) go(Math.max(0, parseInt(m[1],10)-1));
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
    go(idx);
  });
})();
