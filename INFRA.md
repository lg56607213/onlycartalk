# 인프라 · 도메인 설정

대시보드에만 저장되어 저장소 코드로는 확인할 수 없는 설정을 기록해 둔 것이다.
설정을 바꾸면 이 문서도 같이 고칠 것.

## 1. 호스팅

| 항목 | 값 |
|---|---|
| 호스팅 | **Netlify** |
| 설정 파일 | [`netlify.toml`](netlify.toml) |
| 배포할 폴더 | `./site` |
| 배포 방식 | `main` 브랜치에 push → 자동 배포 |

> mytruck 은 2026-08-09 에 Netlify → Cloudflare Workers 로 이전했다.
> onlycartalk 은 아직 Netlify 에 있다. 당장 옮길 이유는 없으나,
> 두 사이트를 한 곳에서 관리하려면 나중에 맞추는 것을 고려한다.

## 2. 도메인

| 도메인 | 상태 |
|---|---|
| `onlycartalk.com` | **보유 · 운영 중** |
| `onlycartalk.co.kr` | 미등록 |
| `onlycartalk.kr` | 미등록 |
| `onlycartalk.net` | 미등록 |

`.com` 외에는 등록되어 있지 않다. 국내 ISP 가 없는 도메인에 안내 페이지 IP 를
돌려주기 때문에 `.co.kr` 로 접속하면 서버가 있는 것처럼 보였다가 연결이 끊긴다.
접속은 **https://onlycartalk.com** 으로 한다.

## 3. DNS

네임서버: `dns1~4.p02.nsone.net` (**Netlify DNS**)

## 4. 외부 서비스

| 서비스 | 용도 | 비고 |
|---|---|---|
| EmailJS | 견적 신청 폼 전송 | `site/index.html` 안에 키가 들어 있다 |

EmailJS 공개키는 브라우저에 노출되는 값이라 저장소에 포함되어도 무방하다.
다만 서비스 ID · 템플릿 ID 와 함께 유출되면 폼 도용이 가능하므로,
EmailJS 대시보드에서 **허용 도메인을 onlycartalk.com 으로 제한**해 둘 것.
