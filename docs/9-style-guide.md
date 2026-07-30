# TodoList 프론트엔드 스타일 가이드

버전: 1.0 / 작성일: 2026-07-30

## 0. 참조 문서 및 근거

본 문서는 사용자가 제공한 참고 스크린샷(모바일 앱 홈 화면 캡처 2장, 동일 화면)에서 관찰되는 시각적
패턴(색상 사용 방식, 여백, 컴포넌트 형태)을 참고해 TodoList 전용 디자인 토큰/컴포넌트 스타일로
재정의한 것이다. 참고 화면의 브랜드 자체(로고, 서비스명, 특정 색상의 정확한 브랜드 의미)를 그대로
차용하지 않고, "깔끔한 여백, 둥근 모서리, 단일 포인트 컬러 + 중립 배경, 플랫 디자인" 같은 스타일
경향만 추출했다.

- 화면 구조/컴포넌트 배치 자체는 재정의하지 않는다 — [`docs/8-wireframe.md`](./8-wireframe.md)가
  Source of Truth이며, 본 문서는 그 위에 색상/타이포그래피/여백/컴포넌트 스타일 "값"만 채운다.
- 상태 4종 배지의 원칙(어떤 상태에 어떤 강조를 주는지)은 [`docs/8-wireframe.md`](./8-wireframe.md)
  4.1절을 그대로 따르며, 본 문서는 거기서 "Could 범위로 남겨둔 색상 값"을 확정한다.
- 반응형 브레이크포인트는 [`docs/2-PRD.md`](./2-PRD.md) 7.4절, [`docs/8-wireframe.md`](./8-wireframe.md)
  1.3절 값을 그대로 인용한다.
- 접근성(a11y)은 [`docs/2-PRD.md`](./2-PRD.md) 6.4절에 따라 이번 범위에서 정식 대응 대상이 아니나,
  구현 난이도를 높이지 않는 선에서 기본적인 명도 대비만 고려한다(과설계 지양).

## 1. 디자인 원칙

참고 화면에서 추출한 스타일 방향을 TodoList 도메인(할일 관리)에 맞게 정리한 원칙이다.

1. **여백 우선, 플랫 디자인**: 무거운 그림자 대신 넉넉한 여백과 옅은 테두리/배경색 차이로 영역을 구분한다.
2. **단일 포인트 컬러**: 배경은 흰색/중립 회색을 기본으로 하고, 강조가 필요한 곳(주요 버튼, 포커스,
   활성 탭)에만 포인트 컬러(Primary Green)를 사용한다. 화면 전체에 색을 남발하지 않는다.
3. **상태는 색+텍스트 이중 표시**: 할일 상태(시작전/진행중/완료/기한초과)는 색상만으로 구분하지 않고
   항상 텍스트 라벨과 함께 표시한다(색맹 접근성 최소 보장, `docs/8-wireframe.md` 4.1절과 일치).
4. **둥근 모서리, 캡슐형 입력요소**: 검색창류 입력 요소는 완전히 둥근(pill) 형태, 카드/버튼은 중간
   정도의 둥근 모서리(8px)를 사용해 부드러운 인상을 준다.
5. **작은 배지로 정보 밀도 관리**: 카테고리, 상태, 알림 개수 등 부가 정보는 본문 텍스트와 시각적으로
   분리되는 작은 배지(chip)로 표시한다.

## 2. 컬러 팔레트

### 2.1 브랜드/포인트 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#03C75A` | 주요 액션 버튼, 링크, 포커스 링, 활성 탭/토글 |
| `--color-primary-dark` | `#029C46` | Primary 버튼 hover/active |
| `--color-primary-light` | `#E6F9EF` | Primary 배경톤(선택된 필터 배경 등 옅은 강조) |

### 2.2 중립 컬러 (배경/텍스트/테두리)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#FFFFFF` | 기본 배경(카드, 모달) |
| `--color-bg-subtle` | `#F5F6F7` | 페이지 배경, 비활성 영역 배경 |
| `--color-border` | `#E5E7EB` | 카드/입력 테두리 |
| `--color-text` | `#191919` | 본문 텍스트 |
| `--color-text-secondary` | `#767676` | 보조 텍스트(날짜, 캡션, placeholder) |
| `--color-text-disabled` | `#B0B0B0` | 비활성 텍스트('기본' 카테고리 수정 불가 안내 등) |

### 2.3 상태 배지 컬러 (도메인 4장 상태 4종 확정값)

