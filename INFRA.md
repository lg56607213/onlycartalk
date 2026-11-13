# 인프라 · 도메인 설정

대시보드에만 저장되어 저장소 코드로는 확인할 수 없는 설정을 기록해 둔 것이다.
설정을 바꾸면 이 문서도 같이 고칠 것.

2026-11-13 에 호스팅을 **Cloudflare Workers** 로 옮겼다 (mytruck 과 같은 계정 · 같은 방식).

## 1. 호스팅

| 항목 | 값 |
|---|---|
| 호스팅 | **Cloudflare Workers** (정적 자산) |
| Worker 이름 | `onlycartalk` |
| 설정 파일 | [`wrangler.jsonc`](wrangler.jsonc) |
| 배포할 폴더 | `./site` |
| 배포 방식 | `main` 브랜치에 push → Cloudflare 가 `npx wrangler deploy` 자동 실행 |
| 주소 규칙 | [`site/_redirects`](site/_redirects) |

- `/quote.html` 로 들어오면 `/quote` 로 정리된다 (`html_handling: auto-trailing-slash`). 쿼리(`?src=` 등)는 유지된다.
- 없는 주소는 `site/404.html` 을 보여준다.
- `_redirects` 에 `/quote → /quote.html` 같은 규칙을 넣으면 무한 리다이렉트가 난다. 넣지 말 것.

## 2. 도메인

| 도메인 | 상태 |
|---|---|
| `onlycartalk.com` | **보유 · 운영 중** — `onlycartalk` Worker 의 커스텀 도메인 |
| `www.onlycartalk.com` | `onlycartalk` Worker 의 커스텀 도메인 |
| `onlycartalk.co.kr` | 미등록 |
| `onlycartalk.kr` | 미등록 |
| `onlycartalk.net` | 미등록 |

`.com` 외에는 등록되어 있지 않다. 국내 ISP 가 없는 도메인에 안내 페이지 IP 를
돌려주기 때문에 `.co.kr` 로 접속하면 서버가 있는 것처럼 보였다가 연결이 끊긴다.
접속은 **https://onlycartalk.com** 으로 한다.

> **한 도메인은 Worker 하나에만 붙는다.**
> 이전 당시 `onlycartalk.com` 이 `acerentcar` Worker 에 붙어 있어서 에이스렌터카 사이트가 나왔고,
> 새 Worker 에 등록하려 하면 `Hostname already in use by other custom domain` 오류가 났다.
> 기존 Worker 의 도메인 탭에서 먼저 지운 뒤 새 Worker 에 등록해야 한다.

> 서브도메인을 새로 추가할 때는 DNS 레코드만으로는 부족하다.
> **Worker 의 커스텀 도메인 등록까지** 해야 한다 — 안 하면 HTTP 522 가 난다.

## 3. DNS · 메일

네임서버: `grant.ns.cloudflare.com` / `magdalena.ns.cloudflare.com` (**Cloudflare DNS**)

| 용도 | 값 |
|---|---|
| 메일 수신 | **Cloudflare 이메일 라우팅** — MX `route1~3.mx.cloudflare.net` |
| 견적 메일 발송 | Worker 의 `send_email` 바인딩(`MAILER`) — `noti@onlycartalk.com` → `jdgp@jdgp.co.kr` |

이메일 라우팅은 받는 메일을 다른 메일함으로 넘겨 주는 기능이다.
주소 규칙(어느 주소를 어느 메일함으로 보낼지)은 대시보드의 이메일 → 이메일 라우팅에서 관리한다.
견적 폼의 메일도 이 기능으로 보낸다 (`src/index.js`). **인증된 대상 주소로만** 보낼 수 있으므로,
받는 주소를 바꿀 때는 대시보드에서 새 주소를 먼저 인증한 뒤 `wrangler.jsonc` 를 고친다.
에이스렌터카 홈페이지도 같은 `noti@onlycartalk.com` 을 보내는 주소로 쓴다.

## 4. 외부 서비스

| 서비스 | 용도 | 비고 |
|---|---|---|
| EmailJS | 견적 접수 실패 시 예비 전송 | `site/quote.html` 안에 키가 들어 있다 |

EmailJS 공개키는 브라우저에 노출되는 값이라 저장소에 포함되어도 무방하다.
다만 서비스 ID · 템플릿 ID 와 함께 유출되면 폼 도용이 가능하므로,
EmailJS 대시보드에서 **허용 도메인을 onlycartalk.com 으로 제한**해 둘 것.
