/* 에이스렌트 견적기 차량 데이터 → site/car-data.js 변환기
 *
 * 사용법 (onlycartalk 폴더에서):
 *   node tools/acerent-to-car-data.js
 *   node tools/acerent-to-car-data.js "../acerent/src/data/quote-data.json"
 *
 * 원본: acerent 저장소의 src/data/quote-data.json (에이스렌트 견적기가 쓰는 가격표)
 *   T: [제조사, 구분, 차종, 라인업, 트림, 기본가, 배기량, 세금구분, 정액세, 잔가그룹, 옵션[[이름,가격]]]
 *   C: [차종, 외장|내장, 색상명, 추가금]
 *
 * 결과: site/car-data.js 를 새로 쓴다. 견적기에 있는 차량을 빠짐없이 전부 가져온다.
 *   CAR_DATA.trims[] = { k:제조사, c:구분, m:차종, v:세부, t:트림, p:차량가(원), o:[[옵션명,옵션가]] }
 *   CAR_COLORS[차종] = { ext: 외장 [[색상명, 추가금]], int: 내장 [[색상명, 추가금]] }
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = process.argv[2] || path.join(ROOT, "..", "acerent", "src", "data", "quote-data.json");
const OUT = path.join(ROOT, "site", "car-data.js");

if (!fs.existsSync(SRC)) {
  console.error("원본을 찾지 못했습니다: " + SRC);
  console.error("acerent 저장소를 onlycartalk 옆 폴더에 받아 두거나, 파일 경로를 직접 적어 주세요.");
  process.exit(1);
}
const DATA = JSON.parse(fs.readFileSync(SRC, "utf8"));

const warn = [], seen = new Set(), makers = [], trims = [];
for (const [k, c, m, v, t, p, , , , , o] of DATA.T) {
  const key = [k, c, m, v, t].join(" > ");
  if (seen.has(key)) { warn.push("중복 트림(앞의 값 사용): " + key); continue; }
  seen.add(key);
  if (!p) { warn.push("차량가 없음(제외): " + key); continue; }
  if (!makers.includes(k)) makers.push(k);
  trims.push({ k, c, m, v, t, p, o: o || [] });
}

/* 색상: 차종명으로 찾고, 특장차는 색상표가 없으면 같은 차의 카고 색상을 쓴다 (캡은 같은 차) */
const colorsOf = (m) => {
  const rows = DATA.C.filter((c) => c[0] === m);
  if (rows.length || !/특장차$/.test(m)) return rows;
  return DATA.C.filter((c) => c[0] === m.replace(/특장차$/, "카고"));
};
const colors = {};
for (const m of new Set(trims.map((t) => t.m))) {
  const rows = colorsOf(m);
  if (!rows.length) { warn.push("색상표 없음(색상 칸 숨김): " + m); continue; }
  const pick = (side) => rows.filter((c) => c[1] === side).map((c) => [c[2], c[3] || 0]);
  colors[m] = { ext: pick("외장"), int: pick("내장") };
}

const head = `/* 온니카톡 차량 데이터 — 자동 생성. 직접 고치지 말 것.
 * 원본: 에이스렌트 견적기 가격표 (acerent/src/data/quote-data.json)
 * 변환: tools/acerent-to-car-data.js
 * 구조: CAR_DATA.trims[] = { k:제조사, c:구분, m:차종, v:세부, t:트림, p:차량가(원), o:[[옵션명,옵션가]] }
 *       CAR_COLORS[차종] = { ext: 외장 [[색상명, 추가금]], int: 내장 [[색상명, 추가금]] }
 */
`;
fs.writeFileSync(OUT, head
  + "const CAR_DATA = " + JSON.stringify({ source: "에이스렌트 견적기 가격표", makers, trims }) + ";\n\n"
  + "const CAR_COLORS = " + JSON.stringify(colors) + ";\n");

warn.forEach((w) => console.warn("[주의] " + w));
console.log(`완료: 트림 ${trims.length}개 · 차종 ${new Set(trims.map((t) => t.m)).size}개 → ${path.relative(ROOT, OUT)}`);
