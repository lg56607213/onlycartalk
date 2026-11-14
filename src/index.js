// 온니카톡 Worker
//   POST /api/quote  견적 신청을 받아 운영자 메일로 보낸다 (Cloudflare Email Routing)
//                    kind: "lowcredit" 이면 저신용자 전용 접수 — 제목이 [온니카톡 저신용 전용] 이 된다
//   그 외            site/ 의 정적 파일
//
// 메일은 Cloudflare Email Routing 의 '인증된 수신 주소'로만 보낼 수 있다 (무료).
// 받는 주소는 wrangler.jsonc 의 MAIL_TO, 보내는 주소는 MAIL_FROM.
import { EmailMessage } from 'cloudflare:email';

const MAX_BODY = 20000;      // 요청 본문 최대 크기(바이트)
const MAX_DETAIL = 6000;     // 메일에 싣는 신청 내용 최대 길이

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/quote') return handleQuote(request, env, url);
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function handleQuote(request, env, url) {
  if (request.method !== 'POST') return json({ ok: false, error: 'POST 만 받습니다.' }, 405);

  // 다른 사이트에서 이 주소로 메일을 쏘지 못하게 한다
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ ok: false, error: '허용되지 않은 출처입니다.' }, 403);

  const text = await request.text();
  if (text.length > MAX_BODY) return json({ ok: false, error: '내용이 너무 깁니다.' }, 413);

  let p;
  try { p = JSON.parse(text); } catch { return json({ ok: false, error: '형식이 올바르지 않습니다.' }, 400); }
  if (!p || typeof p !== 'object') return json({ ok: false, error: '형식이 올바르지 않습니다.' }, 400);

  // 허니팟: 화면에 안 보이는 칸이 채워져 있으면 봇이다. 성공한 것처럼 답하고 보내지 않는다.
  if (str(p.website)) return json({ ok: true });

  const phone = str(p.phone, 20);
  if (!/^01\d-\d{3,4}-\d{4}$/.test(phone)) return json({ ok: false, error: '휴대폰 번호를 확인해 주세요.' }, 400);
  const email = str(p.email, 80);
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return json({ ok: false, error: '이메일 주소를 확인해 주세요.' }, 400);
  const detail = str(p.quote_detail, MAX_DETAIL);
  if (!detail) return json({ ok: false, error: '신청 내용이 비어 있습니다.' }, 400);

  // 구분값 — 저신용자 전용 폼(lowcredit.html)은 kind: "lowcredit" 로 들어온다
  const lowCredit = str(p.kind, 20) === 'lowcredit';
  // 회신 방법 — 고객이 고른 값 (카카오톡 / 문자 / 이메일). 그 외 값은 카카오톡으로 본다.
  const reply = ['카카오톡', '문자', '이메일'].includes(str(p.noti_method, 10)) ? str(p.noti_method, 10) : '카카오톡';
  if (reply === '이메일' && !email) return json({ ok: false, error: '이메일 주소를 확인해 주세요.' }, 400);
  const name = oneLine(str(p.customer_name, 40)) || '-';
  const car = oneLine(str(p.car_full, 120)) || '-';

  try {
    if (!env.MAILER) throw new Error('메일 발송 설정(send_email)이 없습니다.');
    const raw = buildMime({
      from: env.MAIL_FROM,
      fromName: env.MAIL_FROM_NAME || '온니카톡',
      to: env.MAIL_TO,
      replyTo: email,
      subject: lowCredit
        ? `[온니카톡 저신용 전용] ${phone} / ${car.replace(/^\[저신용 전용\]\s*/, '')}`
        : `[온니카톡 견적] ${name} / ${car}`,
      html: mailHtml({ lowCredit, reply, name, car, phone, kakao: oneLine(str(p.kakao_id, 30)) || '-', email: email || '-', detail }),
    });
    await env.MAILER.send(new EmailMessage(env.MAIL_FROM, env.MAIL_TO, raw));
    return json({ ok: true });
  } catch (e) {
    console.error('견적 메일 발송 실패:', e && e.message ? e.message : e);
    return json({ ok: false, error: '메일 발송에 실패했습니다.' }, 502);
  }
}

function str(v, max = 200) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
/* 메일 헤더에 들어가는 값은 줄바꿈을 없앤다 (헤더 끼워넣기 방지) */
function oneLine(s) {
  return s.replace(/[\r\n\t]+/g, ' ');
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mailHtml({ lowCredit, reply, name, car, phone, kakao, email, detail }) {
  const row = (k, v) =>
    `<tr><th style="width:110px;text-align:left;padding:8px 10px;background:#f5f5f5;border-bottom:1px solid #e5e5e5;font-weight:700">${esc(k)}</th><td style="padding:8px 10px;border-bottom:1px solid #e5e5e5">${esc(v)}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1a1a1a;font-size:14px">
<div style="max-width:620px;margin:0 auto;border-top:4px solid #F2C230">
<h1 style="font-size:18px;margin:18px 0 6px">${lowCredit ? '온니카톡 저신용 전용 — 차량 추천 요청' : '온니카톡 견적 신청'}</h1>
<p style="margin:0 0 16px;color:#444"><b>${esc(reply)}</b>(으)로 회신해 주세요. 전화는 걸지 않습니다.</p>
<table style="width:100%;border-collapse:collapse;border-top:2px solid #1a1a1a;font-size:14px">
${lowCredit
    ? `${row('구분', '저신용 전용')}${row('휴대폰', phone)}${row('조건', car)}`
    : `${row('회신 방법', reply)}${row('이름/상호', name)}${row('휴대폰', phone)}${row('카톡 ID', kakao)}${row('이메일', email)}${row('차량', car)}`}
</table>
<pre style="margin:18px 0 0;padding:14px 16px;background:#f8f9fb;border:1px solid #e5e8ee;font-family:'Courier New',monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-all">${esc(detail)}</pre>
<p style="margin:24px 0 0;color:#888;font-size:12px">onlycartalk.com 견적 폼에서 자동으로 보낸 메일입니다.</p>
</div></body></html>`;
}

function b64utf8(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function encodeWord(s) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64utf8(s)}?=`;
}

function buildMime({ from, fromName, to, replyTo, subject, html }) {
  const domain = (from.split('@')[1] || 'localhost').trim();
  const body = b64utf8(html).replace(/.{1,76}/g, '$&\r\n');
  const headers = [
    `From: ${fromName ? `${encodeWord(fromName)} ` : ''}<${from}>`,
    `To: <${to}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${encodeWord(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  return headers.join('\r\n') + '\r\n\r\n' + body;
}
