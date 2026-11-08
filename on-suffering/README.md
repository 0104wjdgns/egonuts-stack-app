# 에고너츠 — 고통과 의미

「죽음에 관하여」 앱(`/on-death/`)을 통째로 복사해 만든 **독립 회차**. 주소는 `/on-suffering/`.
코드·배색·저장 키가 모두 이 폴더 안에만 있어서, 여기를 고쳐도 다른 회차는 그대로다.

참고 도서: 조던 B. 피터슨 『12가지 인생의 법칙: 혼돈의 해독제』 (강주헌 옮김, 메이븐)

## 폴더 구조
```
on-suffering/
  index.html            이 회차 앱 (경로는 모두 /on-suffering/…)
  assets/               on-death assets 복사본 — 이 회차 전용 (흰 바탕에 맞게 조정)
  round.json            질문 · 배색 · 참고 출처
  materials/qN.txt      질문 N 뒤 참고 자료 (Q1~Q5)
  materials/qN.jpg      자료 상단 이미지 자리 (Q1~Q5)
  materials/book.jpg    Q6 뒤 출처 페이지의 책 표지
```
이미지는 파일이 없으면 자리째 숨겨지고, 같은 이름으로 넣으면 바로 나타난다.

## 이미지 출처
자료 사진은 모두 Unsplash 무료 라이선스 (가로 1200px · 세로 높이 1100px로 줄임). 자료 페이지에는 `round.json`의 `imageCredit`("이미지 출처 · Unsplash")으로 표시한다.
- Q1 돌탑 — Nicole Elliott · https://unsplash.com/photos/N9De44VszLM
- Q2 금으로 이은 흉상(킨츠기) — Simon Lee · https://unsplash.com/photos/IEgvy4o3byM
- Q3 창가의 강아지 — Matthew Hamilton · https://unsplash.com/photos/s1YHaZhC--Y
- Q4 새싹 — Ksenia Pixelesse · https://unsplash.com/photos/TBjNbj1sdAE
- Q5 골목길 고양이 — Guillermo Latorre · https://unsplash.com/photos/4c2R6eZqXIw
- 책 표지 — 교보문고 상품 이미지 (메이븐 2018년판, ISBN 9791196067694)

## 배색 — 흰 바탕 · 금빛
- main `#ffffff` 흰 바탕 (아래로 갈수록 금빛 미색 `#faf7f2`)
- point `#b8924a` 금빛 — 구분선 · 인용 테두리 · 진행바 · 카드 테두리
- strong `#8c6a22` 짙은 금빛 — 번호 · 라벨 · 버튼 (흰 바탕 대비 5:1)
- ink `#2b2620` 따뜻한 먹색 — 본문

「죽음에 관하여」 복사본에서 달라진 점
- `theme.js`: `colors.strong`을 직접 받는다. 밝은 바탕이면 아래쪽 그라데이션을 point 쪽으로 살짝 물들이고, 흐린 글자를 조금 진하게 한다.
- `style.css`: 기본 배색을 흰 바탕 · 금빛으로 (round.json을 읽기 전 첫 화면도 흰색), 카드 그림자 · 오류 글자색을 밝은 바탕에 맞춤, 글자 선택 · 입력 커서를 금빛으로.
- `cards.js`: 흰 바탕일 때 카드 테두리를 금빛 가는 선으로.
- `assets/logo.png`: 같은 로고를 짙은 금색(`#a8832f`)으로 다시 칠함.

## 화면 경험 (리더스클럽 「용서」 방식을 옮김, 2026.11)
- 흐름: 시네마틱 표지 → 목차 → (질문 → 참고 자료)×6 → 카드에 넣을 이름 → 카드 덱
- 표지: 마스트 → 제목(마지막 낱말 금빛) → 밑줄 → `intro.coreQuestionLines`가 한 줄씩. 스크롤·탭·키로 시작
- 질문: `01_ 소주제` 번호가 가운데서 크게 떴다 제자리로(FLIP), 질문은 단어 단위로. 입력칸은 움직이지 않는다
- 자료: 기존 이미지·텍스트·책 소개를 한 장의 종이로 감싸 처음 볼 때만 펼친다. 아래에 `materialNote` 대기 안내
- 바탕: 진행할수록 딥 브라운 → 금빛 → 크림 (`app.js` `SKY`). 어두운 구간 `body.dark`, 금빛 구간 `body.mid`
- 완료: 카드 덱 · 저장/공유 → 맨 아래 마무리 인사. 크림 → 금빛 그라데이션
- 한 번 본 화면 · `prefers-reduced-motion`은 애니메이션 없이 바로
- 카드 덱 색은 여전히 `round.json` `colors`(흰 바탕 · 금빛)로 그린다 — 진행 바탕과 분리
- 휴대폰: 뒤로가기 = 이전 단계(방문 기록), 새로고침하면 보던 단계에서 이어서. 뒤로/다음은 화면 아래 고정(입력 중엔 제자리), 버튼 48px, 입력칸 아래 "자동 저장됨 · 시:분 · N자", 표지 안내는 터치 기기면 "밀어 올리거나 눌러서 시작"

## 자료 텍스트 규칙
첫 줄 = 제목, `"`로 시작 = 인용, `—`로 시작 = 그 문단 아래 작은 출처, `§`로 시작 = 파트. 첫 문단 바로 다음이 출처면 제목 없이 발췌로 읽는다.
읽기자료는 독서 정리에 적힌 표현을 발췌한 것이다. 원문과 대조한 직접인용이 아니다.

## 저장
- 답: `localStorage["egonuts-stack-on-suffering"]`
- 관리자 스위치: `/on-suffering/?admin=1` (켜기) · `?admin=0` (끄기) — 다른 회차와 따로 켜고 끈다
