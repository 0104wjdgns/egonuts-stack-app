/* ============================================================
   에고너츠 스택 — 배색
   회차마다 main(배경) · point(포인트) 두 색만 받아 나머지를 계산한다.
   - bgDeep: main을 살짝 어둡게 (위→아래 그라데이션)
   - ink:    main 밝기에 맞춘 글자색 (어두운 배경 → 밝은 글자)
   - strong: 꼭 보여야 하는 요소(버튼·번호·포커스)용. point가 배경과
             대비가 약하면 ink로 대신한다.
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
    var main = hex(colors.main || "#3d0f1c");
    var point = hex(colors.point || "#c9a35c");
    var dark = lum(main) < 0.3;
    var deep = mix(main, [0, 0, 0], dark ? 0.15 : 0.06);
    var ink = colors.ink ? hex(colors.ink) : (dark ? mix([255, 255, 255], main, 0.06) : mix([22, 22, 24], main, 0.2));
    var strong = contrast(point, main) >= 3 ? point : ink;
    return {
      dark: dark,
      bg: toHex(main), bgDeep: toHex(deep),
      ink: toHex(ink), inkSoft: rgba(ink, 0.62), inkFaint: rgba(ink, 0.34), line: rgba(ink, 0.13),
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
