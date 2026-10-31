/* ============================================================
   에고너츠 스택 — 카드 내보내기
   - 이미지: 카드마다 PNG
   - PDF:   카드 크기 그대로 한 장씩 (jsPDF)
   - 공유:   휴대폰 공유 시트(Web Share) → 카카오톡 '나와의 채팅' 등
   - 카카오톡 인앱 브라우저는 파일 저장이 막히는 경우가 많아 외부 브라우저로 넘긴다.
   ============================================================ */
(function () {
  "use strict";

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error("이미지를 만들지 못했어요")); }, "image/png");
    });
  }

  function images(cards, base) {
    return Promise.all(cards.map(function (c) {
      return toBlob(c.canvas).then(function (b) {
        return new File([b], base + "_" + c.label + ".png", { type: "image/png" });
      });
    }));
  }

  function pdf(cards, base) {
    if (!window.jspdf || !window.jspdf.jsPDF) return Promise.reject(new Error("PDF 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요."));
    // 1080×1350 px → 540×675 pt (4:5)
    var Wp = 540, Hp = 675;
    var doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "pt", format: [Wp, Hp], compress: true });
    cards.forEach(function (c, i) {
      if (i) doc.addPage([Wp, Hp], "portrait");
      doc.addImage(c.canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, Wp, Hp, undefined, "FAST");
    });
    var blob = doc.output("blob");
    return Promise.resolve(new File([blob], base + ".pdf", { type: "application/pdf" }));
  }

  function canShare(files) {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: files })); }
    catch (e) { return false; }
  }
  function share(files, title) {
    return navigator.share({ files: files, title: title });
  }

  function download(file) {
    var url = URL.createObjectURL(file);
    var a = document.createElement("a");
    a.href = url; a.download = file.name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function downloadAll(files) {
    // 여러 파일을 한꺼번에 내려받으면 브라우저가 막는 경우가 있어 간격을 둔다
    return files.reduce(function (p, f) {
      return p.then(function () { download(f); return new Promise(function (r) { setTimeout(r, 450); }); });
    }, Promise.resolve());
  }

  function isKakao() { return /KAKAOTALK/i.test(navigator.userAgent || ""); }
  function openExternal() {
    location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href);
  }
  function isMobile() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || "")); }

  // 파일 이름에 쓸 수 없는 글자 정리
  function safeName(s) { return String(s || "").trim().replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40); }

  window.EgoExport = {
    images: images, pdf: pdf, canShare: canShare, share: share,
    download: download, downloadAll: downloadAll,
    isKakao: isKakao, openExternal: openExternal, isMobile: isMobile, safeName: safeName
  };
})();
