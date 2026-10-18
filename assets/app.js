/* ============================================================
   에고너츠 스택 — 발제문 흐름
   표지 겸 목차 → (질문 → 참고 자료)… → 카드에 넣을 이름 → 카드 덱
   - 회차 설정: /rounds/<slug>/round.json  (기본 회차: DEFAULT_ROUND, 다른 회차는 /?r=<slug>)
   - 질문에 답을 써야 다음(참고 자료)으로 진행 (답 쓴 뒤에만 자료 공개)
   - 작성 중인 답은 이 기기에만 저장. 서버로 보내지 않는다.
   ============================================================ */
(function () {
  "use strict";

  var DEFAULT_ROUND = "solitude";
  var slug = new URLSearchParams(location.search).get("r") || DEFAULT_ROUND;
  var BASE = "/rounds/" + encodeURIComponent(slug) + "/";
  var STORE_KEY = "egonuts-stack-" + slug;

  var app = document.getElementById("app");
  var R, PAL, QUESTIONS, STEPS, LAST, NQ;
  var idx = 0;
  var textCache = {};
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

  function transition(render) {
    app.classList.add("fade-out");
    setTimeout(function () {
      app.innerHTML = ""; app.className = "app";
      render(); window.scrollTo(0, 0);
    }, 170);
  }
  function go(i) { idx = Math.max(0, Math.min(LAST, i)); transition(renderCurrent); }
  function renderCurrent() {
    var s = STEPS[idx];
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
      n("div", { class: "bar" }, [span])
    ]);
  }
  function kakaoNotice() {
    if (!EgoExport.isKakao()) return null;
    return n("div", { class: "notice-bar fade-up" }, [
      n("span", { text: "카카오톡 안에서 열었어요. 여기서는 카드 저장이 안 될 수 있어요. 기본 브라우저에서 열고 시작해 주세요." }),
      n("button", { text: "기본 브라우저로 열기 →", onclick: EgoExport.openExternal })
    ]);
  }

  // --- 표지 겸 목차 ---
  function renderIntro() {
    var notice = kakaoNotice();
    if (notice) app.appendChild(notice);
    app.appendChild(n("p", { class: "kicker fade-up", text: "EGONUTS" + (R.date ? " · " + R.date : "") }));
    app.appendChild(n("p", { class: "lead fade-up", text: R.title }));
    app.appendChild(n("hr", { class: "cover-rule fade-up" }));

    var intro = R.intro || {};
    if (intro.coreQ) {
      app.appendChild(n("div", { class: "intro-core fade-up" }, [
        n("p", { class: "core-label", text: intro.coreLabel || "핵심 질문" }),
        n("p", { class: "core-q", html: lines(intro.coreQ) })
      ]));
    }
    if (intro.sub) app.appendChild(n("p", { class: "sub fade-up", html: lines(intro.sub) }));

    var toc = n("ol", { class: "toc fade-up" });
    QUESTIONS.forEach(function (q, i) {
      var label = (q.short || q.text || "").trim();
      toc.appendChild(n("li", null, [
        n("span", { class: "num", text: (i < 9 ? "0" : "") + (i + 1) }),
        n("span", { class: "t" + (label ? "" : " empty"), text: label || "질문 " + (i + 1) })
      ]));
    });
    app.appendChild(toc);
    if (R.source) app.appendChild(n("p", { class: "cover-source fade-up", text: "참고 · " + R.source }));

    var draft = hasDraft();
    var left = draft
      ? n("button", { class: "btn-text", text: "처음부터 새로 쓰기", onclick: function () {
          if (confirm("이 기기에 저장된 답을 지우고 새로 쓸까요?")) { clearDraft(); go(0); }
        } })
      : n("span", { class: "spacer" });
    var start = n("button", { class: "btn-start", onclick: function () { go(1); } }, [
      n("span", { text: draft ? "이어서 쓰기" : "시작" }),
      n("span", { class: "arrow", text: "→" })
    ]);
    app.appendChild(n("div", { class: "nav fade-up" }, [left, start]));
  }

  // --- 질문 ---
  function renderQuestion(qi) {
    var q = QUESTIONS[qi];
    var pct = Math.round((idx / LAST) * 100);
    var text = (q.text || "").trim();

    var nudge = n("p", { class: "nudge", text: "먼저 당신의 생각을 한 줄이라도 적어 주세요." });
    nudge.style.display = "none";

    var block = n("div", { class: "qblock fade-up" }, [
      n("p", { class: "question" + (text ? "" : " empty"), text: text || "질문 " + (qi + 1) })
    ]);
    if (q.hint) block.appendChild(n("p", { class: "hint", text: q.hint }));
    else if (!text) block.appendChild(n("p", { class: "hint", text: "(질문 준비 중)" }));

    var fields = q.fields || [{}];
    fields.forEach(function (f, fi) {
      var key = fieldName(q, qi, fi);
      if (f.label) block.appendChild(n("label", { class: "field-label", text: f.label }));
      var ta = n("textarea", { rows: "2", placeholder: f.placeholder || "" });
      ta.value = state.answers[key] || "";
      ta.addEventListener("input", function () {
        state.answers[key] = ta.value; save(); autoGrow(ta); nudge.style.display = "none";
      });
      block.appendChild(ta);
      setTimeout(function () { autoGrow(ta); }, 0);
    });
    block.appendChild(nudge);

    var back = n("button", { class: "btn-back", text: "← 뒤로", onclick: function () { go(idx - 1); } });
    var next = n("button", { class: "btn-next", text: "다음 →", onclick: function () {
      var filled = fields.some(function (f, fi) { return (state.answers[fieldName(q, qi, fi)] || "").trim().length > 0; });
      if (!filled) { nudge.style.display = "block"; return; }
      go(idx + 1);
    } });

    app.appendChild(progress("질문 " + (qi + 1) + " / " + NQ, pct));
    app.appendChild(block);
    app.appendChild(n("div", { class: "nav" }, [back, next]));
  }

  // --- 참고 자료 (이미지 먼저, 스크롤하며 텍스트) ---
  function renderMaterial(qi) {
    var m = QUESTIONS[qi].material;
    var pct = Math.round((idx / LAST) * 100);

    app.appendChild(progress("질문 " + (qi + 1) + " · 참고 자료", pct));
    // 이미지 자리: 파일이 아직 없으면 자리째 숨긴다 (파일만 넣으면 나타남)
    if (m.source) {
      var s = m.source;
      var cover = s.cover ? n("img", { class: "m-source-cover", src: url(s.cover), alt: (s.titleKo || "") + " 표지" }) : null;
      if (cover) cover.addEventListener("error", function () { cover.remove(); });
      app.appendChild(n("div", { class: "m-source fade-up" }, [
        cover,
        n("div", { class: "m-source-meta" }, [
          n("p", { class: "m-source-title", html: escapeHtml(s.titleKo || "") + (s.titleEn ? "<span>" + escapeHtml(s.titleEn) + "</span>" : "") }),
          s.by ? n("p", { class: "m-source-by", text: s.by }) : null
        ])
      ]));
      if (s.note) app.appendChild(n("p", { class: "m-source-note", text: s.note }));
      app.appendChild(n("hr", { class: "point-rule" }));
    }
    if (m.img) {
      var img = n("img", { class: "m-img", src: url(m.img), alt: "질문 " + (qi + 1) + " 참고 자료 이미지" });
      img.addEventListener("load", function () { img.classList.add("shown"); });
      var imgWrap = n("div", { class: "m-imgwrap fade-up" }, [img, creditLink("m-credit")]);
      var imgRule = n("hr", { class: "point-rule tight" });
      img.addEventListener("error", function () { imgWrap.remove(); imgRule.remove(); });
      setTimeout(function () { if (img.complete && img.naturalWidth) img.classList.add("shown"); }, 40);
      app.appendChild(imgWrap);
      app.appendChild(imgRule);
    }
    var textWrap = n("div", { class: "m-text" }, [n("p", { class: "m-loading", text: "자료를 불러오는 중…" })]);
    app.appendChild(textWrap);
    if (m.links && m.links.items && m.links.items.length) {
      app.appendChild(n("div", { class: "m-links fade-up" }, [
        m.links.label ? n("p", { class: "m-links-label", text: m.links.label }) : null
      ].concat(m.links.items.map(function (l) {
        var yt = youtubeId(l.url);
        var thumb = yt ? n("img", { class: "thumb", src: "https://i.ytimg.com/vi/" + yt + "/mqdefault.jpg", alt: "", loading: "lazy" }) : null;
        if (thumb) thumb.addEventListener("error", function () { thumb.remove(); });
        return n("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, [
          thumb, n("span", { class: "label", text: l.text }), n("span", { class: "go", text: "↗" })
        ]);
      }))));
    }
    if (m.credit) app.appendChild(creditLink("m-credit m-credit-page fade-up"));
    if (R.materialNote) app.appendChild(n("p", { class: "m-wait fade-up", text: R.materialNote }));

    var back = n("button", { class: "btn-back", text: "← 뒤로", onclick: function () { go(idx - 1); } });
    var next = n("button", { class: "btn-next", text: "다음 →", onclick: function () { go(idx + 1); } });
    app.appendChild(n("div", { class: "nav" }, [back, next]));

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
  // 첫 줄 = 제목, "로 시작 = 인용, —로 시작 = 출처, 나머지 = 문단
  function parseText(text) {
    var ls = text.replace(/\r/g, "").split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    var title = ls.shift() || "";
    var blocks = ls.map(function (line) {
      if (/^—/.test(line)) return { t: "cite", text: line.replace(/^—\s*/, "") };
      if (/^["“]/.test(line)) return { t: "quote", text: line };
      return { t: "p", text: line };
    });
    return { title: title, blocks: blocks };
  }
  function renderText(wrap, parsed) {
    if (parsed.title) wrap.appendChild(n("h2", { class: "m-title fade-up", text: parsed.title }));
    parsed.blocks.forEach(function (b, i) {
      var el;
      if (b.t === "quote") el = n("blockquote", { class: "m-quote fade-up", html: fmt(b.text) });
      else if (b.t === "cite") el = n("p", { class: "m-cite fade-up", text: "— " + b.text });
      else el = n("p", { class: "m-p fade-up", html: fmt(b.text) });
      el.style.animationDelay = Math.min(0.45, 0.06 + i * 0.04) + "s";
      wrap.appendChild(el);
    });
  }

  // --- 카드에 넣을 이름 ---
  function renderName() {
    var input = n("input", { type: "text", class: "name-input", maxlength: "20", placeholder: "이름 또는 닉네임", autocomplete: "nickname" });
    input.value = state.name || "";
    input.addEventListener("input", function () { state.name = input.value; save(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") make(); });
    function make() { state.name = input.value.trim(); save(); go(idx + 1); }

    app.appendChild(progress("카드 만들기", Math.round((idx / LAST) * 100)));
    app.appendChild(n("div", { class: "qblock fade-up" }, [
      n("p", { class: "question", text: "카드에 표시할 이름" }),
      n("p", { class: "hint", text: "비워 두면 이름 없이 만들어요." }),
      input
    ]));
    app.appendChild(n("div", { class: "nav" }, [
      n("button", { class: "btn-back", text: "← 뒤로", onclick: function () { go(idx - 1); } }),
      n("button", { class: "btn-next", text: "카드 만들기 →", onclick: make })
    ]));
  }

  // --- 카드 덱 ---
  function renderDone() {
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
    app.appendChild(n("hr", { class: "point-rule" }));
    app.appendChild(n("div", { class: "center" }, [n("p", { class: "closing fade-up", html: lines(closingText) })]));
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
      n("button", { class: "btn-back", text: "← 답 고치기", onclick: function () { go(1); } }),
      n("span", { class: "spacer" })
    ]));

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

      STEPS = [{ t: "intro" }];
      QUESTIONS.forEach(function (q, i) {
        STEPS.push({ t: "q", i: i });
        if (q.material) STEPS.push({ t: "m", i: i });
      });
      STEPS.push({ t: "name" }, { t: "done" });
      LAST = STEPS.length - 1;

      load();
      renderCurrent();
    })
    .catch(function () { renderMissing(); });
})();
