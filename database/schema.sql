-- TodoList 데이터베이스 스키마
-- 참조: docs/6-erd.md, docs/1-domain-definition.md, docs/2-PRD.md
-- 대상: PostgreSQL 17

-- 확장: gen_random_uuid() 사용을 위해 pgcrypto 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- users: 인증 기준 테이블
-- =========================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname      VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- categories: 사용자별 할일 분류
-- 회원가입 시 '기본' 카테고리 행을 자동 생성하는 것을 권장 (docs/6-erd.md 보충설명 참조)
-- =========================================================
CREATE TABLE categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 동일 사용자 내 카테고리 이름 중복 방지
CREATE UNIQUE INDEX idx_categories_owner_name ON categories (owner_id, name);
CREATE INDEX idx_categories_owner_id ON categories (owner_id);

-- =========================================================
-- todos: 할일
-- 상태(시작전/진행중/완료/기한초과)는 컬럼으로 저장하지 않고 조회 시 파생 계산한다 (도메인 정의서 4장)
-- 카테고리 삭제 시 할일을 삭제하지 않고 '기본' 카테고리로 이관하는 처리는
-- 애플리케이션(services) 레벨에서 수행하므로 category_id는 ON DELETE RESTRICT로 둔다 (도메인 규칙 7)
-- =========================================================
CREATE TABLE todos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 도메인 규칙 3: 시작일자는 종료일자보다 이후일 수 없다 (같은 날짜는 허용)
    CONSTRAINT chk_todos_date_range CHECK (start_date <= end_date)
);

-- 목록 조회(카테고리+상태 필터, FR-8)에서 자주 사용하는 컬럼에 인덱스 적용
CREATE INDEX idx_todos_owner_id ON todos (owner_id);
CREATE INDEX idx_todos_category_id ON todos (category_id);
CREATE INDEX idx_todos_owner_completed_end_date ON todos (owner_id, is_completed, end_date);