`docs/8-wireframe.md` 4.1절에서 "색상 값은 별도 문서에서 확정"이라 명시한 부분을 아래로 확정한다.

| 상태 | 배지 배경 | 배지 텍스트 | 비고 |
|---|---|---|---|
| NOT_STARTED (시작 전) | `#F1F2F4` | `#767676` | 중립 회색, 가장 낮은 시각적 우선순위 |
| IN_PROGRESS (진행중) | `#E8F1FF` | `#1A73E8` | 파란색 계열, 진행 중임을 인지 |
| COMPLETED (완료) | `#E6F9EF` | `#029C46` | Primary 계열 저채도, 체크 아이콘 채움과 함께 사용 |
| OVERDUE (기한초과) | `#FDECEC` | `#E0332F` | 경고색, 카드 좌측 4px 테두리(`#E0332F`) 강조 병행 |

### 2.4 시맨틱 컬러 (폼/피드백)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-error` | `#E0332F` | 인라인 에러 메시지, 필수 입력 실패 테두리 (FR-14) |
| `--color-warning` | `#F5A623` | 경고성 안내(예: 카테고리 삭제 시 이관 안내) |
| `--color-badge-count` | `#FF3B30` | 알림 개수 등 작은 원형 카운트 배지 |

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
--font-family-base: 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont,
  'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
```

- 한글 UI에 최적화된 가변폭 산세리프를 기본으로 하고, 미설치 환경을 대비한 시스템 폰트 폴백을 둔다.
- 별도 웹폰트 라이선스/로딩 설정은 FE-1(프로젝트 셋업) 범위에서 CDN 또는 self-host로 연결한다.

### 3.2 크기/굵기 스케일

| 토큰 | size / line-height | weight | 용도 |
|---|---|---|---|
| `--font-title` | 20px / 28px | 700 | 화면 타이틀(로그인/회원가입 카드 제목 등) |
| `--font-heading` | 16px / 24px | 700 | 할일 카드 제목, 섹션 헤딩 |
| `--font-body` | 14px / 20px | 400 | 기본 본문, 입력 필드 텍스트 |
| `--font-caption` | 12px / 16px | 400 | 날짜, 보조 설명, 배지 텍스트 |
| `--font-button` | 14px / 20px | 600 | 버튼 라벨 |

## 4. 간격/레이아웃

### 4.1 기본 간격 스케일 (8px 기준)

| 토큰 | 값 |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |

- 카드 내부 padding: `--space-4`(16px), 카드 간 간격: `--space-3`(12px).
- 화면 좌우 여백(모바일): `--space-4`(16px), 데스크톱 컨테이너 최대폭 내 여백: `--space-6`(24px).

### 4.2 반응형 브레이크포인트 (PRD 7.4, 와이어프레임 1.3 인용)

| 구간 | 폭 | 레이아웃 |
|---|---|---|
| 모바일 | ~767px (기준 375px) | 1컬럼, 필터 드롭다운, 모달은 풀스크린 바텀시트 |
| 태블릿 | 768~1023px | 데스크톱 2컬럼 유지, 사이드바 폭 축소 |
| 데스크톱 | 1024px 이상 | 2컬럼(좌측 필터 사이드바 + 우측 목록) |

### 4.3 모서리 반경(Radius)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--radius-sm` | 4px | 카테고리/상태 배지(chip) |
| `--radius-md` | 8px | 버튼, 카드, 모달 |
| `--radius-lg` | 16px | 바텀시트 상단 모서리 |
| `--radius-pill` | 999px | 검색형 입력(추후 검색 기능 도입 시), 토글 버튼 그룹 |

## 5. 컴포넌트 스타일

### 5.1 버튼

| 종류 | 배경 | 텍스트 | 테두리 | 용도 |
|---|---|---|---|---|
| Primary | `--color-primary` | `#FFFFFF` | 없음 | 저장, 로그인, 가입하기, 할일 추가 |
| Secondary | `--color-bg` | `--color-text` | `1px solid --color-border` | 취소, 뒤로가기 |
| Danger | `--color-bg` | `--color-error` | `1px solid --color-error` | 삭제 확인 모달의 "삭제" 버튼 |
| Disabled | `--color-bg-subtle` | `--color-text-disabled` | 없음 | 유효성 실패로 저장 불가 상태 |

- 높이 40px(데스크톱)/44px(모바일, 터치 타깃 확보), radius `--radius-md`, 폰트 `--font-button`.

### 5.2 입력 필드 (텍스트/이메일/비밀번호/날짜)

