/**
 * 현대 · 기아 차량 내역 엑셀 -> site/car-data.js
 *
 * 사용법: node tools/xlsx-to-car-data.js "<엑셀 경로>"
 *
 * 엑셀은 병합 셀 구조라 빈 칸은 "위 값을 그대로 물려받는다"는 뜻이다.
 * 컬럼: 0 제조사 | 1 구분 | 2 차종 | 3 세부 | 4 트림 | 5 트림가격 | 6 옵션명 | 7 옵션가격
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const SRC = process.argv[2];
if (!SRC) {
  console.error('사용법: node tools/xlsx-to-car-data.js "<엑셀 경로>"');
  process.exit(1);
}
const OUT = path.join(__dirname, "..", "site", "car-data.js");

const wb = XLSX.readFile(SRC);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });

const num = (v) => {
  if (typeof v === "number") return v;
  const n = String(v).replace(/[^0-9]/g, "");
  return n ? Number(n) : null;
};
const txt = (v) => String(v == null ? "" : v).trim();

const carry = { maker: "", category: "", model: "", variant: "" };
const trims = [];
let current = null;
const skipped = [];

rows.slice(1).forEach((r, i) => {
  const rowNo = i + 2; // 엑셀 기준 행 번호(헤더 1행 포함)

  // 병합 셀 상속. 상위 칸이 바뀌면 하위 칸은 초기화한다
  if (txt(r[0])) { carry.maker = txt(r[0]); carry.category = ""; carry.model = ""; carry.variant = ""; }
  if (txt(r[1])) { carry.category = txt(r[1]); carry.model = ""; carry.variant = ""; }
  if (txt(r[2])) { carry.model = txt(r[2]); carry.variant = ""; }
  if (txt(r[3])) carry.variant = txt(r[3]);

  const trimName = txt(r[4]);
  const trimPrice = num(r[5]);
  const optName = txt(r[6]);
  const optPrice = num(r[7]);

  // 트림이 새로 나오면 새 항목을 연다
  if (trimName) {
    if (trimPrice == null) skipped.push({ rowNo, why: "트림 가격 없음", name: trimName });
    current = {
      k: carry.maker,
      c: carry.category,
      m: carry.model,
      v: carry.variant || null,
      t: trimName,
      p: trimPrice,
      o: [],
    };
    trims.push(current);
  }

  // 옵션 행
  if (optName) {
    if (!current) { skipped.push({ rowNo, why: "트림보다 옵션이 먼저 나옴", name: optName }); return; }
    if (optPrice == null) { skipped.push({ rowNo, why: "옵션 가격 없음", name: optName }); return; }
    current.o.push([optName, optPrice]);
  }
});

// 가격 없는 트림은 견적을 낼 수 없으므로 제외하되 기록은 남긴다
const usable = trims.filter((t) => t.p != null);
const dropped = trims.length - usable.length;

const uniq = (a) => [...new Set(a)];
const makers = uniq(usable.map((t) => t.k));
const categories = uniq(usable.map((t) => t.c));
const sourceName = path.basename(SRC);

const data = { source: sourceName, makers, categories, trims: usable };
const header =
  "/* OnlyCartalk 차량 데이터 — 자동 생성. 직접 고치지 말 것.\n" +
  " * 원본: " + sourceName + "\n" +
  " * 변환: tools/xlsx-to-car-data.js\n" +
  " * 구조: trims[] = { k:제조사, c:구분, m:차종, v:세부, t:트림, p:차량가(원), o:[[옵션명,옵션가]] }\n" +
  " */\n";
fs.writeFileSync(OUT, header + "const CAR_DATA = " + JSON.stringify(data) + ";\n", "utf8");

console.log("=== 변환 결과 → " + path.relative(process.cwd(), OUT) + " ===");
makers.forEach((k) => {
  const ts = usable.filter((t) => t.k === k);
  console.log("  " + k + " : 차종 " + uniq(ts.map((t) => t.m)).length + " · 트림 " + ts.length +
    " · 옵션 " + ts.reduce((a, t) => a + t.o.length, 0));
  uniq(ts.map((t) => t.c)).forEach((c) => {
    console.log("     " + c.padEnd(8) + uniq(ts.filter((t) => t.c === c).map((t) => t.m)).join(", "));
  });
});
if (dropped) console.log("  가격 없어 제외한 트림: " + dropped + "개");
if (skipped.length) {
  console.log("=== 건너뛴 행 " + skipped.length + "개 ===");
  skipped.forEach((s) => console.log("  " + s.rowNo + "행: " + s.why + " — " + s.name));
}
