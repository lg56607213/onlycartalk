/* ================================================
   저신용자 전용 장기렌트 — 가능 차종 예시
   ------------------------------------------------
   lowcredit.html 의 「가능 차종 예시」 카드가 이 파일 하나로 그려진다.
   차종 · 보증금 · 월 납입금을 바꾸려면 여기만 고치면 된다.

   ▶ 실제 값을 넣은 뒤에는 placeholder 를 false 로 바꾼다.
     true 인 동안에는 화면에 「임시 표시」 안내가 붙는다.

   항목 설명
     brand    제조사 (현대 / 기아)
     name     차종명
     note     한 줄 설명 (연식 · 연료 등, 비워도 된다)
     deposit  보증금 예시      예) "100만 원"
     monthly  월 납입금 예시   예) "45만 원"
     img      차량 사진 경로 (없으면 "" — 실루엣이 나온다)
   ================================================ */
var OCT_LOWCREDIT = {

  placeholder: true,          // ← 실제 차종 · 금액을 넣으면 false 로

  /* 카드 아래에 붙는 기준 문구 (계약기간 · 주행거리 등) */
  basis: "계약 기간 · 주행거리 기준은 확정 후 표기합니다.",

  cars: [
    { brand: "기아", name: "모닝",   note: "", deposit: "○○만 원", monthly: "○○만 원", img: "" },
    { brand: "기아", name: "레이",   note: "", deposit: "○○만 원", monthly: "○○만 원", img: "assets/cars/ray.png" },
    { brand: "현대", name: "캐스퍼", note: "", deposit: "○○만 원", monthly: "○○만 원", img: "" },
    { brand: "현대", name: "아반떼", note: "", deposit: "○○만 원", monthly: "○○만 원", img: "" },
    { brand: "기아", name: "K3",     note: "", deposit: "○○만 원", monthly: "○○만 원", img: "" },
    { brand: "기아", name: "셀토스", note: "", deposit: "○○만 원", monthly: "○○만 원", img: "assets/cars/seltos.png" }
  ]
};
