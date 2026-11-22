/* ============================================================
   에고너츠 스택 — 카드 덱 렌더러 (4:5, 1080×1350) · 「친절과 용기」 전용 복사본
   표지 겸 목차 1장 + 질문마다 1장. 캔버스에 직접 그린다
   (웹폰트를 그대로 쓰므로 캡처 라이브러리의 폰트 누락 문제가 없다).
   - 답이 길면 글자를 단계적으로 줄이고, 최소 크기에서도 넘치면
     그 질문만 '이어서' 페이지로 나눈다.
   - finale: true 질문은 답을 가운데 크게 놓는 마무리 카드.
   ============================================================ */
(function () {
  "use strict";

  var W = 1080, H = 1350, PX = 100;
  var TOP = 150;            // 머리글 기준선
  var FOOT = H - 108;       // 바닥글 기준선
  var BODY_BOTTOM = H - 186;
  var FAMILY = '"Noto Serif KR", ui-serif, Georgia, serif';
  var BAND = 392;           // 질문 카드 사진 머리
  var BAND_CONT = 148;

  function font(w, s) { return w + " " + s + "px " + FAMILY; }

  // 페이지 CSS와 같은 표지·종이·하늘. palette(round.json colors)가 주면 그 값을 쓴다.
  function mood(p) {
    p = p || {};
    return {
      sky: p.sky || "#7FA7C9",
      paper: p.paper || "#f6f0e6",
      onDark: p.onDark || "#f6f3ee",
      onDarkSoft: "rgba(246, 243, 238, 0.82)",
      coverGold: p.coverGold || "#f0b49a",
      cover: (p.cover && p.cover.length === 3) ? p.cover : ["#c46245", "#3a2a30", "#1a2330"],
      night: p.night || "#1a2330",
      inkSoft: "rgba(44, 33, 28, 0.78)"
    };
  }
  function coverImage(ctx, img, x, y, w, h) {
    var ir = img.naturalWidth / img.naturalHeight, r = w / h;
    var sx, sy, sw, sh;
    if (ir > r) { sh = img.naturalHeight; sw = sh * r; sx = (img.naturalWidth - sw) / 2; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / r; sx = 0; sy = (img.naturalHeight - sh) * 0.42; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  function scrim(ctx, x, y, w, h) {
    ctx.fillStyle = "rgba(26, 35, 48, 0.22)";
    ctx.fillRect(x, y, w, h);
    var g = ctx.createLinearGradient(0, y + h * 0.25, 0, y + h);
    g.addColorStop(0, "rgba(26, 35, 48, 0)");
    g.addColorStop(1, "rgba(26, 35, 48, 0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  function logoMark(ctx, img, x, y, s) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(26, 35, 48, 0.82)";
    ctx.fill();
    ctx.clip();
    ctx.drawImage(img, x + 5, y + 5, s - 10, s - 10);
    ctx.restore();
  }
  function loadImg(src) {
    return new Promise(function (res) {
      if (!src) { res(null); return; }
      var img = new Image();
      img.onload = function () { res(img.naturalWidth ? img : null); };
      img.onerror = function () { res(null); };
      img.src = src;
    });
  }
  function loadDeckImages(R) {
    var jobs = (R.questions || []).map(function (q) {
      return loadImg(q.material && q.material.img);
    });
    jobs.push(loadImg("assets/logo.png"));
    return Promise.all(jobs).then(function (list) {
      return { photos: list.slice(0, -1), logo: list[list.length - 1] };
    });
  }

  // 답안 키: 질문 하나에 칸이 하나면 q1, 여럿이면 q5_1, q5_2 …
  function fieldName(q, qi, fi) {
    var key = q.key || "q" + (qi + 1);
    var fields = q.fields || [{}];
    if (fields[fi] && fields[fi].name) return fields[fi].name;
    return fields.length > 1 ? key + "_" + (fi + 1) : key;
  }

  // --- 텍스트 줄바꿈: 띄어쓰기 단위, 너무 긴 낱말은 글자 단위 ---
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text || "").replace(/\r/g, "").split("\n").forEach(function (para) {
      if (!para.trim()) { out.push(""); return; }
      var line = "";
      para.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (ctx.measureText(line + w).width <= maxW) { line += w; return; }
        if (/^\s+$/.test(w)) { out.push(line); line = ""; return; }
        if (line.trim()) out.push(line.replace(/\s+$/, ""));
        line = "";
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        Array.from(w).forEach(function (ch) {
          if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; }
          else line += ch;
        });
      });
      out.push(line.replace(/\s+$/, ""));
    });
    // 끝의 빈 줄 정리
    while (out.length && out[out.length - 1] === "") out.pop();
    return out;
  }
  function ellipsize(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var chars = Array.from(text);
    while (chars.length && ctx.measureText(chars.join("") + "…").width > maxW) chars.pop();
    return chars.join("") + "…";
  }
  function clampLines(ctx, lines, max, maxW) {
    if (lines.length <= max) return lines;
    var kept = lines.slice(0, max);
    kept[max - 1] = ellipsize(ctx, kept[max - 1] + " " + lines[max], maxW);
    return kept;
  }
  // 자간을 준 한 줄 (canvas letterSpacing 미지원 브라우저 대비 직접 그림)
  function spaced(ctx, text, x, y, sp, align) {
    var chars = Array.from(text);
    var ws = chars.map(function (c) { return ctx.measureText(c).width; });
    var total = ws.reduce(function (a, b) { return a + b; }, 0) + sp * Math.max(0, chars.length - 1);
    var cx = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
    ctx.textAlign = "left";
    chars.forEach(function (c, i) { ctx.fillText(c, cx, y); cx += ws[i] + sp; });
    return total;
  }

  // --- 공통 바탕: 크림 종이 + 위쪽 하늘색 실. 코랄 테두리는 두지 않는다 ---
  function background(ctx, p) {
    var m = mood(p);
    ctx.fillStyle = m.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = m.sky;
    ctx.fillRect(0, 0, W, 10);
    ctx.textBaseline = "alphabetic";
  }
  function footer(ctx, p, left, page, total) {
    ctx.font = font(400, 24);
    ctx.fillStyle = mood(p).inkSoft;
    ctx.textBaseline = "alphabetic";
    var numW = spaced(ctx, page + " / " + total, W - PX, FOOT, 2, "right");
    if (left) { ctx.textAlign = "left"; ctx.fillText(ellipsize(ctx, left, W - 2 * PX - numW - 40), PX, FOOT); }
  }

  // --- 표지 겸 목차: 위는 페이지 표지(깊은 노을), 아래는 크림 목차 ---
  function coverPage(ctx, R, name, subtitle, logo) {
    var qs = R.questions;
    var tocW = W - 2 * PX - 86;
    var SPLIT = 612;
    var tocTop = SPLIT + 48;
    var tocBottom = FOOT - 56;

    ctx.font = font(300, 92);
    var titleLines = clampLines(ctx, wrap(ctx, R.title, W - 2 * PX - 120), 2, W - 2 * PX - 120);
    var titleY = 292;

    var layout;
    [34, 31, 29, 27, 25, 23].some(function (s) {
      ctx.font = font(400, s);
      var lh = Math.round(s * 1.5), pad = Math.round(s * 0.62);
      var items = qs.map(function (q, i) {
        var label = (q.short || q.text || "").trim();
        var empty = !label;
        var lines = empty ? ["질문 " + (i + 1)] : clampLines(ctx, wrap(ctx, label, tocW), 2, tocW);
        return { lines: lines, empty: empty, h: pad * 2 + lines.length * lh };
      });
      var total = items.reduce(function (a, it) { return a + it.h; }, 0);
      layout = { s: s, lh: lh, pad: pad, items: items };
      return tocTop + total <= tocBottom;
    });

    return function draw(ctx, p, page, total) {
      var m = mood(p);
      var g = ctx.createRadialGradient(W * 0.5, H * 0.70, 20, W * 0.5, H * 0.70, H * 0.85);
      g.addColorStop(0, m.cover[0]);
      g.addColorStop(0.40, m.cover[1]);
      g.addColorStop(0.68, m.cover[2]);
      g.addColorStop(1, m.cover[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = m.paper;
      ctx.fillRect(0, SPLIT + 12, W, H - SPLIT - 12);
      ctx.fillStyle = m.sky;
      ctx.fillRect(0, SPLIT, W, 12);

      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.font = font(500, 24);
      ctx.fillStyle = m.onDarkSoft;
      spaced(ctx, "EGONUTS" + (R.date ? "  ·  " + R.date : ""), PX, 156, 4);
      if (logo) logoMark(ctx, logo, W - PX - 86, 108, 86);

      ctx.font = font(300, 92);
      ctx.fillStyle = m.onDark;
      titleLines.forEach(function (l, i) { ctx.fillText(l, PX, titleY + i * 108); });

      var ruleY = titleY + (titleLines.length - 1) * 108 + 36;
      ctx.fillStyle = m.coverGold;
      ctx.fillRect(PX, ruleY, 56, 3);

      ctx.font = font(400, 32);
      ctx.fillStyle = m.onDarkSoft;
      ctx.fillText(ellipsize(ctx, subtitle || (name ? name + "의 토론 로그" : "나의 토론 로그"), W - 2 * PX), PX, ruleY + 72);

      var y = tocTop, L = layout;
      ctx.fillStyle = "rgba(44, 33, 28, 0.16)";
      ctx.fillRect(PX, y, W - 2 * PX, 1);
      L.items.forEach(function (it, i) {
        var base = y + L.pad + L.lh * 0.5;
        ctx.textBaseline = "middle";
        ctx.font = font(500, Math.round(L.s * 0.86));
        ctx.fillStyle = p.strong;
        spaced(ctx, (i < 9 ? "0" : "") + (i + 1), PX, base, 2);
        ctx.font = font(it.empty ? 300 : 400, L.s);
        ctx.fillStyle = it.empty ? m.inkSoft : p.ink;
        ctx.textAlign = "left";
        it.lines.forEach(function (l, j) { ctx.fillText(l, PX + 86, base + j * L.lh); });
        y += it.h;
        ctx.fillStyle = "rgba(44, 33, 28, 0.16)";
        ctx.fillRect(PX, y, W - 2 * PX, 1);
      });
      ctx.textBaseline = "alphabetic";
      footer(ctx, p, R.source ? "참고 · " + R.source : "", page, total);
    };
  }

  // --- 질문 카드 ---
  function bodyRows(ctx, q, qi, answers, s) {
    var fields = q.fields || [{}];
    var rows = [];
    var ansW = W - 2 * PX, lh = Math.round(s * 1.72);
    var ls = Math.round(s * 0.78), llh = Math.round(ls * 1.5);
    fields.forEach(function (f, fi) {
      if (fi > 0) rows.push({ kind: "gap", h: Math.round(s * 1.15) });
      if (f.label) {
        ctx.font = font(500, ls);
        wrap(ctx, f.label, W - 2 * PX).forEach(function (l) { rows.push({ kind: "label", text: l, s: ls, h: llh }); });
        rows.push({ kind: "gap", h: Math.round(s * 0.45) });
      }
      var a = (answers[fieldName(q, qi, fi)] || "").trim();
      ctx.font = font(400, s);
      if (!a) { rows.push({ kind: "ans", text: "—", empty: true, s: s, h: lh }); return; }
      wrap(ctx, a, ansW).forEach(function (l) {
        rows.push({ kind: "ans", text: l, s: s, h: l === "" ? Math.round(lh * 0.5) : lh });
      });
    });
    return rows;
  }
  function rowsHeight(rows) { return rows.reduce(function (a, r) { return a + r.h; }, 0); }

  function questionHeader(ctx, q, qi, band) {
    var qSize = 42, lh = 64;
    ctx.font = font(500, qSize);
    var text = (q.text || "").trim();
    var lines = text ? wrap(ctx, text, W - 2 * PX) : ["질문 " + (qi + 1)];
    var numY = band + 86;
    var textY = numY + 84;
    var bodyTop = textY + (lines.length - 1) * lh + 52;
    return { lines: lines, empty: !text, bodyTop: bodyTop, lh: lh, qSize: qSize, band: band, numY: numY, textY: textY };
  }

  function questionPages(ctx, R, q, qi, answers, name, imgs) {
    var photo = imgs && imgs.photos ? imgs.photos[qi] : null;
    var logo = imgs && imgs.logo;
    var band = photo ? (q.finale ? 460 : BAND) : 200;
    var head = questionHeader(ctx, q, qi, band);
    var footLeft = R.title + (name ? " · " + name : "");
    var pages = [];
    var avail = BODY_BOTTOM - head.bodyTop;

    // 마무리 카드: 답을 가운데 크게. 바탕은 페이지 완료 화면의 옅은 하늘.
    if (q.finale && (q.fields || [{}]).length === 1) {
      var a = (answers[fieldName(q, qi, 0)] || "").trim();
      var fin = null;
      [56, 50, 45, 41, 37, 34].some(function (s) {
        ctx.font = font(500, s);
        var lines = a ? wrap(ctx, a, W - 2 * PX - 40) : ["—"];
        var lh = Math.round(s * 1.6);
        if (lines.length * lh + 90 <= avail) { fin = { s: s, lh: lh, lines: lines }; return true; }
        return false;
      });
      if (fin) {
        pages.push(function (ctx, p, page, total) {
          drawQuestionTop(ctx, p, q, qi, head, false, photo, logo, true);
          var blockH = fin.lines.length * fin.lh;
          var y0 = head.bodyTop + (avail - blockH) / 2 + 20;
          ctx.fillStyle = p.point;
          ctx.fillRect(W / 2 - 24, y0 - 56, 48, 2);
          ctx.font = font(500, fin.s);
          ctx.fillStyle = a ? p.ink : mood(p).inkSoft;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          fin.lines.forEach(function (l, i) { ctx.fillText(l, W / 2, y0 + i * fin.lh + fin.lh / 2); });
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          footer(ctx, p, footLeft, page, total);
        });
        return pages;
      }
    }

    // 일반 카드: 글자 크기 맞추기 → 그래도 넘치면 페이지 나누기
    var rows, s;
    var fits = [38, 35, 32, 30, 28].some(function (size) {
      s = size;
      rows = bodyRows(ctx, q, qi, answers, size);
      return rowsHeight(rows) <= avail;
    });
    var chunks = [];
    if (fits) chunks.push(rows);
    else {
      // 어차피 나눌 거라면 읽기 좋은 크기로 나눈다
      rows = bodyRows(ctx, q, qi, answers, 32);
      var contTop = (photo ? BAND_CONT : 0) + 78 + 70, cur = [], used = 0, limit = avail;
      rows.forEach(function (r) {
        if (!cur.length && r.kind === "gap") return;
        if (used + r.h > limit && cur.length) {
          chunks.push(cur); cur = []; used = 0; limit = BODY_BOTTOM - contTop;
          if (r.kind === "gap") return;
        }
        cur.push(r); used += r.h;
      });
      if (cur.length) chunks.push(cur);
    }
    chunks.forEach(function (chunk, ci) {
      pages.push(function (ctx, p, page, total) {
        var y = drawQuestionTop(ctx, p, q, qi, head, ci > 0, photo, logo, false);
        drawRows(ctx, p, chunk, y);
        footer(ctx, p, footLeft, page, total);
      });
    });
    return pages;
  }

  function drawQuestionTop(ctx, p, q, qi, head, cont, photo, logo, finale) {
    var m = mood(p);
    ctx.fillStyle = m.paper;
    ctx.fillRect(0, 0, W, H);
    var band = cont ? (photo ? BAND_CONT : 0) : (head.band || 0);
    if (band && photo) {
      coverImage(ctx, photo, 0, 0, W, band);
      scrim(ctx, 0, 0, W, band);
    } else if (band) {
      var dusk = ctx.createLinearGradient(0, 0, 0, band);
      dusk.addColorStop(0, m.cover[2]);
      dusk.addColorStop(0.62, m.cover[1]);
      dusk.addColorStop(1, m.cover[0]);
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, W, band);
    }
    if (band) {
      ctx.fillStyle = m.sky;
      ctx.fillRect(0, band, W, 8);
      var wash = ctx.createLinearGradient(0, band + 8, 0, band + 8 + (finale ? 340 : 200));
      wash.addColorStop(0, finale ? "rgba(127, 167, 201, 0.42)" : "rgba(127, 167, 201, 0.26)");
      wash.addColorStop(1, "rgba(127, 167, 201, 0)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, band + 8, W, finale ? 340 : 200);
    } else {
      ctx.fillStyle = m.sky;
      ctx.fillRect(0, 0, W, 10);
    }
    if (logo) logoMark(ctx, logo, W - 36 - 78, 28, 78);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    var num = (qi < 9 ? "0" : "") + (qi + 1);
    if (cont) {
      var yNum = band + 78;
      ctx.font = font(300, 48);
      ctx.fillStyle = p.strong;
      var w = spaced(ctx, num, PX, yNum, 1);
      ctx.font = font(400, 26);
      ctx.fillStyle = m.inkSoft;
      ctx.fillText("   이어서", PX + w, yNum);
      ctx.fillStyle = p.point;
      ctx.fillRect(PX, yNum + 24, 56, 3);
      return yNum + 70;
    }
    ctx.font = font(300, 60);
    ctx.fillStyle = p.strong;
    var nw = spaced(ctx, num, PX, head.numY, 1);
    if (q.short) {
      ctx.font = font(400, 26);
      ctx.fillStyle = p.strong;
      ctx.fillText(ellipsize(ctx, q.short, W - 2 * PX - nw - 28), PX + nw + 22, head.numY - 2);
    }
    ctx.fillStyle = p.point;
    ctx.fillRect(PX, head.numY + 24, 56, 3);
    ctx.font = font(500, head.qSize);
    ctx.fillStyle = head.empty ? m.inkSoft : p.ink;
    head.lines.forEach(function (l, i) { ctx.fillText(l, PX, head.textY + i * head.lh); });
    return head.bodyTop;
  }

  function drawRows(ctx, p, rows, y) {
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    rows.forEach(function (r) {
      if (r.kind === "label") {
        ctx.font = font(500, r.s);
        ctx.fillStyle = p.strong;
        ctx.fillText(r.text, PX, y + r.h / 2);
      } else if (r.kind === "ans") {
        ctx.font = font(400, r.s);
        ctx.fillStyle = r.empty ? mood(p).inkSoft : p.ink;
        ctx.fillText(r.text, PX, y + r.h / 2);
      } else if (r.kind === "text") {            // 일반 글줄: weight · color · indent · align 지정
        ctx.font = font(r.w || 400, r.s);
        ctx.fillStyle = p[r.color || "ink"];
        if (r.align === "right") { ctx.textAlign = "right"; ctx.fillText(r.text, W - PX, y + r.h / 2); ctx.textAlign = "left"; }
        else ctx.fillText(r.text, PX + (r.indent || 0), y + r.h / 2);
      } else if (r.kind === "quote") {
        ctx.fillStyle = p.point;
        ctx.fillRect(PX, y, 2, r.h);
        ctx.font = font(400, r.s);
        ctx.fillStyle = p.ink;
        ctx.fillText(r.text, PX + 28, y + r.h / 2);
      } else if (r.kind === "titlebar") {
        ctx.fillStyle = p.point;
        ctx.fillRect(PX, y + 6, 46, 2);
      } else if (r.kind === "image") {
        var x = r.align === "left" ? PX : (W - r.w) / 2;
        ctx.drawImage(r.img, x, y, r.w, r.h);
        ctx.strokeStyle = p.pointSoft;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, r.w - 1, r.h - 1);
      }
      y += r.h;
    });
    ctx.textBaseline = "alphabetic";
  }

  // --- 폰트 준비: 카드에 쓰일 글자의 웹폰트 조각을 미리 받아 둔다 ---
  function loadFonts(texts) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var sample = texts.join(" ").slice(0, 30000) + " EGONUTS 0123456789 Q·—…/";
    var jobs = [300, 400, 500, 600].map(function (w) {
      return document.fonts.load(w + ' 40px "Noto Serif KR"', sample).catch(function () {});
    });
    return Promise.race([
      Promise.all(jobs),
      new Promise(function (r) { setTimeout(r, 8000); })
    ]);
  }

  // R: 회차 설정, answers: {q1: "...", ...}, name: 카드 표시 이름, palette: EgoTheme.palette()
  // → [{ canvas, label }]
  function build(R, answers, name, palette) {
    var texts = [R.title, R.source || "", name || ""];
    R.questions.forEach(function (q, qi) {
      texts.push(q.text || "", q.short || "");
      (q.fields || [{}]).forEach(function (f, fi) { texts.push(f.label || "", answers[fieldName(q, qi, fi)] || ""); });
    });
    return loadFonts(texts).then(function () { return loadDeckImages(R); }).then(function (imgs) {
      var scratch = document.createElement("canvas").getContext("2d");
      var pages = [{ label: "00_표지", draw: coverPage(scratch, R, name, null, imgs.logo) }];
      R.questions.forEach(function (q, qi) {
        var qp = questionPages(scratch, R, q, qi, answers, name, imgs);
        qp.forEach(function (draw, k) {
          var num = (qi + 1 < 10 ? "0" : "") + (qi + 1);
          pages.push({ label: num + "_Q" + (qi + 1) + (k ? "-" + (k + 1) : ""), draw: draw });
        });
      });
      return pages.map(function (pg, i) {
        var c = document.createElement("canvas");
        c.width = W; c.height = H;
        pg.draw(c.getContext("2d"), palette, i + 1, pages.length);
        return { canvas: c, label: pg.label };
      });
    });
  }

  // ============================================================
  // 발제문 전체 덱 (관리자용): 표지 + 질문 카드(답 없이) + 참고 자료 카드
  // ============================================================
  var CW = W - 2 * PX;
  function plain(s) { return String(s || "").replace(/\*\*(.+?)\*\*/g, "$1"); }
  function textRows(ctx, rows, text, s, opt) {
    opt = opt || {};
    var lh = Math.round(s * (opt.lh || 1.7));
    ctx.font = font(opt.w || 400, s);
    wrap(ctx, plain(text), CW - (opt.indent || 0)).forEach(function (l) {
      rows.push({ kind: opt.kind || "text", text: l, s: s, h: l === "" ? Math.round(lh * 0.5) : lh,
        w: opt.w, color: opt.color, indent: opt.indent, align: opt.align, head: opt.head });
    });
  }
  // 이미지를 (maxW × maxH) 안에 비율 유지해 맞춤
  function imageRow(img, maxW, maxH, align) {
    var r = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    return { kind: "image", img: img, w: Math.round(img.naturalWidth * r), h: Math.round(img.naturalHeight * r), align: align };
  }

  function questionOnlyPage(ctx, R, q, qi, photo) {
    var head = questionHeader(ctx, q, qi, photo ? BAND : 200);
    var rows = [];
    if (q.hint) { textRows(ctx, rows, q.hint, 30, { w: 300, color: "inkSoft", lh: 1.6 }); rows.push({ kind: "gap", h: 34 }); }
    var fields = q.fields || [{}];
    fields.forEach(function (f) {
      if (!f.label) return;
      textRows(ctx, rows, f.label, 30, { w: 500, color: "strong", lh: 1.55 });
      rows.push({ kind: "gap", h: 18 });
    });
    return function (ctx, p, page, total) {
      var y = drawQuestionTop(ctx, p, q, qi, head, false, photo, null, !!q.finale);
      drawRows(ctx, p, rows, y);
      footer(ctx, p, R.title + " · 발제문", page, total);
    };
  }

  function materialRows(ctx, R, m, mat) {
    var rows = [];
    var s = m.source;
    if (s) {
      if (mat.cover) { rows.push(imageRow(mat.cover, CW, 380, "left")); rows.push({ kind: "gap", h: 28 }); }
      textRows(ctx, rows, s.titleKo, 40, { w: 600, lh: 1.4 });
      if (s.titleEn) textRows(ctx, rows, s.titleEn, 26, { color: "inkSoft", lh: 1.6 });
      if (s.by) textRows(ctx, rows, s.by, 26, { w: 500, color: "strong", lh: 1.6 });
      if (s.note) { rows.push({ kind: "gap", h: 22 }); textRows(ctx, rows, s.note, 28, { lh: 1.75 }); }
      rows.push({ kind: "gap", h: 40 });
    }
    if (mat.img) {
      rows.push(imageRow(mat.img, CW, 620, "center"));
      if (R.imageCredit) textRows(ctx, rows, R.imageCredit.text, 20, { w: 300, color: "inkFaint", align: "right", lh: 1.9 });
      rows.push({ kind: "gap", h: 26 });
    }
    var t = mat.parsed;
    if (t) {
      // 파트(책의 몇 장): 제목 위 머리표 / 본문 중간 소단락 머리표.
      // head: 페이지 끝에 홀로 남지 않고 다음 내용과 함께 넘어가는 줄 (간격은 줄 높이로 준다)
      (t.pre || []).forEach(function (x) { textRows(ctx, rows, x, 24, { w: 500, color: "strong", lh: 2.0, head: true }); });
      if (t.title) {
        textRows(ctx, rows, t.title, 40, { w: 600, lh: 1.45 });
        rows.push({ kind: "titlebar", h: 34 });
      }
      t.blocks.forEach(function (b, bi) {
        var next = t.blocks[bi + 1];
        var beforeCite = next && next.t === "cite";
        if (b.t === "part") { rows.push({ kind: "gap", h: 18 }); textRows(ctx, rows, b.text, 24, { w: 500, color: "strong", lh: 2.0, head: true }); }
        else if (b.t === "quote") { textRows(ctx, rows, b.text, 29, { kind: "quote", indent: 28, lh: 1.72, head: beforeCite }); rows.push({ kind: "gap", h: beforeCite ? 8 : 22 }); }
        else if (b.t === "cite") { textRows(ctx, rows, "— " + b.text, 22, { color: "inkSoft", align: "right", lh: 1.55 }); rows.push({ kind: "gap", h: 30 }); }
        else { textRows(ctx, rows, b.text, 29, { lh: 1.72, head: beforeCite }); rows.push({ kind: "gap", h: beforeCite ? 8 : 22 }); }
      });
    }
    if (m.links && m.links.items) {
      if (m.links.label) { textRows(ctx, rows, m.links.label, 24, { w: 500, color: "strong", lh: 1.7 }); rows.push({ kind: "gap", h: 6 }); }
      m.links.items.forEach(function (l) {
        textRows(ctx, rows, "· " + l.text, 29, { lh: 1.6 });
        textRows(ctx, rows, String(l.url).replace(/^https?:\/\//, "").replace(/\?.*$/, ""), 22, { w: 300, color: "inkFaint", indent: 26, lh: 1.6 });
        rows.push({ kind: "gap", h: 12 });
      });
    }
    if (m.credit && !mat.img && R.imageCredit) { rows.push({ kind: "gap", h: 16 }); textRows(ctx, rows, R.imageCredit.text, 22, { w: 300, color: "inkFaint", lh: 1.7 }); }
    while (rows.length && rows[rows.length - 1].kind === "gap") rows.pop();
    return rows;
  }

  function drawMaterialTop(ctx, p, qi, cont) {
    background(ctx, p);
    ctx.font = font(600, 34);
    ctx.fillStyle = p.strong;
    var w = spaced(ctx, "Q" + (qi + 1), PX, TOP, 3);
    ctx.font = font(400, 26);
    ctx.fillStyle = mood(p).inkSoft;
    ctx.fillText("  ·  참고 자료" + (cont ? "  ·  이어서" : ""), PX + w, TOP);
    ctx.font = font(500, 22);
    spaced(ctx, "EGONUTS", W - PX, TOP, 5, "right");
    ctx.fillStyle = p.point;
    ctx.fillRect(PX, TOP + 30, 48, 2);
    return TOP + 96;
  }

  function materialPages(ctx, R, q, qi, mat) {
    var rows = materialRows(ctx, R, q.material, mat);
    var top = TOP + 96, limit = BODY_BOTTOM - top;
    var chunks = [], cur = [], used = 0;
    rows.forEach(function (r) {
      if (!cur.length && r.kind === "gap") return;
      if (used + r.h > limit && cur.length) {
        // 제목이 페이지 끝에 홀로 남지 않도록 함께 넘긴다
        var carry = [];
        var isHead = function (x) { return x.head || x.kind === "titlebar" || (x.kind === "text" && x.w === 600); };
        while (cur.length && isHead(cur[cur.length - 1])) carry.unshift(cur.pop());
        if (!cur.length) { cur = carry; carry = []; }
        chunks.push(cur); cur = carry; used = rowsHeight(carry);
        if (r.kind === "gap") return;
      }
      cur.push(r); used += r.h;
    });
    if (cur.length) chunks.push(cur);
    return chunks.map(function (chunk, ci) {
      return function (ctx, p, page, total) {
        var y = drawMaterialTop(ctx, p, qi, ci > 0);
        drawRows(ctx, p, chunk, y);
        footer(ctx, p, R.title + " · 발제문", page, total);
      };
    });
  }

  // mats[qi] = { parsed, img, cover } (참고 자료가 없는 질문은 null) → [{ canvas, label }]
  function buildFull(R, mats, palette) {
    var texts = [R.title, R.source || "", "발제문"];
    R.questions.forEach(function (q, qi) {
      texts.push(q.text || "", q.short || "", q.hint || "");
      (q.fields || []).forEach(function (f) { texts.push(f.label || ""); });
      var m = q.material, mat = mats[qi];
      if (m && m.source) texts.push(m.source.titleKo || "", m.source.titleEn || "", m.source.by || "", m.source.note || "");
      if (m && m.links) texts.push(m.links.label || "", JSON.stringify(m.links.items || []));
      if (mat && mat.parsed) texts.push((mat.parsed.pre || []).join(" "), mat.parsed.title, mat.parsed.blocks.map(function (b) { return b.text; }).join(" "));
    });
    if (R.imageCredit) texts.push(R.imageCredit.text);
    return loadFonts(texts).then(function () { return loadDeckImages(R); }).then(function (imgs) {
      var scratch = document.createElement("canvas").getContext("2d");
      var pages = [{ label: "00_표지", draw: coverPage(scratch, R, "", "발제문", imgs.logo) }];
      R.questions.forEach(function (q, qi) {
        var num = (qi + 1 < 10 ? "0" : "") + (qi + 1);
        var photo = (mats[qi] && mats[qi].img) || imgs.photos[qi];
        pages.push({ label: num + "_Q" + (qi + 1), draw: questionOnlyPage(scratch, R, q, qi, photo) });
        if (q.material && mats[qi]) {
          materialPages(scratch, R, q, qi, mats[qi]).forEach(function (draw, k) {
            pages.push({ label: num + "_Q" + (qi + 1) + "_자료" + (k ? "-" + (k + 1) : ""), draw: draw });
          });
        }
      });
      return pages.map(function (pg, i) {
        var c = document.createElement("canvas");
        c.width = W; c.height = H;
        pg.draw(c.getContext("2d"), palette, i + 1, pages.length);
        return { canvas: c, label: pg.label };
      });
    });
  }

  window.EgoCards = { build: build, buildFull: buildFull, fieldName: fieldName, W: W, H: H };
})();
