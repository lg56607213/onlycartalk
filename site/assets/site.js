/* ================================================
   온니카톡(OnlyCartalk) 공통 스크립트
   - 카카오톡 채널 연결
   - 모바일 메뉴 토글 · 현재 메뉴 표시
   - 토스트
   - 유입경로 추적
   - 네이버 전환 보고
   ================================================ */

/* ================================================
   카카오톡 채널
   ------------------------------------------------
   채널을 만든 뒤 아래 한 줄에 주소만 넣으면
   사이트의 모든 「카톡 채널」 버튼이 한꺼번에 켜진다.
   비워 두면 그 버튼들은 화면에 나오지 않는다.

     예) var OCT_KAKAO_CHANNEL = "https://pf.kakao.com/_abcdE";
   ================================================ */
var OCT_KAKAO_CHANNEL = "";

(function () {
  var url = (OCT_KAKAO_CHANNEL || '').replace(/\/+$/, '');
  document.querySelectorAll('[data-kakao]').forEach(function (a) {
    if (!url) { a.hidden = true; return; }
    // data-kakao="chat" 이면 채팅창, 그 외에는 채널 홈(친구 추가)
    a.href = a.getAttribute('data-kakao') === 'chat' ? url + '/chat' : url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.hidden = false;
  });
})();

(function () {
  /* 모바일 햄버거 메뉴 */
  var burger = document.querySelector('.burger');
  var gnb = document.querySelector('.gnb');
  if (burger && gnb) {
    burger.addEventListener('click', function () {
      var open = gnb.classList.toggle('show');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // 메뉴 항목을 누르면 닫기
    gnb.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        gnb.classList.remove('show');
        burger.classList.remove('open');
      }
    });
  }

  /* 현재 페이지 메뉴 활성화 */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.gnb a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('/').pop();
    // 배포 환경에서는 /lowcredit 처럼 .html 없이 열린다
    if (href && (href === here || href === here + '.html')) a.classList.add('on');
  });
})();

/* 토스트 */
var __toastTimer = null;
function showToast(msg, ok) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('ok', !!ok);
  t.classList.add('show');
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
}

/* ================================================
   유입경로 추적
   ------------------------------------------------
   광고 링크 예시:
     https://onlycartalk.com/quote?src=insta
     https://onlycartalk.com/quote?src=naver&utm_campaign=11월
   주소에 붙은 값을 저장해 두었다가 견적 신청 메일에 함께 보낸다.
   ================================================ */
var OCT_TRACK_KEYS = ['src', 'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
var OCT_STORE = 'oct_src';

/* 한국시간 YYYY-MM-DD HH:mm */
function octNowKST() {
  try {
    var p = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date()).reduce(function (a, x) { a[x.type] = x.value; return a; }, {});
    var h = p.hour === '24' ? '00' : p.hour;
    return p.year + '-' + p.month + '-' + p.day + ' ' + h + ':' + p.minute;
  } catch (e) {
    return new Date().toISOString().slice(0, 16).replace('T', ' ');
  }
}

function octCapture() {
  var q = new URLSearchParams(location.search);
  var got = {}, has = false;
  OCT_TRACK_KEYS.forEach(function (k) {
    var v = q.get(k);
    if (v) { got[k] = String(v).slice(0, 60); has = true; }
  });
  // 네이버 검색광고 클릭은 utm 없이 NaPm 만 붙어서 들어온다 (자동 추적 값)
  if (q.get('NaPm')) {
    got.napm = 1;
    if (!got.src && !got.utm_source) got.src = 'naver_ad';
    has = true;
  }

  if (has) {
    got._at = octNowKST();
    got._page = location.pathname;
    if (document.referrer) got._ref = document.referrer.slice(0, 160);
    try { localStorage.setItem(OCT_STORE, JSON.stringify(got)); } catch (e) {}
    return got;
  }

  // 주소에 값이 없으면 이전에 저장해 둔 값 사용 (홈 → 견적 이동 대비)
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem(OCT_STORE) || 'null'); } catch (e) {}
  if (stored) return stored;

  // 광고 표시는 없지만 외부 사이트(검색 등)에서 처음 들어온 경우 — 처음 한 번만 기록
  var ext = octExternalHost(document.referrer);
  if (!ext) return null;
  got = { _ext: ext, _at: octNowKST(), _page: location.pathname, _ref: document.referrer.slice(0, 160) };
  try { localStorage.setItem(OCT_STORE, JSON.stringify(got)); } catch (e) {}
  return got;
}

/* 이전 페이지가 다른 사이트였으면 그 도메인, 아니면 '' */
function octExternalHost(ref) {
  if (!ref) return '';
  try {
    var h = new URL(ref).hostname.replace(/^www\./, '');
    return h && h !== location.hostname.replace(/^www\./, '') ? h : '';
  } catch (e) {
    return '';
  }
}

