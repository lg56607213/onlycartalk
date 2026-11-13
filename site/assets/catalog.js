/* ================================================
   온니카톡 차량 카탈로그
   ------------------------------------------------
   car-data.js 의 CAR_DATA 를 두 가지 모양으로 바꿔 준다.

     CAR_TREE        제조사 > 구분 > 차종 > 세부사양 > 트림 = { price, opts }
                     (견적 폼이 순서대로 고를 때 쓴다)
     buildCatalog()  홈 화면 차량 카드 목록 (차종 하나에 카드 한 장)

   차량 데이터 자체는 엑셀에서 자동 생성되므로 여기서 건드리지 않고,
   "어느 탭에 넣을지 / 어떤 배지를 붙일지 / 어떤 사진을 쓸지"만 정한다.
   ================================================ */

/* ── 탭 ───────────────────────────────────────── */
const CAT_TABS = [
  { key: "all",   label: "전체" },
  { key: "sedan", label: "승용" },
  { key: "suv",   label: "SUV·RV" },
  { key: "ev",    label: "전기·수소" },
  { key: "biz",   label: "승합·화물" },
];

/* ── 사진 ──────────────────────────────────────
   사진이 준비된 차만 여기에 적는다. 적지 않은 차는 실루엣 그림이 나온다.
   이름은 카드에 보이는 차량명 그대로.

     "그랜저": "assets/cars/grandeur.png",                        */
const CAR_PHOTOS = {
};

/* 엑셀 원본의 오타 — 화면에 보이기 전에 바로잡는다 */
const fixName = (s) => String(s || "").replace(/Hybird|Hybid/g, "Hybrid").trim();

/* 이 이름들은 "분류"이고 그 아래가 실제 차종명이다.
   여기 없는 구분(예: 포터II)은 구분명 자체가 차 이름이다. 차종명에 그 이름이 없으면 앞에 붙인다. */
const GROUP_KEYS = new Set(["수소/전기차", "승용", "SUV", "RV", "MPV", "EV", "전기차", "PBV"]);
const EV_GROUPS  = new Set(["수소/전기차", "EV", "전기차", "PBV"]);

/* 카드 순서 — 많이 찾는 차를 앞에 둔다. 여기 없는 차는 뒤로, 싼 순. */
const MODEL_ORDER = [
  "그랜저", "쏘나타", "아반떼", "K5", "K8", "싼타페", "투싼", "팰리세이드(가솔린)", "팰리세이드 Hybrid",
  "쏘렌토", "스포티지", "카니발", "셀토스", "코나", "캐스퍼", "레이", "모닝", "K9", "아이오닉5", "EV3", "EV6",
];

/* ── CAR_DATA → CAR_TREE ───────────────────── */
const CAR_TREE = (function () {
  const tree = {};
  for (const t of CAR_DATA.trims) {
    const k = fixName(t.k), c = fixName(t.c), m = fixName(t.m);
    const v = fixName(t.v) || m;          // 세부사양이 비어 있으면 차종명을 그대로 쓴다
    const trims = (((tree[k] ||= {})[c] ||= {})[m] ||= {})[v] ||= {};
    trims[fixName(t.t)] = {
      price: t.p,
      opts: (t.o || []).map(([n, p]) => ({ n, p })),
    };
  }
  return tree;
})();

/* 색상표 — 차종명으로 찾는다. { ext: [{n,p}], int: [{n,p}] } */
const CAR_COLOR_MAP = (function () {
  const out = {};
  if (typeof CAR_COLORS === "undefined") return out;
  const conv = (list) => (list || []).map(([n, p]) => ({ n, p: p || 0 }));
  for (const m of Object.keys(CAR_COLORS)) {
    out[fixName(m)] = { ext: conv(CAR_COLORS[m].ext), int: conv(CAR_COLORS[m].int) };
  }
  return out;
})();

/* ── 카드 만들기 ───────────────────────────── */
function fuelsOf(name, variants, ev) {
  const hay = (name + " " + variants.join(" ")).toLowerCase();
  const f = [];
  if (/넥쏘/.test(hay)) f.push("수소");
  else if (ev) f.push("전기");
  if (/hybrid|하이브리드/.test(hay)) f.push("하이브리드");
  if (/가솔린/.test(hay)) f.push("가솔린");
  if (/lpg/.test(hay)) f.push("LPG");
  return f;
}

function buildCatalog() {
  const out = [];
  for (const brand of Object.keys(CAR_TREE)) {
    for (const cat of Object.keys(CAR_TREE[brand])) {
      for (const model of Object.keys(CAR_TREE[brand][cat])) {
        const variants = Object.keys(CAR_TREE[brand][cat][model]);
        const prices = [];
        variants.forEach((v) => Object.values(CAR_TREE[brand][cat][model][v])
          .forEach((t) => { if (t.price > 0) prices.push(t.price); }));
        if (!prices.length) continue;

        let name = GROUP_KEYS.has(cat) || model.startsWith(cat) ? model : cat + " " + model;
        const ev = EV_GROUPS.has(cat) || /Electric|\bEV/.test(name);
        // 레이처럼 내연기관과 이름이 같은 전기차는 구분되게 EV 를 붙인다
        if (ev && !/Electric|EV|아이오닉|넥쏘|ST1|PV5/.test(name)) name += " EV";

        const biz = /스타리아|포터|봉고|ST1|PV5/.test(name);
        const fuels = fuelsOf(name, variants, ev);

        out.push({
          brand, cat, model, name,
          tab: biz ? "biz" : ev ? "ev" : cat === "SUV" || cat === "RV" ? "suv" : "sedan",
          price: Math.min(...prices),
          trimCount: prices.length,
          badge: ev ? { text: fuels[0] === "수소" ? "수소차" : "전기차", tone: "ev" }
               : fuels.includes("하이브리드") ? { text: "하이브리드", tone: "hev" } : null,
          tags: [fuels.join(" · "), "트림 " + prices.length + "개"].filter(Boolean),
          img: CAR_PHOTOS[name] || null,
        });
      }
    }
  }
  const rank = (m) => { const i = MODEL_ORDER.indexOf(m); return i < 0 ? MODEL_ORDER.length : i; };
  return out.sort((a, b) => rank(a.model) - rank(b.model) || a.price - b.price);
}

/* 58,740,000 → "5,874만" */
function manwon(won) {
  return Math.round(won / 10000).toLocaleString("ko-KR") + "만";
}

/* 카드에서 견적 폼으로 넘길 주소 */
function quoteUrl(v) {
  const p = new URLSearchParams({ brand: v.brand, cat: v.cat, model: v.model });
  // 홈에서 들어온 유입경로(?src=, utm_*)를 그대로 이어붙인다
  const cur = new URLSearchParams(location.search);
  for (const k of ["type", "src", "ref", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    if (cur.has(k)) p.set(k, cur.get(k));
  }
  return "quote.html?" + p.toString();
}
