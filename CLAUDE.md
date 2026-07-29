# CLAUDE.md

TodoList 프로젝트에서 작업하는 모든 세션(개발/문서/리뷰)에 공통으로 적용되는 지침이다. 여기 없는
세부 규칙은 `docs/` 문서를 Source of Truth로 따른다.

## 프로젝트 개요

인증된 사용자가 개인 할일(Todo)을 카테고리·기간(시작일~종료일)·상태(시작 전/진행중/완료/기한초과)
기준으로 관리하는 웹 서비스. 1인 개발, 2일 MVP 규모.

- 프론트엔드: React 19 + TypeScript + Zustand(클라이언트 상태) + TanStack Query(서버 상태)
- 백엔드: Node.js + JavaScript(TypeScript 아님) + Express + `pg` 직접 사용 (Prisma 등 ORM 금지)
- DB: PostgreSQL 17
- 플랫폼: 웹 전용, 반응형 UI (네이티브 앱 없음)

## 프로젝트에 반드시 적용할 지침

- 모든 대화는 한국어로 진행할 것
- 지시하지 않은 작업 수행하지말것(오버엔지니어링 금지)

## 문서 우선순위 (상충 시)

도메인 정의서 > PRD > project-structure.md > 실행계획/기타 문서. 코드가 문서와 어긋나면 코드를
고치거나, 의도된 변경이라면 해당 문서를 함께 갱신한다 — 문서만 방치한 채 코드를 바꾸지 않는다.

## 참조 문서 (`docs/`)

| 문서                                                           | 용도                                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/1-domain-definition.md`](./docs/1-domain-definition.md) | 용어, 엔티티(User/Category/Todo), 상태 파생 로직, 비즈니스 규칙 1~7, 유스케이스 UC-1~9, 필터링 기준 — **모든 비즈니스 로직의 근거**               |
| [`docs/2-PRD.md`](./docs/2-PRD.md)                             | 목표/KPI, 범위(MoSCoW), 기능요구사항 FR-1~18, 비기능요구사항, 기술 아키텍처, 일정                                                                 |
| [`docs/3-user-scenario.md`](./docs/3-user-scenario.md)         | 페르소나, 핵심 사용자 시나리오, 예외 시나리오                                                                                                     |
| [`docs/4-project-structure.md`](./docs/4-project-structure.md) | 레이어 구조, 네이밍, 테스트/보안/설정 원칙, 프론트/백엔드 디렉토리 구조 — **코드 작성 시 가장 먼저 확인할 문서**                                  |
| [`docs/5-arch-diagram.md`](./docs/5-arch-diagram.md)           | 시스템 구성도, 백엔드 레이어 흐름 (Mermaid)                                                                                                       |
| [`docs/6-erd.md`](./docs/6-erd.md)                             | ERD, FK/삭제 정책, '기본' 카테고리 설계 근거                                                                                                      |
| [`docs/7-execution-plan.md`](./docs/7-execution-plan.md)       | DB/BE/FE Task 목록(Task ID 체계 `DB-n`/`BE-n`/`FE-n`), 의존성, 완료 조건 체크리스트 — **작업 시작 전 해당 Task 항목 확인, 완료 시 체크박스 갱신** |
| [`docs/8-wireframe.md`](./docs/8-wireframe.md)                 | 화면별 와이어프레임(데스크톱/모바일), 반응형 재배치 원칙                                                                                          |
| [`docs/decisions/`](./docs/decisions/)                         | 개별 설계 결정 기록(ADR 성격, 예: 기본 카테고리 자동 생성 정책)                                                                                   |
| `database/schema.sql`, `backend/src/migrations/`               | 실제 DDL 및 마이그레이션 (스키마 변경은 여기서만)                                                                                                 |
| `swagger/swagger.json`                                         | OpenAPI 스펙                                                                                                                                      |

## 공통 규칙

1. **도메인 용어 그대로 사용**: 코드의 테이블/변수/타입명은 도메인 정의서 2장 용어(User/Category/Todo,
   소유자, 상태 등)를 그대로 쓴다. 임의 동의어(`task`, `group` 등)를 섞지 않는다.
2. **상태는 저장하지 않고 파생 계산**: 할일 상태(NOT_STARTED/IN_PROGRESS/COMPLETED/OVERDUE)는 DB
   컬럼으로 두지 않고 조회 시점에 계산한다. 완료 처리된 할일은 기한 경과 여부와 무관하게 항상
   COMPLETED로 간주한다(도메인 규칙 6).
3. **소유권 검증은 항상 404로**: 인증된 사용자가 본인 소유가 아닌 리소스에 접근하면 403이 아니라
   404로 응답해 존재 여부 자체를 노출하지 않는다(도메인 규칙 4).
4. **레이어 분리 준수**: 백엔드는 `routes → controllers → services → repositories` 단방향 의존만
   허용한다. 도메인 규칙(상태 파생, 소유권 검증, 기본 카테고리 적용/이관, 기간 유효성)은 services
   레이어에만 위치시킨다. 프론트엔드는 `UI → 상태관리(Zustand/TanStack Query) → API 클라이언트`
   순서를 지키며, 서버 상태는 TanStack Query에만, 클라이언트 상태는 Zustand에만 둔다.
5. **과설계 지양(YAGNI)**: 1인 개발·2일 MVP 제약을 감안해 지금 필요하지 않은 추상화, 마이크로서비스
   분리, 불필요한 ORM/캐시 레이어를 도입하지 않는다.
6. **매직 넘버/문자열 금지**: 상태값, 기본 카테고리명 등은 `constants/` 모듈로 분리한다.
7. **로깅은 콘솔 기반**: 별도 로깅 라이브러리 없이 `console.log`/`console.error`만 사용한다(현재
   백엔드 마이그레이션 스크립트 등에 적용된 방식과 동일).
8. **설정/시크릿 분리**: DB 접속정보·JWT 시크릿 등은 `.env`로 관리하고 커밋하지 않는다. 새 환경변수를
   추가하면 `.env.example`도 함께 갱신한다.
9. **테스트는 핵심 로직 우선**: 전체 자동화 테스트 스위트를 갖추기보다, 상태 파생 로직과 소유권 검증
   등 회귀 위험이 큰 로직에 최소 단위 테스트를 우선 작성한다(`docs/4-project-structure.md` 4장).
10. **작업 단위는 실행계획 Task 기준**: 새 기능/수정 작업을 시작할 때 `docs/7-execution-plan.md`에서
    해당하는 `DB-n`/`BE-n`/`FE-n` Task를 먼저 확인하고, 완료 후에는 그 Task의 완료 조건 체크박스를
    갱신한다.

## Git/커밋 관례

- 커밋 메시지는 "무엇을" 보다 "왜"를 한두 문장으로 요약한다.
- 커밋에는 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`를 포함한다.
- 사용자가 명시적으로 요청한 경우에만 커밋/푸시한다.
