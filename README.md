# Return Window Board

시뮬레이션에서 빠진 것으로 나온 예외 경로 4개를 AC로 추가했습니다. 기존 AC·문구·Value Contract는 그대로 두었고, 새 AC를 Task에 연결하려고 Covers·DoD·AC Coverage만 고쳤습니다. **추가한 AC 4개** - **AC-AD-FAIL**: 배너 광고를 못 불러와도 화면과 기능이 그대로 동작합니다.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Home` | Home |
| `/Result` | Result |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-10-07
