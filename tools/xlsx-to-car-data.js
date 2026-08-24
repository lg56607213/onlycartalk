/**
 * 현대자동차 차량 내역 엑셀 -> JSON
 *
 * 엑셀은 병합 셀 구조라 빈 칸은 "위 값을 그대로 물려받는다"는 뜻이다.
 * 컬럼: 0 제조사 | 1 구분 | 2 차종 | 3 세부 | 4 트림 | 5 트림가격 | 6 옵션명 | 7 옵션가격
 */
const XLSX = require("xlsx");
const fs = require("fs");

const SRC = "C:/Users/home/Desktop/동천/only Cartalk/현대자동차 차량 내역(26.6.26).xlsx";
const wb = XLSX.readFile(SRC);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });

const num = (v) => {
  if (typeof v === "number") return v;
  const n = String(v).replace(/[^0-9]/g, "");
  return n ? Number(n) : null;
};
const txt = (v) => String(v == null ? "" : v).trim();

const carry = { maker: "", category: "", model: "", variant: "", trim: "", price: null };
const trims = [];
let current = null;
const skipped = [];

rows.slice(1).forEach((r, i) => {
  const rowNo = i + 2; // 엑셀 기준 행 번호(헤더 1행 포함)

  // 병합 셀 상속
  if (txt(r[0])) carry.maker = txt(r[0]);
  if (txt(r[1])) carry.category = txt(r[1]);
  if (txt(r[2])) { carry.model = txt(r[2]); carry.variant = ""; }
  if (txt(r[3])) carry.variant = txt(r[3]);

  const trimName = txt(r[4]);
  const trimPrice = num(r[5]);
  const optName = txt(r[6]);
  const optPrice = num(r[7]);

  // 트림이 새로 나오면 새 항목을 연다
  if (trimName) {
    if (trimPrice == null) { skipped.push({ rowNo, why: "트림 가격 없음", trimName }); }
    current = {
      maker: carry.maker,
      category: carry.category,
      model: carry.model,
      variant: carry.variant || null,
      trim: trimName,
      price: trimPrice,
      options: [],
    };
    trims.push(current);
  }

  // 옵션 행
  if (optName) {
    if (!current) { skipped.push({ rowNo, why: "트림보다 옵션이 먼저 나옴", optName }); return; }
    if (optPrice == null) { skipped.push({ rowNo, why: "옵션 가격 없음", optName }); return; }
    current.options.push({ name: optName, price: optPrice });
  }
});

// 가격 없는 트림은 견적을 낼 수 없으므로 제외하되 기록은 남긴다
const usable = trims.filter((t) => t.price != null);
const dropped = trims.filter((t) => t.price == null);

const models = [...new Set(usable.map((t) => t.model))];
const categories = [...new Set(usable.map((t) => t.category))];

const out = {
  source: "현대자동차 차량 내역(26.6.26).xlsx",
  generatedAt: null, // 배포 시 채운다
  maker: "현대",
  counts: { models: models.length, trims: usable.length,
    options: usable.reduce((a, t) => a + t.options.length, 0) },
  categories,
  trims: usable,
};

fs.writeFileSync("C:/Users/home/AppData/Local/Temp/claude/C--Users-home/3b3bbdc8-82f4-44a9-b2f3-8be572dae47b/scratchpad/car-data.json",
  JSON.stringify(out, null, 2), "utf8");

console.log("=== 변환 결과 ===");
console.log("  구분    : " + categories.join(" · "));
console.log("  차종    : " + models.length + "종");
console.log("  트림    : " + usable.length + "개" + (dropped.length ? "  (가격 없어 제외 " + dropped.length + "개)" : ""));
console.log("  옵션    : " + out.counts.options + "개");
console.log();
console.log("=== 구분별 차종 ===");
categories.forEach((c) => {
  const ms = [...new Set(usable.filter((t) => t.category === c).map((t) => t.model))];
  console.log("  " + c.padEnd(12) + ms.join(", "));
});
console.log();
console.log("=== 샘플 (앞 3개 트림) ===");
usable.slice(0, 3).forEach((t) => {
  console.log("  " + [t.model, t.variant, t.trim].filter(Boolean).join(" / ") +
    "  " + t.price.toLocaleString() + "원  옵션 " + t.options.length + "개");
  t.options.slice(0, 2).forEach((o) => console.log("     · " + o.name + " " + o.price.toLocaleString() + "원"));
});
if (skipped.length) {
  console.log();
  console.log("=== 건너뛴 행 " + skipped.length + "개 (앞 8개) ===");
  skipped.slice(0, 8).forEach((s) => console.log("  " + s.rowNo + "행: " + s.why + " — " + (s.trimName || s.optName)));
}
console.log();
console.log("  최고가: " + Math.max(...usable.map((t) => t.price)).toLocaleString() + "원");
console.log("  최저가: " + Math.min(...usable.map((t) => t.price)).toLocaleString() + "원");
