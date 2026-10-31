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

## 자료 텍스트 규칙
첫 줄 = 제목, `"`로 시작 = 인용, `—`로 시작 = 출처, `§`로 시작 = 파트(책의 몇 번째 법칙), `**굵게**`.
인용문은 원서(*12 Rules for Life*, 2018)의 문장을 우리말로 옮겼다. 원문을 확인한 문장만 인용 부호로 싣고, 나머지는 풀어 썼다.

## 저장
- 답: `localStorage["egonuts-stack-on-suffering"]`
- 관리자 스위치: `/on-suffering/?admin=1` (켜기) · `?admin=0` (끄기) — 다른 회차와 따로 켜고 끈다
