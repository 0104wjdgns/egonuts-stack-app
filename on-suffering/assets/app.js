/* ============================================================
   에고너츠 스택 — 발제문 흐름 (「고통과 의미」 전용 복사본)
   표지 → 목차 → (질문 → 참고 자료)… → 카드에 넣을 이름 → 카드 덱
   - 회차 설정: /on-suffering/round.json  (죽음에 관하여 앱을 복사해 이 폴더 안에서만 돈다)
   - 질문에 답을 써야 다음(참고 자료)으로 진행 (답 쓴 뒤에만 자료 공개)
   - 작성 중인 답은 이 기기에만 저장. 서버로 보내지 않는다.
   - 모션·진행 배경은 리더스클럽 「용서」 발제문의 방식을 옮겨 왔다.
     표지 rise/draw · 질문 번호 FLIP + 단어 등장 · 자료 종이 펼침 · 진행할수록 브라운 → 크림
   ============================================================ */
(function () {
  "use strict";

  var BASE = "/on-suffering/";
  var STORE_KEY = "egonuts-stack-on-suffering";

  // 관리자 모드: 주소에 ?admin=1 을 붙여 한 번 열면 이 기기에서 켜지고, ?admin=0 이면 꺼진다.
  // 서버도 계정도 없는 '숨김 스위치'일 뿐 — 공개된 발제문 내용만 다루므로 보안 장치는 아니다.
  // 다른 회차의 관리자 스위치와 섞이지 않도록 이 회차만의 키를 쓴다.
  var ADMIN_KEY = "egonuts-stack-on-suffering-admin";
  var adminParam = new URLSearchParams(location.search).get("admin");
  try {
    if (adminParam === "1") localStorage.setItem(ADMIN_KEY, "1");
    else if (adminParam === "0") localStorage.removeItem(ADMIN_KEY);
  } catch (e) {}
  function isAdmin() {
    try { return localStorage.getItem(ADMIN_KEY) === "1"; } catch (e) { return adminParam === "1"; }
  }

  var app = document.getElementById("app");
  var root = document.documentElement;
  var R, PAL, QUESTIONS, STEPS, LAST, NQ, FIRST_Q;
  var idx = 0;
  var textCache = {};
  var seen = {}; // 한 번 본 화면은 다시 와도 애니메이션 없이
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TOUCH = window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  // --- 진행도 → 바탕색: 깊은 에스프레소 브라운 → 금빛 → 크림 종이 ---
  // 중간 밝기 갈색(흰 글자도 검은 글자도 대비가 모자람)은 화면이 걸리지 않는 0.66~0.72 사이로 몰았다.
  // 질문 4·자료 4(0.6~0.64)까지는 충분히 어둡고, 질문 5(0.76)부터는 밝은 금빛.
  var SKY = [[0, "#1f1810"], [0.20, "#2f2418"], [0.42, "#3f2f1d"], [0.66, "#5e4629"], [0.72, "#b8924a"], [0.86, "#e8d9c0"], [1, "#f6f0e6"]];
  function hexRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function skyAt(p) {
    for (var i = 1; i < SKY.length; i++) {
      if (p <= SKY[i][0]) {
        var a = SKY[i - 1], b = SKY[i], t = (p - a[0]) / (b[0] - a[0]), ca = hexRgb(a[1]), cb = hexRgb(b[1]);
        return ca.map(function (v, k) { return Math.round(v + (cb[k] - v) * t); });
      }
    }
    return hexRgb(SKY[SKY.length - 1][1]);
  }
  function setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    root.style.setProperty("--p", String(p));
    var c = skyAt(p), lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    root.style.setProperty("--sky", "rgb(" + c.join(",") + ")");
    document.body.classList.toggle("dark", lum < 0.55);
    // 금빛 한가운데(밝지만 크림은 아닌 구간): 금 글자가 묻히지 않게 한 톤 짙게
    document.body.classList.toggle("mid", lum >= 0.55 && lum < 0.84);
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute("content", "rgb(" + c.join(",") + ")");
  }
  function qProgress(qi) { return 0.1 + 0.9 * (NQ > 1 ? qi / (NQ - 1) : 0) * 0.92; }
  function delay(el, s) { el.style.animationDelay = s + "s"; return el; }
  function numText(i) { return (i < 9 ? "0" : "") + (i + 1); }
  var state = { name: "", answers: {} };
  var fieldName = function (q, qi, fi) { return EgoCards.fieldName(q, qi, fi); };

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (s) { state.answers = s.answers || {}; state.name = s.name || ""; }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ answers: state.answers, name: state.name })); } catch (e) {}
  }
  function clearDraft() {
    state = { name: "", answers: {} };
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  }
  function hasDraft() {
    return Object.keys(state.answers).some(function (k) { return (state.answers[k] || "").trim(); });
  }

  // --- DOM 헬퍼 ---
  function n(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === "class") e.className = props[k];
      else if (k === "text") e.textContent = props[k];
      else if (k === "html") e.innerHTML = props[k];
      else if (k === "onclick") e.addEventListener("click", props[k]);
      else if (props[k] === true) e.setAttribute(k, "");
      else if (props[k] !== false && props[k] != null) e.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function autoGrow(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(s) { return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function lines(s) { return escapeHtml(s).replace(/\n/g, "<br/>"); }
  function url(p) { return /^(https?:)?\//.test(p) ? p : BASE + p; }

  function paint(render) {
    if (coverCleanup) { coverCleanup(); coverCleanup = null; }
    document.body.classList.remove("typing");
    app.innerHTML = ""; app.className = "app";
    var t = STEPS[idx] && STEPS[idx].t;
    document.body.classList.toggle("is-cover", t === "cover");
    document.body.classList.toggle("is-done", t === "done" && render === renderCurrent);
    window.scrollTo(0, 0);
    render();
  }
  var navToken = 0;
  function transition(render) {
    var my = ++navToken; // 연달아 눌러도 마지막 이동만 그린다
    if (REDUCED) { paint(render); return; }
    app.classList.add("fade-out");
    setTimeout(function () { if (my === navToken) paint(render); }, 170);
  }

  // --- 브라우저 방문 기록: 휴대폰 뒤로가기(안드로이드 버튼 · 아이폰 스와이프) = 이전 단계 ---
  // 기록마다 { egoStep: 지금 단계, prev: 직전 단계 }. 화면의 '← 뒤로'도 직전 단계면 기록을 되감아
  // 두 뒤로가기가 서로 엇갈리지 않게 한다.
  var coverCleanup = null;
  function remember(step, replace) {
    try {
      var st = history.state, cur = st && st.egoStep;
      if (replace) history.replaceState({ egoStep: step, prev: null }, "");
      else if (cur === step) return;
      else history.pushState({ egoStep: step, prev: cur == null ? null : cur }, "");
    } catch (e) {}
  }
  function go(i) {
    idx = Math.max(0, Math.min(LAST, i));
    remember(idx);
    transition(renderCurrent);
  }
  function backTo(i) {
    var st = history.state;
    if (st && st.prev === i && st.egoStep === idx) { history.back(); return; }
    go(i);
  }
  window.addEventListener("popstate", function (e) {
    if (!STEPS) return;
    var s = e.state && e.state.egoStep;
    if (s === "full") { transition(renderFullExport); return; }
    idx = typeof s === "number" ? Math.max(0, Math.min(LAST, s)) : 0;
    transition(renderCurrent);
  });

  // 입력 중(휴대폰 키보드가 올라온 동안)에는 하단 고정 버튼을 제자리로 내려 둔다
  function isField(el) { return !!el && /^(TEXTAREA|INPUT)$/.test(el.tagName); }
  document.addEventListener("focusin", function (e) { if (isField(e.target)) document.body.classList.add("typing"); });
  document.addEventListener("focusout", function () {
    setTimeout(function () { if (!isField(document.activeElement)) document.body.classList.remove("typing"); }, 0);
  });
  function renderCurrent() {
    var s = STEPS[idx];
    if (s.t === "cover") return renderCover();
    if (s.t === "intro") return renderIntro();
    if (s.t === "q") return renderQuestion(s.i);
    if (s.t === "m") return renderMaterial(s.i);
    if (s.t === "name") return renderName();
    return renderDone();
  }

  function progress(label, pct) {
    var span = n("span"); span.style.width = pct + "%";
    return n("div", { class: "progress" }, [
      n("div", { class: "count", text: label }),
      n("div", { class: "bar" }, [span]),
      logo()
    ]);
  }
  function logo() { return n("img", { class: "top-logo", src: BASE + "assets/logo.png", alt: "EgoNuts" }); }
  function kakaoNotice() {
    if (!EgoExport.isKakao()) return null;
    return n("div", { class: "notice-bar fade-up" }, [
      n("span", { text: "카카오톡 안에서 열었어요. 여기서는 카드 저장이 안 될 수 있어요. 기본 브라우저에서 열고 시작해 주세요." }),
      n("button", { text: "기본 브라우저로 열기 →", onclick: EgoExport.openExternal })
    ]);
  }

  // --- 표지: 잡지 표지처럼 마스트 → 제목 → 밑줄 → 핵심 질문이 한 줄씩 ---
  function renderCover() {
    setProgress(0);
    app.className = "app full";
    var intro = R.intro || {};
    var coreLines = intro.coreQuestionLines || (intro.coreQ ? String(intro.coreQ).split("\n") : []);
    // 제목의 마지막 낱말을 금빛으로 (예: 고통과 <em>의미</em>)
    var titleHtml = escapeHtml(R.title).replace(/(\S+)$/, "<em>$1</em>");

    var core = n("p", { class: "cover-core" });
    var t0 = 1.45, gap = 0.55;
    coreLines.forEach(function (l, i) { core.appendChild(delay(n("span", { class: "line rise", text: l }), t0 + i * gap)); });
    var footDelay = t0 + coreLines.length * gap + 0.3;

    var cover = n("section", { class: "cover", role: "button", tabindex: "0", "aria-label": "발제문 시작하기" }, [
      n("div", { class: "cover-inner" }, [
        delay(n("div", { class: "cover-mast rise" }, [
          n("p", { class: "eyebrow", text: "EGONUTS" + (R.date ? " · " + R.date : "") }),
          n("span", { class: "cover-word", text: "EgoNuts" })
        ]), 0.1),
        delay(n("h1", { class: "cover-title rise", html: titleHtml }), 0.35),
        delay(n("hr", { class: "cover-rule draw" }), 0.95),
        coreLines.length ? delay(n("p", { class: "eyebrow cover-core-label rise", text: intro.coreLabel || "핵심 질문" }), 1.15) : null,
        coreLines.length ? core : null,
        R.source ? delay(n("p", { class: "cover-src rise", text: "참고 · " + R.source }), footDelay - 0.15) : null
      ]),
      delay(n("div", { class: "cover-foot rise" }, [
        n("span", { text: TOUCH ? "밀어 올리거나 눌러서 시작" : "스크롤하거나 눌러서 시작" }),
        n("span", { class: "cover-chev", "aria-hidden": "true" })
      ]), footDelay)
    ]);
    app.appendChild(cover);
    if (REDUCED || seen.cover) app.classList.add("instant");
    seen.cover = true;

    var started = false, touchY = null;
    function start() {
      if (started) return; started = true; cleanup();
      function enter() { if (STEPS[idx].t !== "cover") return; idx = 1; remember(1); paint(renderCurrent); }
      if (REDUCED) { enter(); return; }
      cover.classList.add("exit");
      setTimeout(enter, 650);
    }
    function onWheel(e) { if (e.deltaY > 8) start(); }
    function onKey(e) { if (["Enter", " ", "ArrowDown", "PageDown"].indexOf(e.key) >= 0) { e.preventDefault(); start(); } }
    function onTs(e) { touchY = e.touches[0].clientY; }
    function onTm(e) { if (touchY != null && touchY - e.touches[0].clientY > 30) start(); }
    function cleanup() {
      window.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTs); window.removeEventListener("touchmove", onTm);
    }
    coverCleanup = cleanup;
    cover.addEventListener("click", start);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTs, { passive: true });
    window.addEventListener("touchmove", onTm, { passive: true });
  }

  // --- 목차 (표지 다음) ---
  function renderIntro() {
    setProgress(0.04);
    var instant = REDUCED || seen.intro;
    seen.intro = true;
    if (instant) app.classList.add("instant");
    var notice = kakaoNotice();
    if (notice) app.appendChild(notice);
    app.appendChild(delay(n("div", { class: "top-row rise" }, [
      n("p", { class: "kicker", text: "EGONUTS" + (R.date ? " · " + R.date : "") }), logo()
    ]), 0));
    app.appendChild(delay(n("p", { class: "lead rise", text: R.title }), 0.08));
    app.appendChild(delay(n("hr", { class: "toc-rule draw" }), 0.2));

    var intro = R.intro || {};
    if (intro.coreQ && !intro.coreQuestionLines) {
      app.appendChild(n("div", { class: "intro-core fade-up" }, [
        n("p", { class: "core-label", text: intro.coreLabel || "핵심 질문" }),
        n("p", { class: "core-q", html: lines(intro.coreQ) })
      ]));
    }
    if (intro.sub) app.appendChild(n("p", { class: "sub fade-up", html: lines(intro.sub) }));

    var toc = n("ol", { class: "toc" });
    QUESTIONS.forEach(function (q, i) {
      var label = (q.short || q.text || "").trim();
      toc.appendChild(delay(n("li", { class: "rise" }, [
        n("span", { class: "num", text: numText(i) }),
        n("span", { class: "t" + (label ? "" : " empty"), text: label || "질문 " + (i + 1) })
      ]), 0.3 + i * 0.07));
    });
    app.appendChild(toc);
    var after = 0.3 + QUESTIONS.length * 0.07 + 0.1;
    if (R.source) app.appendChild(delay(n("p", { class: "cover-source fade-in", text: "참고 · " + R.source }), after));

    var draft = hasDraft();
    var left = draft
      ? n("button", { class: "btn-text", text: "처음부터 새로 쓰기", onclick: function () {
          if (confirm("이 기기에 저장된 답을 지우고 새로 쓸까요?")) { clearDraft(); seen = {}; go(1); }
        } })
      : n("button", { class: "btn-back", text: "← 표지", onclick: function () { backTo(0); } });
    var start = n("button", { class: "btn-start", onclick: function () { go(FIRST_Q); } }, [
      n("span", { text: draft ? "이어서 쓰기" : "시작" }),
      n("span", { class: "arrow", text: "→" })
    ]);
    app.appendChild(delay(n("div", { class: "nav fade-in" }, [left, start]), after));
    if (isAdmin()) {
      app.appendChild(delay(n("div", { class: "admin-row fade-in" }, [
        n("button", { class: "btn-text", text: "관리자 · 발제문 전체 카드 추출", onclick: function () { remember("full"); transition(renderFullExport); } })
      ]), after));
    }
  }

  // --- 질문 ---
  function renderQuestion(qi) {
    var q = QUESTIONS[qi];
    var pct = Math.round((idx / LAST) * 100);
    var text = (q.text || "").trim();
    var key = "q" + qi;
    var instant = REDUCED || seen[key];
    seen[key] = true;
    if (instant) app.classList.add("instant");
    setProgress(qProgress(qi));

    var nudge = n("p", { class: "nudge", text: "먼저 당신의 생각을 한 줄이라도 적어 주세요." });
    nudge.style.display = "none";

    // 큰 번호 + 소주제: 번호가 화면 가운데에서 크게 떴다가 제자리로 줄어 안착 (FLIP), 소주제는 그 뒤에
    var num = n("span", { class: "sec-num", text: numText(qi) + "_" });
    var sec = n("h2", { class: "sec" }, [
      num,
      q.short ? delay(n("span", { class: "sec-label fade-in", text: q.short }), 0.7) : null
    ]);
    var rule = delay(n("hr", { class: "sec-rule draw" }), 0.8);

    // 질문 문장은 단어 단위로 드러난다
    var qText = n("p", { class: "question" + (text ? "" : " empty") });
    var w0 = 0.9, afterWords = w0;
    if (text) {
      var words = text.split(/\s+/);
      var step = Math.min(0.05, 1.4 / words.length);
      words.forEach(function (w, i) {
        qText.appendChild(delay(n("span", { class: "w", text: w }), w0 + i * step));
        if (i < words.length - 1) qText.appendChild(document.createTextNode(" "));
      });
      afterWords = w0 + words.length * step + 0.25;
    } else {
      qText.textContent = "질문 " + (qi + 1);
    }

    // 입력 자리는 움직이지 않는다 — 조용히 나타날 뿐. 바로 쓰고 싶은 사람을 기다리게 하지 않도록 1초 안에
    var inputAt = Math.min(afterWords, 1.0);
    var block = delay(n("div", { class: "qblock fade-in" }), inputAt);
    if (q.hint) block.appendChild(n("p", { class: "hint", text: q.hint }));
    else if (!text) block.appendChild(n("p", { class: "hint", text: "(질문 준비 중)" }));

    var fields = q.fields || [{}];
    // 저장 표시: 쓰는 즉시 기기에 저장되고, 표시는 손을 멈추면 갱신
    function chars() {
      return fields.reduce(function (sum, f, fi) { return sum + (state.answers[fieldName(q, qi, fi)] || "").trim().length; }, 0);
    }
    var saveNote = n("span", { text: chars() ? "이 기기에 저장돼 있어요" : "쓰는 대로 이 기기에 자동 저장돼요" });
    var saveCount = n("span", { text: chars() ? chars() + "자" : "" });
    var saveTimer;
    fields.forEach(function (f, fi) {
      var key = fieldName(q, qi, fi);
      if (f.label) block.appendChild(n("label", { class: "field-label", text: f.label }));
      var ta = n("textarea", { rows: "2", placeholder: f.placeholder || "" });
      ta.value = state.answers[key] || "";
      ta.addEventListener("input", function () {
        state.answers[key] = ta.value; save(); autoGrow(ta); nudge.style.display = "none";
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          var d = new Date(), c = chars();
          saveNote.textContent = "자동 저장됨 · " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
          saveCount.textContent = c ? c + "자" : "";
        }, 400);
      });
      block.appendChild(ta);
      setTimeout(function () { autoGrow(ta); }, 0);
    });
    block.appendChild(n("p", { class: "save-state" }, [saveNote, saveCount]));
    block.appendChild(nudge);

    var back = n("button", { class: "btn-back", text: "← 뒤로", onclick: function () { backTo(idx - 1); } });
    var next = n("button", { class: "btn-next", text: "다음 →", onclick: function () {
      var filled = fields.some(function (f, fi) { return (state.answers[fieldName(q, qi, fi)] || "").trim().length > 0; });
      if (!filled) {
        // 하단 고정 버튼에서 누르면 안내가 화면 밖일 수 있어, 입력칸으로 데려간다
        nudge.style.display = "block";
        var first = block.querySelector("textarea");
        if (first) first.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
        return;
      }
      go(idx + 1);
    } });

    app.appendChild(progress("질문 " + (qi + 1) + " / " + NQ, pct));
    app.appendChild(sec);
    app.appendChild(rule);
    app.appendChild(n("div", { class: "q-wrap" }, [qText]));
    app.appendChild(block);
    app.appendChild(delay(n("div", { class: "nav dock fade-in" }, [back, next]), inputAt));

    if (!instant) {
      // 번호 글자 자체의 크기로 잰다 (줄 전체 폭으로 재면 휴대폰에서 커지지 않는다)
      var r = num.getBoundingClientRect();
      var ss = Math.min(2.4, (window.innerWidth * 0.7) / Math.max(r.width, 1));
      var sx = (window.innerWidth - r.width * ss) / 2 - r.left;
      var sy = window.innerHeight * 0.38 - r.top - (r.height * ss) / 2;
      num.style.setProperty("--ss", ss.toFixed(3));
      num.style.setProperty("--sx", sx.toFixed(1) + "px");
      num.style.setProperty("--sy", sy.toFixed(1) + "px");
      num.classList.add("enter");
    }
  }

  // --- 참고 자료 (이미지 먼저, 스크롤하며 텍스트) ---
  function renderMaterial(qi) {
    var m = QUESTIONS[qi].material;
    var pct = Math.round((idx / LAST) * 100);
    var key = "m" + qi;
    var instant = REDUCED || seen[key];
    seen[key] = true;
    if (instant) app.classList.add("instant");
    setProgress(qProgress(qi) + 0.04);

    var mLabel = m.source ? "함께 읽은 책" : "곁에 두는 참고";
    app.appendChild(progress("질문 " + (qi + 1) + " · " + mLabel, pct));
    app.appendChild(n("div", { class: "m-head" }, [
      n("p", { class: "eyebrow m-eyebrow", text: mLabel }),
      n("p", { class: "m-intro", text: m.source
        ? "여기까지 오는 동안 곁에 두었던 책을 소개할게요."
        : "방금 남긴 생각 옆에, 이 질문과 이어지는 문장들을 놓아 둘게요." })
    ]));
    // 자료 전체를 한 장의 종이로 감싸, 처음 볼 때만 접힌 종이가 펼쳐지듯 연다
    var paper = n("article", { class: "paper" + (instant ? "" : " unfold") });
    app.appendChild(n("div", { class: "paper-stage" }, [paper]));
    // 이미지 자리: 파일이 아직 없으면 자리째 숨긴다 (파일만 넣으면 나타남)
    if (m.source) {
      var s = m.source;
      var cover = s.cover ? n("img", { class: "m-source-cover", src: url(s.cover), alt: (s.titleKo || "") + " 표지" }) : null;
      if (cover) cover.addEventListener("error", function () { cover.remove(); });
      paper.appendChild(n("div", { class: "m-source fade-up" }, [
        cover,
        n("div", { class: "m-source-meta" }, [
          n("p", { class: "m-source-title", html: escapeHtml(s.titleKo || "") + (s.titleEn ? "<span>" + escapeHtml(s.titleEn) + "</span>" : "") }),
          s.by ? n("p", { class: "m-source-by", text: s.by }) : null
        ])
      ]));
      if (s.note) paper.appendChild(n("p", { class: "m-source-note", text: s.note }));
      paper.appendChild(n("hr", { class: "point-rule" }));
    }
    if (m.img) {
      var img = n("img", { class: "m-img", src: url(m.img), alt: "질문 " + (qi + 1) + " 참고 자료 이미지" });
      img.addEventListener("load", function () { img.classList.add("shown"); });
      var imgWrap = n("div", { class: "m-imgwrap fade-up" }, [img, creditLink("m-credit")]);
      var imgRule = n("hr", { class: "point-rule tight" });
      img.addEventListener("error", function () { imgWrap.remove(); imgRule.remove(); });
      setTimeout(function () { if (img.complete && img.naturalWidth) img.classList.add("shown"); }, 40);
      paper.appendChild(imgWrap);
      paper.appendChild(imgRule);
    }
    var textWrap = n("div", { class: "m-text" }, [n("p", { class: "m-loading", text: "자료를 불러오는 중…" })]);
    paper.appendChild(textWrap);
    if (m.links && m.links.items && m.links.items.length) {
      paper.appendChild(n("div", { class: "m-links fade-up" }, [
        m.links.label ? n("p", { class: "m-links-label", text: m.links.label }) : null
      ].concat(m.links.items.map(function (l) {
        var yt = youtubeId(l.url);
        // 썸네일: round.json의 thumb(블로그 대표 이미지 등) 우선, 없으면 유튜브. 네이버 이미지는 외부 referer를 막아서
        // referrerpolicy를 src보다 먼저 지정해야 한다
        var tsrc = l.thumb || (yt ? "https://i.ytimg.com/vi/" + yt + "/mqdefault.jpg" : null);
        var thumb = tsrc ? n("img", { class: "thumb", referrerpolicy: "no-referrer", src: tsrc, alt: "", loading: "lazy" }) : null;
        if (thumb) thumb.addEventListener("error", function () { thumb.remove(); });
        return n("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, [
          thumb, n("span", { class: "label", text: l.text }), n("span", { class: "go", text: "↗" })
        ]);
      }))));
    }
    var pageCredit = m.credit ? creditLink("m-credit m-credit-page fade-up") : null;
    if (pageCredit) paper.appendChild(pageCredit);
    // 종이 아래 작고 흐린 대기 안내
    if (R.materialNote) app.appendChild(delay(n("p", { class: "m-wait fade-in", text: R.materialNote }), instant ? 0 : 1.2));

    var back = n("button", { class: "btn-back", text: "← 내 답 보기", onclick: function () { backTo(idx - 1); } });
    var next = n("button", { class: "btn-next", text: "다음 →", onclick: function () { go(idx + 1); } });
    app.appendChild(delay(n("div", { class: "nav dock fade-in" }, [back, next]), instant ? 0 : 1.0));

    if (!m.txt) { textWrap.innerHTML = ""; return; }
    loadText(url(m.txt), function (parsed, err) {
      textWrap.innerHTML = "";
      if (err) { textWrap.appendChild(n("p", { class: "m-loading", text: "(자료 텍스트를 불러오지 못했어요)" })); return; }
      if (!parsed.title && !parsed.blocks.length) { textWrap.appendChild(n("p", { class: "m-loading", text: "(인용문 준비 중)" })); return; }
      renderText(textWrap, parsed);
    });
  }

  // youtu.be/ID · youtube.com/watch?v=ID → ID (썸네일용)
  function youtubeId(u) {
    var m = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/.exec(u || "");
    return m ? m[1] : null;
  }

  // 영화 이미지 출처 (round.json의 imageCredit)
  function creditLink(cls) {
    var c = R.imageCredit;
    if (!c) return null;
    return n("p", { class: cls }, [
      c.url ? n("a", { href: c.url, target: "_blank", rel: "noopener noreferrer", text: c.text }) : n("span", { text: c.text })
    ]);
  }

  function loadText(u, cb) {
    if (textCache[u]) { cb(textCache[u]); return; }
    fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { var p = parseText(t); textCache[u] = p; cb(p); })
      .catch(function (e) { cb(null, e); });
  }
  // 첫 줄 = 제목, "로 시작 = 인용, —로 시작 = 출처, §로 시작 = 파트(책의 몇 장), 나머지 = 문단
  // 제목보다 앞에 놓인 § 줄은 제목 위 머리표(pre)로, 본문 중간의 § 줄은 소단락 머리표로 쓴다.
  function parseText(text) {
    var ls = text.replace(/\r/g, "").split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    var pre = [];
    while (ls.length && /^§/.test(ls[0])) pre.push(ls.shift().replace(/^§\s*/, ""));
    var title = ls.shift() || "";
    var blocks = ls.map(function (line) {
      if (/^§/.test(line)) return { t: "part", text: line.replace(/^§\s*/, "") };
      if (/^—/.test(line)) return { t: "cite", text: line.replace(/^—\s*/, "") };
      if (/^["“]/.test(line)) return { t: "quote", text: line };
      return { t: "p", text: line };
    });
    return { title: title, pre: pre, blocks: blocks };
  }
  function renderText(wrap, parsed) {
    (parsed.pre || []).forEach(function (t) { wrap.appendChild(n("p", { class: "m-part fade-up", text: t })); });
    if (parsed.title) wrap.appendChild(n("h2", { class: "m-title fade-up", text: parsed.title }));
    parsed.blocks.forEach(function (b, i) {
      var el;
      if (b.t === "part") el = n("p", { class: "m-part m-part-inline fade-up", text: b.text });
      else if (b.t === "quote") el = n("blockquote", { class: "m-quote fade-up", html: fmt(b.text) });
      else if (b.t === "cite") el = n("p", { class: "m-cite fade-up", text: "— " + b.text });
      else el = n("p", { class: "m-p fade-up", html: fmt(b.text) });
      el.style.animationDelay = Math.min(0.45, 0.06 + i * 0.04) + "s";
      wrap.appendChild(el);
    });
  }

  // --- 카드에 넣을 이름 ---
  function renderName() {
    var input = n("input", { type: "text", class: "name-input", maxlength: "20", placeholder: "이름 또는 닉네임", autocomplete: "nickname", enterkeyhint: "done" });
    input.value = state.name || "";
    input.addEventListener("input", function () { state.name = input.value; save(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") make(); });
    function make() { state.name = input.value.trim(); save(); go(idx + 1); }
    setProgress(0.98);

    app.appendChild(progress("카드 만들기", Math.round((idx / LAST) * 100)));
    app.appendChild(n("div", { class: "qblock fade-up" }, [
      n("p", { class: "question", text: "카드에 표시할 이름" }),
      n("p", { class: "hint", text: "비워 두면 이름 없이 만들어요." }),
      input
    ]));
    app.appendChild(n("div", { class: "nav dock" }, [
      n("button", { class: "btn-back", text: "← 뒤로", onclick: function () { backTo(idx - 1); } }),
      n("button", { class: "btn-next", text: "카드 만들기 →", onclick: make })
    ]));
  }

  // --- 카드 덱 ---
  function renderDone() {
    setProgress(1);
    var notice = kakaoNotice();
    if (notice) app.appendChild(notice);
    app.appendChild(n("p", { class: "kicker fade-up", text: state.name ? state.name + " 님" : "EGONUTS" }));
    app.appendChild(n("p", { class: "lead fade-up", text: "나의 토론 로그" }));
    app.appendChild(n("p", { class: "sub fade-up", text: "카드를 넘겨 보고, 저장하거나 나에게 보내 보세요." }));

    var viewer = n("div", { class: "viewer fade-up" }, [n("p", { class: "m-loading", text: "카드를 만드는 중…" })]);
    var actions = n("div", { class: "actions" });
    var status = n("p", { class: "actions-status" });
    app.appendChild(viewer);
    app.appendChild(actions);
    app.appendChild(status);

    var closingText = (R.closing && R.closing.text) ||
      "이것으로 에고너츠 《" + R.title + "》 토론을 마치겠습니다!\n함께 자리해주셔서 감사합니다!";
    var books = R.closing && R.closing.books;
    if (books && books.items && books.items.length) {
      app.appendChild(n("div", { class: "center" }, [
        n("p", { class: "books-label fade-up", text: books.label || "추천 도서" }),
        n("div", { class: "books fade-up" }, books.items.map(function (b) {
          return n("div", { class: "book" }, [
            n("div", { class: "cover" }, [n("img", { src: url(b.cover), alt: b.title })]),
            n("p", { class: "book-title", text: "《" + b.title + "》" })
          ]);
        }))
      ]));
    }
    app.appendChild(n("div", { class: "nav" }, [
      n("button", { class: "btn-back", text: "← 답 고치기", onclick: function () { go(FIRST_Q); } }),
      n("span", { class: "spacer" })
    ]));
    // 마무리 인사는 카드 덱 · 저장 버튼 아래, 화면 맨 끝에
    app.appendChild(n("hr", { class: "point-rule" }));
    app.appendChild(n("p", { class: "closing closing--end fade-up", html: lines(closingText) }));

    var base = "egonuts_" + EgoExport.safeName(R.title) + (state.name ? "_" + EgoExport.safeName(state.name) : "");
    EgoCards.build(R, state.answers, state.name, PAL).then(function (cards) {
      return EgoExport.images(cards, base).then(function (imgs) {
        showViewer(viewer, imgs);
        var pdfP = EgoExport.pdf(cards, base).catch(function (e) { return e; });
        return pdfP.then(function (pdf) { showActions(actions, status, imgs, pdf); });
      });
    }).catch(function (e) {
      viewer.innerHTML = "";
      viewer.appendChild(n("p", { class: "error", text: "카드를 만들지 못했어요: " + (e && e.message ? e.message : e) }));
    });
  }

  // --- 관리자: 발제문 전체(표지 · 질문 · 참고 자료)를 카드로 ---
  function loadImg(src) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }
  function renderFullExport() {
    setProgress(1);
    document.body.classList.add("is-done");
    app.appendChild(n("p", { class: "kicker fade-up", text: "관리자" }));
    app.appendChild(n("p", { class: "lead fade-up", text: "발제문 전체 카드" }));
    app.appendChild(n("p", { class: "sub fade-up", text: "표지 · 질문 · 참고 자료를 모두 카드로 만들어요. 답변은 들어가지 않아요." }));
    var viewer = n("div", { class: "viewer fade-up" }, [n("p", { class: "m-loading", text: "카드를 만드는 중…" })]);
    var actions = n("div", { class: "actions" });
    var status = n("p", { class: "actions-status" });
    app.appendChild(viewer);
    app.appendChild(actions);
    app.appendChild(status);
    app.appendChild(n("div", { class: "nav" }, [
      n("button", { class: "btn-back", text: "← 목차로", onclick: function () { backTo(1); } }),
      n("span", { class: "spacer" })
    ]));

    var mats = QUESTIONS.map(function (q) {
      var m = q.material;
      if (!m) return Promise.resolve(null);
      return Promise.all([
        m.txt ? new Promise(function (res) { loadText(url(m.txt), function (p, err) { res(err ? null : p); }); }) : null,
        m.img ? loadImg(url(m.img)) : null,
        m.source && m.source.cover ? loadImg(url(m.source.cover)) : null
      ]).then(function (r) { return { parsed: r[0], img: r[1], cover: r[2] }; });
    });
    var base = "egonuts_" + EgoExport.safeName(R.title) + "_발제문";
    Promise.all(mats).then(function (list) {
      return EgoCards.buildFull(R, list, PAL);
    }).then(function (cards) {
      return EgoExport.images(cards, base).then(function (imgs) {
        showViewer(viewer, imgs);
        return EgoExport.pdf(cards, base).catch(function (e) { return e; }).then(function (pdf) { showActions(actions, status, imgs, pdf); });
      });
    }).catch(function (e) {
      viewer.innerHTML = "";
      viewer.appendChild(n("p", { class: "error", text: "카드를 만들지 못했어요: " + (e && e.message ? e.message : e) }));
    });
  }

  function showViewer(viewer, imgs) {
    viewer.innerHTML = "";
    var track = n("div", { class: "track" });
    imgs.forEach(function (f, i) {
      track.appendChild(n("img", { src: URL.createObjectURL(f), alt: "카드 " + (i + 1) + " / " + imgs.length }));
    });
    var count = n("span", { class: "count", text: "1 / " + imgs.length });
    function at() { return Math.round(track.scrollLeft / (track.clientWidth + 14)); }
    function to(i) {
      i = Math.max(0, Math.min(imgs.length - 1, i));
      track.scrollTo({ left: i * (track.clientWidth + 14), behavior: "smooth" });
    }
    track.addEventListener("scroll", function () { count.textContent = (at() + 1) + " / " + imgs.length; }, { passive: true });
    viewer.appendChild(track);
    viewer.appendChild(n("div", { class: "viewer-bar" }, [
      n("button", { text: "‹", "aria-label": "이전 카드", onclick: function () { to(at() - 1); } }),
      count,
      n("button", { text: "›", "aria-label": "다음 카드", onclick: function () { to(at() + 1); } })
    ]));
    viewer.appendChild(n("p", { class: "viewer-tip", text: "좌우로 넘겨 보세요 · 카드를 길게 누르면 사진으로 저장할 수 있어요" }));
  }

  function showActions(actions, status, imgs, pdf) {
    var pdfOk = pdf instanceof File;
    var shareImgs = EgoExport.canShare(imgs);
    var sharePdf = pdfOk && EgoExport.canShare([pdf]);
    function say(t) { status.textContent = t || ""; }
    function onShareErr(e) { if (!e || e.name !== "AbortError") say("공유하지 못했어요. 저장 버튼을 이용해 주세요."); }

    if (pdfOk) {
      actions.appendChild(n("button", { class: "primary" + (sharePdf ? "" : " wide"), text: "PDF 카드 저장", onclick: function () {
        EgoExport.download(pdf); say("PDF 카드를 저장했어요 (" + imgs.length + "쪽)");
      } }));
      if (sharePdf) actions.appendChild(n("button", { class: "primary", text: "카카오톡 나에게로", onclick: function () {
        say(""); EgoExport.share([pdf], R.title).catch(onShareErr);
      } }));
    } else {
      say(pdf && pdf.message ? pdf.message : "PDF를 만들지 못했어요.");
    }
    actions.appendChild(n("button", { class: shareImgs ? "" : "wide", text: "PNG 이미지로 저장", onclick: function () {
      say("이미지를 저장하는 중…");
      EgoExport.downloadAll(imgs).then(function () { say("PNG 이미지 " + imgs.length + "장을 저장했어요"); });
    } }));
    if (shareImgs) actions.appendChild(n("button", { text: "이미지 공유", onclick: function () {
      say(""); EgoExport.share(imgs, R.title).catch(onShareErr);
    } }));
  }

  function renderMissing() {
    setProgress(1);
    app.appendChild(n("div", { class: "center" }, [
      n("p", { class: "lead", text: "회차를 찾을 수 없어요" }),
      n("p", { class: "sub", text: "주소를 다시 확인해 주세요." })
    ]));
  }

  // --- 시작 ---
  fetch(BASE + "round.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      R = data;
      QUESTIONS = R.questions || [];
      NQ = QUESTIONS.length;
      PAL = EgoTheme.palette(R.colors);
      EgoTheme.apply(PAL);
      document.title = R.title + " — 에고너츠";

      STEPS = [{ t: "cover" }, { t: "intro" }];
      FIRST_Q = STEPS.length;
      QUESTIONS.forEach(function (q, i) {
        STEPS.push({ t: "q", i: i });
        if (q.material) STEPS.push({ t: "m", i: i });
      });
      STEPS.push({ t: "name" }, { t: "done" });
      LAST = STEPS.length - 1;

      load();
      // 새로고침(카톡에서 앱을 오가다 다시 열릴 때 등)이면 보던 단계에서 이어서
      var st = history.state;
      if (st && typeof st.egoStep === "number" && st.egoStep <= LAST) idx = st.egoStep;
      else remember(0, true);
      try { history.scrollRestoration = "manual"; } catch (e) {}
      paint(renderCurrent);
    })
    .catch(function () { renderMissing(); });
})();
