/* ============================================================
   에고너츠 스택 — 배색 (「고통과 의미」 전용 복사본)
   회차마다 main(배경) · point(포인트) 두 색만 받아 나머지를 계산한다.
   - bgDeep: 어두운 배경은 main을 살짝 어둡게, 밝은 배경은 point 쪽으로 아주 살짝 물들인다
             (흰 바탕이 아래로 갈수록 은은한 금빛 미색이 되도록)
   - ink:    main 밝기에 맞춘 글자색 (어두운 배경 → 밝은 글자). colors.ink로 직접 줄 수 있다.
   - strong: 꼭 보여야 하는 요소(버튼·번호·포커스)용. colors.strong으로 직접 줄 수 있고,
             없으면 point가 배경과 대비가 충분할 때 point, 아니면 ink.
   - 밝은 배경에서는 흐린 글자(inkSoft · inkFaint)를 조금 더 진하게 해 읽기 쉽게 한다.
   ============================================================ */
(function () {
  "use strict";

  function hex(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
  }
  function toHex(c) {
    return "#" + c.map(function (v) {
      v = Math.round(Math.max(0, Math.min(255, v)));
      return (v < 16 ? "0" : "") + v.toString(16);
    }).join("");
  }
  function mix(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }
  function rgba(c, a) { return "rgba(" + c.map(Math.round).join(", ") + ", " + a + ")"; }
  function lum(c) {
    var l = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  }
  function contrast(a, b) {
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function palette(colors) {
    colors = colors || {};
    var main = hex(colors.main || "#ffffff");
    var point = hex(colors.point || "#b8924a");
    var dark = lum(main) < 0.3;
    var deep = dark ? mix(main, [0, 0, 0], 0.15) : mix(main, point, 0.07);
    var ink = colors.ink ? hex(colors.ink) : (dark ? mix([255, 255, 255], main, 0.06) : mix([22, 22, 24], main, 0.2));
    var strong = colors.strong ? hex(colors.strong) : (contrast(point, main) >= 3 ? point : ink);
    return {
      dark: dark,
      bg: toHex(main), bgDeep: toHex(deep),
      ink: toHex(ink), inkSoft: rgba(ink, dark ? 0.62 : 0.68), inkFaint: rgba(ink, dark ? 0.34 : 0.5), line: rgba(ink, 0.13),
      point: toHex(point), pointSoft: rgba(point, 0.55),
      strong: toHex(strong), strongSoft: rgba(strong, 0.55)
    };
  }

  function apply(p) {
    var s = document.documentElement.style;
    s.setProperty("--bg", p.bg);
    s.setProperty("--bg-deep", p.bgDeep);
    s.setProperty("--ink", p.ink);
    s.setProperty("--ink-soft", p.inkSoft);
    s.setProperty("--ink-faint", p.inkFaint);
    s.setProperty("--line", p.line);
    s.setProperty("--point", p.point);
    s.setProperty("--point-soft", p.pointSoft);
    s.setProperty("--strong", p.strong);
    s.setProperty("--strong-soft", p.strongSoft);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.bg);
  }

  window.EgoTheme = { palette: palette, apply: apply };
})();
