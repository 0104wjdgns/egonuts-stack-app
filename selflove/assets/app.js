/* ============================================================
   에고너츠 '사랑과 이기심' — 참가자 발제문 폼 (/selflove/)
   흐름: 이름 선택 → (질문 → 참고자료)×5 → Q6 → 완료
   - 질문에 답을 써야 다음(참고자료)으로 진행 (답 쓴 뒤에만 자료 공개)
   - 참고자료: 이미지 먼저, 아래로 스크롤하며 원문 텍스트 읽기
   - 답은 참가자 기기(localStorage)에만 저장. 서버·DB 없음.
   ============================================================ */
(function () {
  "use strict";

  // DB 없음. 초안 키만 회차별로 고정.
  var STORE_KEY = "egonuts-selflove-local";

  var NAMES = ["참가자 A", "참가자 B", "참가자 C", "참가자 D", "참가자 E", "참가자 F"];

  var QUESTIONS = [
    {
      key: "q1", text: "한 문장으로 적어본다면, 당신에게 사랑이란 무엇인가요?",
      hint: "한 문장. 당신만의 정의를 내려봐요.",
      fields: [{ name: "q1", placeholder: "사랑이란 …" }],
      material: {
        img: "/selflove/assets/materials/q1.jpg", txt: "/selflove/assets/materials/q1.txt",
        source: {
          cover: "/selflove/assets/books/love.jpg",
          titleKo: "사랑의 기술",
          titleEn: "The Art of Loving",
          by: "Erich Fromm · 1956",
          note: "이번 토론 발제문은 에리히 프롬의 《사랑의 기술》을 참고했습니다."
        }
      }
    },
    {
      key: "q2", text: "두 사람 사이, 당신이 그리는 이상적인 사랑의 관계는 어떤 모습인가요?",
      fields: [{ name: "q2", placeholder: "" }],
      material: { img: "/selflove/assets/materials/q2.jpg", txt: "/selflove/assets/materials/q2.txt" }
    },
    {
      key: "q3", text: "사랑 안에서 이기심 혹은 자기애란 당신에게 무엇인가요?",
      fields: [{ name: "q3", placeholder: "" }],
      material: { img: "/selflove/assets/materials/q3.jpg", txt: "/selflove/assets/materials/q3.txt" }
    },
    {
      key: "q4", text: "두 사람은 언제 '우리'가 되고, 또 언제 '나'와 '당신'으로 돌아가나요?",
      fields: [{ name: "q4", placeholder: "" }],
      material: { img: "/selflove/assets/materials/q4.jpg", txt: "/selflove/assets/materials/q4.txt" }
    },
    {
      key: "q5", text: "이기심 혹은 자기애는 연인 관계에서 —",
      fields: [
        { name: "q5_1", label: "① 어떻게 드러나나요? (관찰)", placeholder: "" },
        { name: "q5_2", label: "② 사랑을 저해하나요, 아니면 오히려 사랑을 근원적으로 가능하게 하나요? (판단)", placeholder: "" }
      ],
      material: { img: "/selflove/assets/materials/q5.jpg", txt: "/selflove/assets/materials/q5.txt" }
    },
    {
      key: "q6", text: "사랑과 이기심을 지나온 지금, 당신 안에 새로 생긴 '나만의 질문' 하나는 무엇인가요?",
      hint: "결론이 아니라, 당신에게 남는 질문.",
      fields: [{ name: "q6", placeholder: "" }],
      material: null
    }
  ];
  var NQ = QUESTIONS.length;

  // 스텝: intro → (질문 → 자료)... → done
  var STEPS = [{ t: "intro" }];
  QUESTIONS.forEach(function (q, i) {
    STEPS.push({ t: "q", i: i });
    if (q.material) STEPS.push({ t: "m", i: i });
  });
  STEPS.push({ t: "done" });
  var LAST = STEPS.length - 1;

  var state = { name: "", answers: {} };
  // 답안은 '이름별'로 이 기기(브라우저)에 저장한다.
  //  - 시작 화면은 항상 빈 상태(이름 고르기 전엔 아무 답도 안 보임)
  //  - 자기 이름을 다시 누르면 그 이름으로 쓰던 답이 복원됨 (같은 기기 한정)
  try { localStorage.removeItem(STORE_KEY); } catch (e) {} // 옛 전역 초안 키 정리
  function draftKey(name) { return STORE_KEY + "-" + encodeURIComponent(name); }
  function loadDraft(name) {
    try { var s = JSON.parse(localStorage.getItem(draftKey(name)) || "null"); return (s && s.answers) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    if (!state.name) return;
    try { localStorage.setItem(draftKey(state.name), JSON.stringify({ answers: state.answers })); } catch (e) {}
  }

  var app = document.getElementById("app");
  var idx = 0;
  var textCache = {};

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
    return renderDone();
  }

  function progress(label, pct) {
    var span = n("span"); span.style.width = pct + "%";
    return n("div", { class: "progress" }, [
      n("div", { class: "count", text: label }),
      n("div", { class: "bar" }, [span])
    ]);
  }

  // --- 인트로 ---
  function renderIntro() {
    var grid = n("div", { class: "name-grid" });
    NAMES.forEach(function (nm, i) {
      var b = n("button", {
        class: "name-btn fade-up" + (state.name === nm ? " selected" : ""),
        text: nm + "님",
        onclick: function () { state.name = nm; state.answers = loadDraft(nm); go(1); }
      });
      b.style.animationDelay = (0.18 + i * 0.05) + "s";
      grid.appendChild(b);
    });

    app.appendChild(n("div", { class: "center" }, [
      n("p", { class: "kicker fade-up", text: "에고너츠" }),
      n("p", { class: "lead fade-up", text: "사랑과 이기심" }),
      n("div", { class: "intro-core fade-up" }, [
        n("p", { class: "core-label", text: "핵심 질문" }),
        n("p", { class: "core-q", html: "이기심 혹은 자기애는 사랑을 저해하는가?<br/>오히려 사랑을 가능하게 하는가?" })
      ]),
      n("p", { class: "sub fade-up", html: "핵심 질문에 답하기 위한 질문들을 고민해보고,<br/>발제문 후반부에 핵심 질문에 답해보는 방식으로 따라가보겠습니다!" }),
      n("p", { class: "pick-label fade-up", text: "당신의 이름을 선택해 주세요" }),
      grid
    ]));
  }

  // --- 질문 ---
  function renderQuestion(qi) {
    var q = QUESTIONS[qi];
    var pct = Math.round((idx / LAST) * 100);
    var isLast = !q.material; // Q6

    var nudge = n("p", { class: "nudge", text: "먼저 당신의 생각을 한 줄이라도 적어 주세요." });
    nudge.style.display = "none";

    var block = n("div", { class: "qblock fade-up" }, [ n("p", { class: "question", text: q.text }) ]);
    if (q.hint) block.appendChild(n("p", { class: "hint", text: q.hint }));
    q.fields.forEach(function (f) {
      if (f.label) block.appendChild(n("label", { class: "field-label", text: f.label }));
      var ta = n("textarea", { rows: "2", placeholder: f.placeholder || "" });
      ta.value = state.answers[f.name] || "";
      ta.addEventListener("input", function () {
        state.answers[f.name] = ta.value; save(); autoGrow(ta); nudge.style.display = "none";
      });
      block.appendChild(ta);
      setTimeout(function () { autoGrow(ta); }, 0);
    });
    block.appendChild(nudge);

    var back = n("button", { class: "btn-back", text: "← 뒤로", onclick: function () { go(idx - 1); } });
    var next = n("button", { class: "btn-next", text: isLast ? "완료하기" : "다음 →", onclick: function () {
      var filled = q.fields.some(function (f) { return (state.answers[f.name] || "").trim().length > 0; });
      if (!filled) { nudge.style.display = "block"; return; }
      save();
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

    var img = n("img", { class: "m-img", src: m.img, alt: "질문 " + (qi + 1) + " 참고 자료 이미지" });
    img.addEventListener("load", function () { img.classList.add("shown"); });
    img.addEventListener("error", function () { img.style.display = "none"; });
    setTimeout(function () { if (img.complete && img.naturalWidth) img.classList.add("shown"); }, 40);

    var textWrap = n("div", { class: "m-text" }, [ n("p", { class: "m-loading", text: "자료를 불러오는 중…" }) ]);

    var back = n("button", { class: "btn-back", text: "← 뒤로", onclick: function () { go(idx - 1); } });
    var next = n("button", { class: "btn-next", text: "다음 →", onclick: function () { go(idx + 1); } });

    app.appendChild(progress("질문 " + (qi + 1) + " · 참고 자료", pct));
    if (m.source) {
      var s = m.source;
      app.appendChild(n("div", { class: "m-source fade-up" }, [
        n("img", { class: "m-source-cover", src: s.cover, alt: s.titleKo + " 표지" }),
        n("div", { class: "m-source-meta" }, [
          n("p", { class: "m-source-title", html: escapeHtml(s.titleKo) + "<span>" + escapeHtml(s.titleEn) + "</span>" }),
          n("p", { class: "m-source-by", text: s.by })
        ])
      ]));
      app.appendChild(n("p", { class: "m-source-note", text: s.note }));
      app.appendChild(n("hr", { class: "gold-rule" }));
    }
    app.appendChild(n("div", { class: "m-imgwrap fade-up" }, [img]));
    app.appendChild(n("hr", { class: "gold-rule" }));
    app.appendChild(textWrap);
    app.appendChild(n("div", { class: "nav" }, [back, next]));

    loadText(m.txt, function (parsed, err) {
      textWrap.innerHTML = "";
      if (err || !parsed) { textWrap.appendChild(n("p", { class: "m-loading", text: "(자료 텍스트를 불러오지 못했어요)" })); return; }
      renderText(textWrap, parsed);
    });
  }

  function loadText(url, cb) {
    if (textCache[url]) { cb(textCache[url]); return; }
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { var p = parseText(t); textCache[url] = p; cb(p); })
      .catch(function (e) { cb(null, e); });
  }
  function parseText(text) {
    var lines = text.replace(/\r/g, "").split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    var title = lines.shift() || "";
    var blocks = lines.map(function (line) {
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

  // --- 완료 (서버 저장 없음 · 이 기기에만 남음) ---
  function bookCard(src, title) {
    var img = n("img", { src: src, alt: title });
    var ph = n("div", { class: "ph", text: "표지 이미지 자리" });
    ph.style.display = "none";
    img.addEventListener("error", function () { img.style.display = "none"; ph.style.display = "flex"; });
    return n("div", { class: "book" }, [
      n("div", { class: "cover" }, [img, ph]),
      n("p", { class: "book-title", text: "《" + title + "》" })
    ]);
  }
  function renderDone() {
    app.appendChild(n("div", { class: "center" }, [
      n("p", { class: "kicker fade-up", text: state.name + " 님" }),
      n("p", { class: "lead fade-up", text: "작성 완료" }),
      n("p", { class: "closing fade-up", html: "이것으로 에고너츠 《사랑과 이기심》 토론을 마치겠습니다!<br/>답은 이 기기에만 저장돼 있어요. 함께 자리해주셔서 감사합니다!" }),
      n("hr", { class: "gold-rule" }),
      n("p", { class: "books-label fade-up", text: "추천 도서 · 에리히 프롬" }),
      n("div", { class: "books fade-up" }, [
        bookCard("/selflove/assets/books/love.jpg", "사랑의 기술"),
        bookCard("/selflove/assets/books/being.jpg", "존재의 기술")
      ]),
      n("div", { class: "nav" }, [
        n("button", { class: "btn-back", text: "← 답 다시 보기 · 수정", onclick: function () { go(1); } })
      ]),
      n("p", { class: "notice", text: "답은 이 브라우저에만 남아 있어요. 서버로 보내지 않습니다." })
    ]));
  }


  renderCurrent();
})();
