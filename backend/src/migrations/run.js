/**
 * 마이그레이션 실행 스크립트 (DB-3)
 *
 * 역할: backend/src/migrations/ 디렉토리 내 *.sql 파일을 파일명 오름차순으로 정렬하여
 *       순차적으로 실행한다 (예: 001_init.sql -> 002_xxx.sql -> ...).
 *
 * 실행 방법:
 *   - BE-1에서 backend/package.json이 생성되면 아래 npm script 등록을 권장한다.
 *       "scripts": { "migrate": "node src/migrations/run.js" }
 *     이후에는 `npm run migrate`로 실행한다.
 *   - 그 전까지(package.json 없는 현재 상태)는 저장소 루트 기준으로 다음과 같이 직접 실행한다.
 *       node backend/src/migrations/run.js
 *
 * 필요 환경변수:
 *   - POSTGRES_CONNECTION_STRING : PostgreSQL 접속 문자열 (backend/.env 참고)
 *
 * 의존 패키지:
 *   - pg (BE-1에서 backend 프로젝트 초기화 시 설치 예정, 현재는 미설치 상태일 수 있음)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = __dirname;

/**
 * migrations 디렉토리에서 *.sql 파일만 골라 파일명 오름차순으로 정렬해 반환한다.
 * @returns {string[]} 정렬된 절대 경로 목록
 */
function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((fileName) => path.join(MIGRATIONS_DIR, fileName));
}

/**
 * 정렬된 SQL 마이그레이션 파일들을 하나의 Client 연결로 순차 실행한다.
 * 실패 시 즉시 중단하고 종료 코드 1로 프로세스를 종료한다.
 */
async function runMigrations() {
  const connectionString = process.env.POSTGRES_CONNECTION_STRING;

  if (!connectionString) {
    console.error('[migrate] 오류: 환경변수 POSTGRES_CONNECTION_STRING이 설정되어 있지 않습니다.');
    process.exit(1);
  }

  const migrationFiles = getMigrationFiles();

  if (migrationFiles.length === 0) {
    console.log('[migrate] 실행할 마이그레이션 파일이 없습니다.');
    return;
  }

  const client = new Client({ connectionString });

  console.log('[migrate] PostgreSQL 연결을 시도합니다...');
  await client.connect();
  console.log('[migrate] PostgreSQL 연결 성공.');

  try {
    for (const filePath of migrationFiles) {
      const fileName = path.basename(filePath);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[migrate] 실행 시작: ${fileName}`);
      await client.query(sql);
      console.log(`[migrate] 실행 완료: ${fileName}`);
    }

    console.log('[migrate] 모든 마이그레이션이 성공적으로 적용되었습니다.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((error) => {
  console.error('[migrate] 마이그레이션 실행 중 오류가 발생했습니다:', error);
  process.exit(1);
});
