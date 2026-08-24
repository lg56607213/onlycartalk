/* ================================================
   OnlyCartalk — 공통 스크립트
   ================================================ */

/* ---------- 모바일 메뉴 ---------- */
(function () {
  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".nav");
  if (!burger || !nav) return;
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") nav.classList.remove("open");
  });
})();

/* ---------- 현재 메뉴 표시 ---------- */
(function () {
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a[href]").forEach(function (a) {
    if (a.getAttribute("href") === here) a.classList.add("on");
  });
})();

/* ================================================
   네이버 프리미엄 로그분석 — 전환 보고
   ------------------------------------------------
   폼 전송이 "성공한 순간"에만 부른다.
   페이지 진입만으로 부르면 전환수가 부풀려져 판단이 망가진다.

   type  1 = 회원가입  2 = 신청/상담  3 = 장바구니  4 = 구매  5 = 기타
   리스·렌트는 구매가 아니라 문의가 전환이므로 2 를 쓴다.
   value 는 거래액이 없으므로 0.

   wcs.trans 는 장바구니·구매 전환용이라 이 호출을 전환으로 세지 않는다.
   반드시 wcs.cnv 로 값을 만들어 wcs_do 에 넘겨야 한다.
   ================================================ */
function octConversion(value) {
  try {
    if (!window.wcs) return;                          // 스크립트 차단·오프라인 대비
    if (!window.wcs_add || !wcs_add["wa"]) return;    // 인증키 미설정이면 조용히 넘어간다
    if (!window._nasa) window._nasa = {};
    _nasa["cnv"] = wcs.cnv("2", String(value == null ? 0 : value));
    wcs_do(_nasa);
  } catch (e) {}
}