- 배경 `--color-bg`, 테두리 `1px solid --color-border`, radius `--radius-md`, padding `--space-3`.
- 포커스 시 테두리 `--color-primary` + 얇은 outline(box-shadow)로 강조.
- 에러 상태 시 테두리 `--color-error` + 필드 하단에 `--font-caption` 크기의 에러 메시지(FR-14, 3.4.3절 인용).
- placeholder 텍스트는 `--color-text-secondary`.

### 5.3 카드 (할일 카드)

- 배경 `--color-bg`, 테두리 `1px solid --color-border`, radius `--radius-md`, padding `--space-4`.
- 기한초과(OVERDUE) 카드만 좌측 4px 컬러 바(`--color-error`)로 추가 강조(도메인 규칙 6, 와이어프레임 3.3.1).
- 카드 내부 구성 순서: 완료 체크박스 → 제목(`--font-heading`) → 카테고리 배지 → 기간(`--font-caption`,
  `--color-text-secondary`) → 상태 배지 → 수정/삭제 버튼(우측 정렬).

### 5.4 배지/칩 (카테고리, 상태, 알림 카운트)

- **카테고리 배지**: 배경 `--color-bg-subtle`, 텍스트 `--color-text-secondary`, radius `--radius-sm`,
  padding `2px 8px`, 대괄호 없이 배경색만으로 구분(와이어프레임의 `[카테고리명]` 표기를 시각적 배지로 대체).
- **상태 배지**: 2.3절 색상표 그대로 사용, radius `--radius-sm`, padding `2px 8px`.
- **알림 카운트 배지**: 원형, 배경 `--color-badge-count`, 텍스트 `#FFFFFF`, `--font-caption`보다 작은
  11px, 최소 크기 16px×16px — 현재 MVP 범위(FR-1~18)에는 알림 기능이 없으므로 향후 확장 시에만 사용.

### 5.5 모달 / 바텀시트

- 데스크톱: 화면 중앙 오버레이, 배경 dim `rgba(0,0,0,0.4)`, 모달 자체 radius `--radius-md`.
- 모바일: 화면 하단에서 올라오는 풀스크린 시트, 상단 모서리만 `--radius-lg` 적용(와이어프레임 4.2절과 동일).

## 6. CSS 커스텀 프로퍼티 (구현 참고용)

FE-1(프로젝트 셋업) 단계에서 전역 스타일 진입점(`index.css` 등)에 그대로 붙여 넣어 사용할 수 있는
토큰 정의다. 프레임워크(Tailwind 등) 도입 여부와 무관하게 CSS 변수 형태로 우선 정의한다.

```css
:root {
  /* Color */
  --color-primary: #03C75A;
  --color-primary-dark: #029C46;
  --color-primary-light: #E6F9EF;
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F5F6F7;
  --color-border: #E5E7EB;
  --color-text: #191919;
  --color-text-secondary: #767676;
  --color-text-disabled: #B0B0B0;
  --color-error: #E0332F;
  --color-warning: #F5A623;
  --color-badge-count: #FF3B30;

  /* Status badges */
  --status-not-started-bg: #F1F2F4;
  --status-not-started-text: #767676;
  --status-in-progress-bg: #E8F1FF;
  --status-in-progress-text: #1A73E8;
  --status-completed-bg: #E6F9EF;
  --status-completed-text: #029C46;
  --status-overdue-bg: #FDECEC;
  --status-overdue-text: #E0332F;

  /* Typography */
  --font-family-base: 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont,
    'Apple SD Gothic Neo', 'Segoe UI', sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-pill: 999px;
}
```

## 7. 이번 범위에서 다루지 않는 것

- 다크 모드: PRD 범위 외(9.2 가정에 명시된 범위 외 사항과 동일 기조), 이번 문서에서도 별도 토큰을
  정의하지 않는다.
- 아이콘 세트/일러스트 가이드: 별도 아이콘 라이브러리 선정은 FE-1 착수 시 실용적으로 결정하며, 본
  문서는 색상/여백/타이포그래피 토큰까지만 다룬다(과설계 지양).
- 하단 탭 내비게이션: 참고 화면에는 하단 탭(스토어/홈/콘텐츠/클립/마이)이 있었으나, TodoList는
  [`docs/8-wireframe.md`](./8-wireframe.md)에서 이미 확정한 대로 상단 고정 액션 버튼("+ 할일 추가")
  방식을 유지하며 하단 탭 구조를 새로 도입하지 않는다.
