# 에고너츠 — 사랑과 이기심

예전 단독 앱(`EgoNuts-10-` / egonuts-selflove.vercel.app)을 이 스택의 **`/selflove/`** 아래로 편입한 회차.
**서버·DB·대시보드 없음.** 답은 참가자 기기(localStorage)에만 저장된다.

원래 쓰던 Supabase 제출·진행자 대시보드·`config.js`·`api/`는 이 폴더에 두지 않았다.
(옛 프로젝트의 DB 데이터는 건드리지 않았다. 보관·삭제는 정훈님이 결정.)

## 폴더
```
selflove/
  index.html
  assets/app.js · style.css
  assets/materials/   질문별 참고 이미지·텍스트
  assets/books/       추천 도서 표지
```

## 로컬
스택 루트에서 `python3 -m http.server 5178` → http://localhost:5178/selflove/
