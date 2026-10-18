# 에고너츠 스택

에고너츠 철학 모임 발제문 웹앱. 참가자가 질문에 답을 쓰면, 그 답이 **카드 덱(4:5)** 으로 만들어져
PDF·이미지로 저장하거나 카카오톡 '나와의 채팅' 등으로 보낼 수 있다.
답은 참가자 기기에만 저장되고 서버로 보내지 않는다 (DB·Supabase 없음).

- 회차 목록: `/`
- 회차 발제문: `/<slug>` (예: `/solitude`) 또는 `/round.html?r=<slug>`

## 폴더 구조
```
index.html            회차 목록
round.html            발제문 앱 (회차 공통)
vercel.json           /<slug> → round.html
assets/style.css      공통 디자인 (세리프 · 가는 선 · 은은한 애니메이션)
assets/theme.js       두 색(main · point)으로 전체 배색 계산
assets/app.js         흐름: 표지 겸 목차 → (질문 → 참고 자료)… → 이름 → 카드 덱
assets/cards.js       카드 렌더러 (캔버스, 1080×1350)
assets/export.js      PDF · 이미지 저장 · 공유 · 카카오톡 인앱 브라우저 처리
rounds/index.json     회차 목록
rounds/<slug>/        회차 하나 = 폴더 하나
  round.json          회차 설정
  materials/qN.txt    참고 자료(인용문) 텍스트
  materials/qN.jpg    참고 자료 이미지 (선택)
```

## 새 회차 추가
1. `rounds/<slug>/round.json` 작성 (아래 예시), 자료 파일 넣기
2. `rounds/index.json` 에 `{ "slug", "title", "date" }` 추가
3. push → Vercel 자동 배포

```jsonc
{
  "title": "고독과 상실",
  "date": "2026.11",
  "colors": { "main": "#2f4b60", "point": "#3b4046" }, // 이 두 색만 회차마다 바꾼다
  "source": "무라카미 하루키 「토니 타키타니」",        // 표지 카드 하단 '참고 ·' (선택)
  "intro": { "coreLabel": "핵심 질문", "coreQ": "…", "sub": "…" }, // 표지 화면 (선택)
  "questions": [
    {
      "text": "질문 전문",
      "short": "목차·표지 카드용 줄인 문구",            // 없으면 text
      "hint": "질문 아래 안내 (선택)",
      "fields": [{ "label": "① …" }, { "label": "② …" }], // 답 칸이 여럿일 때만 (선택)
      "material": { "img": "materials/q1.jpg", "txt": "materials/q1.txt" }, // 없으면 자료 페이지 생략
      "finale": true                                     // 답을 가운데 크게 놓는 마무리 카드 (선택)
    }
  ],
  "closing": { "text": "마무리 인사 (선택)", "books": { "label": "추천 도서", "items": [{ "cover": "books/a.jpg", "title": "…" }] } }
}
```

참고 자료 텍스트(`qN.txt`) 규칙: 첫 줄 = 제목, `"`로 시작 = 인용, `—`로 시작 = 출처, 나머지 = 문단, `**굵게**`.

## 카드 규칙
- 표지 겸 목차 1장 + 질문마다 1장 (질문 6개 → 7장)
- 답이 길면 글자를 줄이고, 그래도 넘치면 그 질문만 '이어서' 페이지로 나눈다
- 포인트 색이 배경과 대비가 약하면, 버튼·번호 같은 꼭 보여야 하는 요소는 글자색으로 대신한다

## 로컬에서 보기
```
python -m http.server 5178
```
→ http://localhost:5178/round.html?r=solitude