/* 메일에 넣을 한 줄짜리 표기 */
function octSourceLabel() {
  var s = null;
  try { s = octCapture(); } catch (e) {}

  if (s) {
    var main = s.src || s.utm_source || s.ref || '';
    if (main === 'naver_ad') main = '네이버 검색광고';
    if (!main && s._ext) main = '외부 유입: ' + s._ext;
    var extra = [];
    if (s.utm_medium)   extra.push('매체 ' + s.utm_medium);
    if (s.utm_campaign) extra.push('캠페인 ' + s.utm_campaign);
    if (s.utm_content)  extra.push('소재 ' + s.utm_content);
    if (s.utm_term)     extra.push('검색어 ' + s.utm_term);
    if (main) {
      return main + (extra.length ? ' (' + extra.join(', ') + ')' : '') +
             (s._at ? ' · 최초유입 ' + s._at : '');
    }
  }
  // 광고 표시가 없으면 어디서 넘어왔는지라도 남김.
  // 우리 사이트 안에서 페이지를 옮긴 것은 외부 유입이 아니다.
  var ext = octExternalHost(document.referrer);
  return ext ? '외부 유입: ' + ext : '직접 방문';
}

/* 견적 링크에 현재 유입 파라미터를 그대로 넘겨줌 */
(function octPassThrough() {
  var q = new URLSearchParams(location.search);
  var keep = new URLSearchParams();
  OCT_TRACK_KEYS.forEach(function (k) { if (q.get(k)) keep.set(k, q.get(k)); });
  var qs = keep.toString();
  if (!qs) return;
  document.querySelectorAll('a[href$="quote.html"], a[href$="lowcredit.html"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href.indexOf('?') === -1) a.setAttribute('href', href + '?' + qs);
  });
})();

/* 페이지 열릴 때 한 번 저장 */
try { octCapture(); } catch (e) {}

/* 휴대폰 번호 자동 하이픈 */
function fmtPhone(el) {
  var v = el.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) v = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7);
  else if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
  el.value = v;
}

/* ================================================
   네이버 프리미엄 로그분석 — 전환 보고
   ------------------------------------------------
   폼 전송이 "성공한 순간"에만 부른다.
   페이지 진입만으로 부르면 전환수가 부풀려져 판단이 망가진다.

   네이버 공식 가이드의 현재 방식(wcs.trans, 전환 유형 코드)을 쓴다.
   https://naver.github.io/conversion-tracking/pages/01_script_guide_wcstrans/
     - 신차 견적 접수  = 'lead'(신청완료)
     - 저신용자 폼     = 'custom001'
     - 레이 즉시출고 폼 = 'custom002'
   셋 다 광고 리포트에 전환으로 나온다. 구 방식 wcs.cnv("2"/"5") 는 '회원가입'/'기타'로
   분류되던 잘못된 코드라 제거했다. (trans 와 cnv 를 섞으면 같은 유형 cnv 가 영구 필터링된다)

   ★ 네이버 공통키: 광고시스템 > 도구 > 전환 추적 관리 에서 승인 후 발급되는 "s_" 로 시작하는 값을
     아래 OCT_NAVER_WA 한 곳에만 넣으면 모든 페이지의 방문·전환 추적이 켜진다.
     (각 페이지 하단 공통 스크립트가 이 값을 읽는다. site.js 가 그보다 먼저 로드된다)
   ================================================ */
var OCT_NAVER_WA = "s_5032e7c34086";

function octNaverConv(type) {
  try {
    if (!window.wcs || !wcs.trans) return;            // 스크립트 차단·오프라인 대비
    if (!OCT_NAVER_WA) return;                        // 공통키 미설정이면 조용히 넘어간다
    if (!window.wcs_add) window.wcs_add = {};
    wcs_add["wa"] = OCT_NAVER_WA;
    var conv = {};
    conv.type = type;
    wcs.trans(conv);
  } catch (e) {}
}

/* 신차 견적 접수 완료. 인자는 예전 호출부 호환용 (type 을 주면 그 유형으로 보고) */
function octConversion(value, type) {
  octNaverConv(type || 'lead');
}

/* ================================================
   저신용자 전용 폼 제출 완료 — 신차 견적과 따로 집계한다
   ------------------------------------------------
   구분 방법 세 가지를 함께 남긴다.
     1) 네이버 전환 유형을 신차 견적('lead')과 다른 값으로 보고한다 (아래 OCT_LOWCREDIT_CNV_TYPE)
     2) dataLayer / gtag 에 lowcredit_submit 이벤트를 넣는다 (GA · GTM 을 붙이면 바로 쓸 수 있다)
     3) 완료 화면 주소가 /lowcredit#done 으로 바뀐다 (화면 id: lowcredit-done)
   ================================================ */
var OCT_LOWCREDIT_CNV_TYPE = "custom001";   // 네이버 전환 유형 (사용자 정의 1번)

function octLowCreditConversion() {
  octConversion(0, OCT_LOWCREDIT_CNV_TYPE);
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'lowcredit_submit', form: 'lowcredit' });
    if (typeof window.gtag === 'function') window.gtag('event', 'lowcredit_submit');
  } catch (e) {}
}

/* ================================================
   레이 즉시출고 폼 제출 완료 — 신차 견적 · 저신용과 따로 집계한다
   (완료 화면 주소 /ray#done · 화면 id: ray-done)
   ================================================ */
var OCT_RAY_CNV_TYPE = "custom002";   // 네이버 전환 유형 (사용자 정의 2번)

function octRayConversion() {
  octConversion(0, OCT_RAY_CNV_TYPE);
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'ray_submit', form: 'ray' });
    if (typeof window.gtag === 'function') window.gtag('event', 'ray_submit');
  } catch (e) {}
}
