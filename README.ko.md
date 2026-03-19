# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | 한국어

**Claude Code의 메모리, 스킬, MCP 서버, 훅을 한눈에 관리하는 대시보드. 스코프 계층으로 정리하고, 드래그 앤 드롭으로 스코프 간 이동.**

![Claude Code Organizer Demo](docs/demo.gif)

## 이런 적 있지 않나요?

Claude Code한테 "이거 기억해"라고 했는데, **엉뚱한 스코프에 저장된 적** 없나요?

흔한 시나리오: 프로젝트 폴더 안에서 Claude한테 설정을 기억시키면, 그 프로젝트 스코프에 저장됩니다. 다른 프로젝트로 넘어가면? Claude는 모릅니다. 그 메모리는 원래 프로젝트에 갇혀버립니다.

반대도 마찬가지 — 글로벌 스코프에 있는 스킬이나 메모리가 실제로는 하나의 레포에서만 쓰는 건데, 모든 프로젝트에 새어 나갑니다.

직접 고치려면? `~/.claude/` 안에서 `-home-user-projects-my-app/` 같은 인코딩된 경로 폴더를 뒤져서 해당 파일을 찾아 수동으로 옮겨야 합니다. 솔직히 꽤 번거롭죠.

**Claude Code Organizer가 이 문제를 해결합니다.**

### 예시: 프로젝트 → 글로벌

프로젝트 안에서 "TypeScript + ESM 선호"를 기억시켰는데, 이 설정은 모든 곳에서 적용돼야 합니다. 대시보드 열고, 그 메모리를 프로젝트에서 글로벌로 드래그. 끝.

### 예시: 글로벌 → 프로젝트

글로벌에 배포 스킬이 있는데, 실제로는 하나의 레포에서만 씁니다. 해당 프로젝트로 드래그하면 다른 프로젝트에서는 안 보입니다. 깔끔.

---

## 기능

- **스코프 계층 뷰** — Global > Workspace > Project로 정리, 상속 관계도 한눈에
- **드래그 앤 드롭** — 메모리, 스킬, MCP 서버를 스코프 간에 바로 이동
- **이동 전 확인** — 파일 건드리기 전에 반드시 확인 모달 표시
- **타입 안전성** — 메모리는 메모리 폴더로만, 스킬은 스킬 폴더로만 이동 가능
- **검색 & 필터** — 모든 항목 실시간 검색, 카테고리별 필터 (메모리, 스킬, MCP, 설정, 훅, 플러그인, 플랜)
- **상세 패널** — 항목 클릭하면 메타데이터, 설명, 파일 경로 확인 + VS Code에서 바로 열기
- **의존성 제로** — 순수 Node.js 내장 모듈, SortableJS는 CDN으로
- **진짜 파일 이동** — `~/.claude/` 안의 파일을 실제로 옮깁니다. 보기만 하는 뷰어가 아닙니다

## 왜 비주얼 대시보드인가?

Claude Code는 CLI로도 파일 목록 확인과 이동이 가능합니다. 그런데 왜 이 도구가 필요할까요?

| 하고 싶은 것 | CLI / Skill | 비주얼 대시보드 |
|-------------|:-----------:|:-------------:|
| **전체 그림** — 모든 스코프의 메모리, 스킬, MCP 서버를 한 번에 보기 | 긴 텍스트 출력 스크롤 | 스코프 트리로 한눈에 |
| **스코프 간 인식** — Global vs Workspace vs Project 상속 관계 파악 | 여러 명령어 실행 후 머릿속으로 조합 | 들여쓰기된 트리 계층 |
| **스코프 간 항목 이동** | 정확한 경로 기억 + 명령어 입력 | 드래그 앤 드롭 |
| **내용 미리보기** | 파일 하나씩 `cat` | 클릭 → 사이드 패널 |
| **전체 검색** | `grep` + 수동 필터링 | 실시간 검색 + 카테고리 필터 |
| **보유 현황 파악** | 디렉토리별 파일 수를 직접 세기 | 스코프×카테고리별 자동 카운트 |

텍스트 출력으로는 얻을 수 없는 **전체 그림**을 제공합니다 — 스코프 트리 전체가 보이고, 잘못 배치된 항목을 즉시 발견하고, 드래그로 수정. 명령어를 외울 필요도 경로를 입력할 필요도 없습니다.

## 빠른 시작

```bash
# 바로 실행 (설치 필요 없음)
npx @mcpware/claude-code-organizer

# 글로벌 설치도 가능
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

아니면 Claude Code한테 이렇게 말하세요:

> `npx @mcpware/claude-code-organizer` 실행해줘. Claude Code 설정 관리하는 대시보드야. 준비되면 URL 알려줘.

`http://localhost:3847`에서 대시보드가 열립니다. 실제 `~/.claude/` 디렉토리를 직접 조작합니다.

## 관리 대상

| 타입 | 보기 | 스코프 간 이동 |
|------|:----:|:------------:|
| 메모리 (feedback, user, project, reference) | ✅ | ✅ |
| 스킬 | ✅ | ✅ |
| MCP 서버 | ✅ | ✅ |
| 설정 (CLAUDE.md, settings.json) | ✅ | 🔒 |
| 훅 | ✅ | 🔒 |
| 플러그인 | ✅ | 🔒 |
| 플랜 | ✅ | 🔒 |

## 스코프 계층

```
Global                       <- 모든 곳에 적용
  회사 (Workspace)            <- 하위 모든 프로젝트에 적용
    회사레포1                  <- 이 프로젝트 전용
    회사레포2                  <- 이 프로젝트 전용
  사이드프로젝트 (Project)      <- 독립 프로젝트
  문서 (Project)               <- 독립 프로젝트
```

하위 스코프는 상위 스코프의 메모리, 스킬, MCP 서버를 자동으로 상속합니다.

## 작동 방식

1. **스캔** `~/.claude/` — 모든 프로젝트, 메모리, 스킬, MCP 서버, 훅, 플러그인, 플랜 탐색
2. **계층 파악** — 파일 시스템 경로에서 부모-자식 관계 추론
3. **대시보드 렌더링** — 스코프 헤더 > 카테고리 바 > 항목 목록, 자동 들여쓰기
4. **이동 처리** — 드래그하거나 "이동…" 클릭하면 안전 검사 후 파일을 실제로 이동

## 플랫폼

| 플랫폼 | 상태 |
|--------|:----:|
| Ubuntu / Linux | ✅ 지원 |
| macOS | 아마 됩니다 (미테스트) |
| Windows | 미지원 |
| WSL | 아마 됩니다 (미테스트) |

## 라이선스

MIT

## 만든 사람

[ithiria894](https://github.com/ithiria894) — Claude Code 생태계를 위한 도구 제작.
