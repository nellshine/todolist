# DB-6 완료조건 검증 테스트 스펙 (목록 조회 인덱스 성능 확인)

버전: 1.0 / 작성일: 2026-07-29

## 1. 개요

본 문서는 [`docs/7-execution-plan.md`](../../docs/7-execution-plan.md) DB-6 Task의 완료조건을
`todolist_dev`에 대해 `EXPLAIN ANALYZE`로 검증하기 위한 테스트 케이스 명세다.

> 완료조건(원문, `docs/7-execution-plan.md` DB-6절):
> - [ ] 대표 쿼리 3종(단독 owner, owner+category, 기한초과 조건)에 대해 `EXPLAIN ANALYZE`를 실행하고 기록했다.
> - [ ] 인덱스 스캔 사용 여부(또는 Seq Scan 사유)를 확인했다.
> - [ ] "시작 전/진행중" 필터에 `start_date` 인덱스 커버리지 부족 여부를 확인하고 추가 여부를 판단했다.
> - [ ] 최종 인덱스 목록을 BE-6(목록 조회 쿼리) 참고 자료로 정리했다.

관련 도메인 규칙: [`docs/1-domain-definition.md`](../../docs/1-domain-definition.md) 4장(상태 판단 조건:
시작 전/진행중/완료/기한초과)과 7장(카테고리 필터·상태 필터는 AND 조건으로 동시 적용).

- 실행 주체: 오케스트레이터가 `postgresql-mcp` MCP 도구(`pg_execute_sql`, `pg_execute_query` 등)로 아래
  SQL을 순차 실행한다. 본 문서는 코드/스키마를 직접 변경하지 않고, 실행 절차·SQL·관찰 포인트만 정의한다.
- 대상 DB: `todolist_dev`
- 전제:
  - 벤치마크 데이터는 별도 파일 [`database/tests/db-6-seed-benchmark.sql`](./db-6-seed-benchmark.sql)로
    준비된다(users 20명, 유저당 카테고리 3개, todos 5만 건 이상, 그중 `bench-user-1@example.com` 유저에게
    todos 집중 배분). 본 문서는 그 스크립트의 내용을 정의하지 않으며, 이미 실행되어 데이터가 적재된
    상태를 전제로 한다.
  - 기존 인덱스 3개가 이미 존재한다: `idx_todos_owner_id(owner_id)`, `idx_todos_category_id(category_id)`,
    `idx_todos_owner_completed_end_date(owner_id, is_completed, end_date)`.
  - 추가 인덱스 후보는 [`backend/src/migrations/002_add_todos_start_date_index_candidate.sql.disabled`](../../backend/src/migrations/002_add_todos_start_date_index_candidate.sql.disabled)
    로 별도 준비되며(비활성 상태), 본 문서 TC-DB6-6/7에서 적용 여부를 판단하는 데만 참조한다. 본
    문서는 그 파일의 내용을 정의하거나 수정하지 않는다.
  - EXPLAIN 결과의 실제 수치(플랜 종류, actual time, 행 수 등)는 이 문서 작성 시점에는 알 수 없으므로
    기록하지 않는다. 오케스트레이터가 실행 후 각 TC의 "기록" 항목에 실측값을 채워 넣는다.
- 원칙: 타겟 유저 조회 시 실제로 반환된 UUID 값을 그대로 이후 SQL의 `<target_uuid>` / `<category_uuid>`
  자리에 치환해 사용한다(플레이스홀더 문자열 그대로 실행하지 않는다).

---

## 2. 실행 절차 개요

1. **벤치마크 데이터 적재**: `database/tests/db-6-seed-benchmark.sql`을 실행한다(다른 에이전트 산출물,
   본 문서에서는 실행 지시만 하고 내용은 다루지 않음).
2. **타겟 유저 UUID 조회**:
   ```sql
   SELECT id FROM users WHERE email = 'bench-user-1@example.com';
   ```
   반환된 `id` 값을 이후 모든 TC의 `<target_uuid>`로 사용한다.
3. **TC-DB6-1 ~ TC-DB6-6을 순서대로 실행**하며 위에서 얻은 UUID로 치환한다. 조건부 TC-DB6-7은
   TC-DB6-6의 판단 결과에 따라 실행 여부를 결정한다.
4. **cleanup**: `database/tests/db-6-seed-benchmark.sql` 하단에 정의된 정리(DELETE/DROP) SQL을
   그대로 실행한다(본 문서에서 별도로 cleanup SQL을 재작성하지 않음).

---

## 3. 테스트 케이스

### TC-DB6-1: 단독 owner 조회

완료조건 매핑: "대표 쿼리 3종" 중 1번째, "인덱스 스캔 사용 여부 확인".

```sql
EXPLAIN ANALYZE
SELECT * FROM todos WHERE owner_id = '<target_uuid>';
```

관찰 포인트:
- 플랜 최상위 노드가 `Index Scan` 또는 `Bitmap Heap Scan` + `Bitmap Index Scan`인지, 아니면 `Seq Scan`인지.
- 인덱스를 사용했다면 인덱스명이 `idx_todos_owner_id`인지(플랜 텍스트에 명시됨).
- `Seq Scan`이 나온 경우, 플래너가 그렇게 판단한 사유를 추정할 수 있는 정보(반환 행 수 대비 전체
  todos 행 수 비율, `cost` 값)를 함께 기록한다.
- `actual time=...` (첫 번째 값=startup, 두 번째 값=total)과 `rows=` 값을 기록한다.

기록(실측 결과, 타겟 유저 `bench-user-1@example.com` = `b42219c4-72d4-48c6-a320-f8e87e51c075`, 4,000건 소유):
- 플랜 종류: `Bitmap Heap Scan` + `Bitmap Index Scan` (Seq Scan 아님)
- 사용 인덱스: `idx_todos_owner_id`
- actual time: startup 0.307ms / total 1.699ms (Execution Time 1.950ms)
- 반환 행 수: 4000 (전체 todos 50,000건 중 8% — 옵티마이저가 인덱스 스캔을 선택함)

### TC-DB6-2: owner + category 조회

완료조건 매핑: "대표 쿼리 3종" 중 2번째.

먼저 타겟 유저의 카테고리 하나를 조회한다:

```sql
SELECT id FROM categories WHERE owner_id = '<target_uuid>' LIMIT 1;
```

반환된 `id`를 `<category_uuid>`로 치환해 실행한다:

```sql
EXPLAIN ANALYZE
SELECT * FROM todos
WHERE owner_id = '<target_uuid>' AND category_id = '<category_uuid>';
```

관찰 포인트:
- `idx_todos_owner_id`, `idx_todos_category_id` 중 어느 쪽(또는 둘 다 BitmapAnd 형태로 결합, 또는
  둘 다 아님)이 사용되었는지.
- `owner_id`만으로 조회되고 `category_id`는 `Filter`로 처리되는지, 아니면 두 컬럼을 함께 활용하는
  플랜인지.
- actual time, 반환 행 수 기록.

기록(실측 결과, `<category_uuid>` = `c29c9d47-a8c2-4225-ba30-d29b859291e2`('업무')):
- 플랜 종류/사용 인덱스: `BitmapAnd`로 `idx_todos_category_id`와 `idx_todos_owner_id` 두 인덱스를 모두 활용(각각 Bitmap Index Scan 후 AND 결합), `owner_id`/`category_id` 모두 Index Cond로 처리되고 별도 `Filter` 없음
- actual time: total 0.296ms (Execution Time 0.337ms)
- 반환 행 수: 1333

### TC-DB6-3: 기한초과(Overdue) 조회

완료조건 매핑: "대표 쿼리 3종" 중 3번째. 도메인 정의서 4장 "기한초과(Overdue): 완료되지 않았고,
현재일자 > 종료일자" 조건에 대응.

```sql
EXPLAIN ANALYZE
SELECT * FROM todos
WHERE owner_id = '<target_uuid>'
  AND is_completed = false
  AND end_date < CURRENT_DATE;
```

관찰 포인트:
- `idx_todos_owner_completed_end_date(owner_id, is_completed, end_date)`가 Index (Cond) 조건으로
  세 컬럼 모두를 커버하며 사용되는지(가장 이상적인 케이스), 아니면 일부만 Index Cond이고 나머지는
  Filter로 처리되는지.
- actual time, 반환 행 수 기록.

기록(실측 결과):
- 플랜 종류/사용 인덱스: `Bitmap Heap Scan` + `Bitmap Index Scan on idx_todos_owner_id` — **예상과 달리 3-컬럼 복합 인덱스 `idx_todos_owner_completed_end_date`가 아니라 `idx_todos_owner_id` 단일 인덱스만 사용되고, `is_completed`/`end_date` 조건은 `Filter`로 처리됨** (`Filter: ((NOT is_completed) AND (end_date < CURRENT_DATE))`, `Rows Removed by Filter: 3000`). 옵티마이저가 `owner_id` 하나만으로도 충분히 좁혀진다고 판단해 더 넓은(선택도가 낮은) 인덱스를 선택한 것으로 추정(타겟 유저의 절대 행 수 4,000건이 작아 두 인덱스 간 비용 차이가 미미).
- actual time: total 0.296ms (Execution Time 1.057ms)
- 반환 행 수: 1000 (4000건 중 25%, `g % 4` 분배와 일치)

### TC-DB6-4: 시작 전(Not Started) 필터 커버리지 검토

완료조건 매핑: "start_date 인덱스 커버리지 부족 여부 확인". 도메인 정의서 4장 "시작 전: 완료되지
않았고, 현재일자 < 시작일자" 조건에 대응.

```sql
EXPLAIN ANALYZE
SELECT * FROM todos
WHERE owner_id = '<target_uuid>'
  AND is_completed = false
  AND start_date > CURRENT_DATE;
```

관찰 포인트:
- `start_date`는 기존 3개 인덱스 어디에도 포함되지 않으므로, `owner_id`(+`is_completed`, 사용 가능
  시 `idx_todos_owner_completed_end_date`의 선두 컬럼들)까지는 Index Cond로 좁혀지고 `start_date >
  CURRENT_DATE`는 `Filter`로 처리될 가능성이 높다는 점을 확인한다.
- `Rows Removed by Filter` 값(Filter 단계에서 제거된 행 수)과 이것이 Index Cond로 이미 좁혀진 행
  수 대비 어느 비율인지 기록한다.
- Filter 단계로 인한 추가 실행 시간이 유의미한 수준인지(즉, Index Cond만으로 걸린 시간과 전체
  actual time의 차이) 확인한다.

기록(실측 결과):
- 플랜 종류/사용 인덱스: `Bitmap Heap Scan` + `Bitmap Index Scan on idx_todos_owner_completed_end_date` — `owner_id`+`is_completed`가 Index Cond로 처리되어 3000건으로 좁혀지고, `start_date > CURRENT_DATE`만 `Filter`로 처리됨
- Index Cond로 좁혀진 행 수 vs. `Rows Removed by Filter`: Index Cond 3000건 → Filter로 2000건 제거 → 최종 1000건 반환
- actual time: total 0.087ms (Execution Time 0.621ms)

### TC-DB6-5: 진행중(In Progress) 필터 커버리지 검토

완료조건 매핑: "start_date 인덱스 커버리지 부족 여부 확인". 도메인 정의서 4장 "진행중: 완료되지
않았고, 시작일자 ≤ 현재일자 ≤ 종료일자" 조건에 대응.

```sql
EXPLAIN ANALYZE
SELECT * FROM todos
WHERE owner_id = '<target_uuid>'
  AND is_completed = false
  AND start_date <= CURRENT_DATE
  AND end_date >= CURRENT_DATE;
```

관찰 포인트: TC-DB6-4와 동일한 관점(어느 컬럼까지 Index Cond로 처리되는지, `start_date` 조건이
Filter로 처리되는지, `Rows Removed by Filter` 비율, 추가 실행 시간의 유의미성)으로 확인한다.
단, 이 쿼리는 `end_date >= CURRENT_DATE`도 포함하므로 `idx_todos_owner_completed_end_date`가
`end_date` 조건까지 Index Cond로 활용할 가능성이 TC-DB6-4보다 높을 수 있음에 유의해 플랜을 비교한다.

기록(실측 결과):
- 플랜 종류/사용 인덱스: `Bitmap Heap Scan` + `Bitmap Index Scan on idx_todos_owner_completed_end_date` — `owner_id`+`is_completed`+`end_date >= CURRENT_DATE`까지 Index Cond로 처리되어(예상대로 `end_date` 조건도 인덱스 활용) 2000건으로 좁혀지고, `start_date <= CURRENT_DATE`만 `Filter`로 처리됨
- Index Cond로 좁혀진 행 수 vs. `Rows Removed by Filter`: Index Cond 2000건 → Filter로 1000건 제거 → 최종 1000건 반환
- actual time: total 0.165ms (Execution Time 1.060ms)

### TC-DB6-6: 커버리지 판단 기준 및 추가 인덱스 적용 여부 결정

완료조건 매핑: "start_date 인덱스 커버리지 부족 여부를 확인하고 추가 여부를 판단했다".

판단 기준(TC-DB6-4/5 결과를 근거로 적용):

- **추가 인덱스 불필요**로 판단하는 경우: `owner_id`(+`is_completed`) 단계에서 이미 대상 행이
  충분히 좁혀지고(예: 수백 건 이하 수준), 이후 `start_date` 비교가 `Filter`로 처리되더라도 그로
  인한 추가 실행 시간이 무시할 수준(예: 전체 actual time 대비 몇 ms 이내 증가)이면, 현재 3개
  인덱스로 충분하다고 결론짓는다.
- **추가 인덱스 적용 권장**으로 판단하는 경우: `owner_id`(+`is_completed`) 단계에서도 대상 행 수가
  크고(예: 수천 건 이상) `Filter`로 제거되는 행 비율이 높으며 그로 인한 실행 시간 증가가 유의미한
  경우, [`backend/src/migrations/002_add_todos_start_date_index_candidate.sql.disabled`](../../backend/src/migrations/002_add_todos_start_date_index_candidate.sql.disabled)
  파일명에서 `.disabled` 확장자를 제거해 마이그레이션을 활성화하고 적용할 것을 권장한다.

판단 결과 기록(실측 결과):
- TC-DB6-4/5의 Filter 단계 행 수·시간 요약: TC-DB6-4는 Index Cond로 3000건까지 좁힌 뒤 Filter로 2000건 제거(Execution Time 0.621ms), TC-DB6-5는 Index Cond로 2000건까지 좁힌 뒤 Filter로 1000건 제거(Execution Time 1.060ms). 두 경우 모두 실행시간이 1.1ms 이내로, PRD 6.1 KPI(목록 조회 P95 300ms 이하) 대비 무시할 수 있는 수준이다.
- 최종 판단: **추가 인덱스 불필요** (`002_add_todos_start_date_index_candidate.sql.disabled`는 `.disabled` 상태로 유지, 적용하지 않음)
- 판단 근거: 타겟 유저는 4,000건이라는, 향후 실사용 규모(1인당 수십~수백 건)보다 훨씬 큰 더미 데이터임에도 `owner_id`(+`is_completed`) 단계에서 이미 2000~3000건으로 충분히 좁혀지고, `start_date` 조건의 `Filter` 처리로 인한 추가 비용이 1ms 내외에 불과하다. 1인 개발·2일 MVP 규모에서 이 정도의 미세한 성능 차이를 위해 인덱스(및 쓰기 성능 저하, 저장공간 증가)를 추가하는 것은 실익 대비 복잡도가 크다고 판단한다. 데이터 규모가 사용자당 수만 건 이상으로 커지는 시점에 재검토를 권장한다.

### TC-DB6-7 (조건부): 추가 인덱스 적용 후 재검증

실행 조건: TC-DB6-6에서 "적용 권장"으로 판단되어 실제로 `002_add_todos_start_date_index_candidate.sql`
(활성화된 마이그레이션)이 적용된 경우에만 수행한다. "불필요"로 판단된 경우 본 TC는 건너뛴다(N/A로 기록).

절차:
1. 인덱스가 실제로 생성되었는지 확인한다.
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'todos';
   ```
2. TC-DB6-4, TC-DB6-5의 `EXPLAIN ANALYZE` 쿼리를 동일한 `<target_uuid>`로 재실행한다.
3. 재실행 결과에서 `start_date` 조건이 이제 `Index Cond`(또는 신규 인덱스를 활용하는 `Index Scan`
   / `Bitmap Index Scan`)로 처리되어 `Filter` 단계의 `Rows Removed by Filter`가 감소했는지,
   actual time이 개선되었는지 확인한다.

기록: **N/A** — TC-DB6-6에서 "추가 인덱스 불필요"로 판단되어 본 TC는 실행하지 않았다.

---

## 4. Cleanup

TC-DB6-1 ~ TC-DB6-7 실행 후, `database/tests/db-6-seed-benchmark.sql` 하단에 정의된 정리(DELETE/DROP)
SQL을 그대로 실행해 벤치마크 데이터를 원상 복구한다. 본 문서에서는 별도의 cleanup SQL을 재작성하지
않고 해당 파일의 정리 절차를 참조하는 것으로 대체한다. TC-DB6-7이 실행되어 신규 인덱스가 생성된
경우, 최종적으로 그 인덱스를 유지할지(운영 반영) 여부는 BE-6 착수 전 오케스트레이터가 별도로 결정한다
(본 검증 자체의 cleanup 대상은 아니다).

---

## 5. 최종 확정 인덱스 목록 (BE-6 참고자료)

벤치마크(타겟 유저 4,000건 / 전체 50,000건 규모) 결과, **기존 3개 인덱스를 그대로 유지**하며 추가
인덱스는 도입하지 않는다.

| 인덱스명 | 컬럼 | 용도 |
|---|---|---|
| `idx_todos_owner_id` | `owner_id` | 단독 owner 조회(TC-DB6-1), owner+category 조합(TC-DB6-2)에서 활용 |
| `idx_todos_category_id` | `category_id` | owner+category 조합 조회(TC-DB6-2)에서 `idx_todos_owner_id`와 BitmapAnd로 결합 |
| `idx_todos_owner_completed_end_date` | `owner_id, is_completed, end_date` | 기한초과(TC-DB6-3에서는 미사용, `idx_todos_owner_id`가 선택됨)·시작전/진행중(TC-DB6-4/5) 조회에서 `owner_id`+`is_completed`(+`end_date`)까지 커버 |

BE-6 구현 시 참고사항:
- 목록 조회 리포지토리 쿼리는 `owner_id`를 항상 WHERE 절 최우선 조건으로 두고, `category_id`/
  `is_completed`/`end_date`/`start_date` 필터는 있는 경우에만 추가하는 형태로 작성하면 된다 —
  옵티마이저가 데이터 분포에 따라 적절한 인덱스를 자동 선택하므로 쿼리 힌트나 인덱스 강제 지정은
  불필요하다.
- "시작 전/진행중" 필터에서 `start_date` 조건이 `Filter`로 처리되는 것은 정상이며, 현재 규모에서는
  성능에 영향이 없으므로 별도 조치가 필요 없다.
- 사용자당 todos가 수만 건 규모로 커지는 시점에는 `002_add_todos_start_date_index_candidate.sql.disabled`
  재검토를 권장한다.

## 6. 완료조건 커버리지 매핑

| DB-6 완료조건 (원문) | 매핑 TC |
|---|---|
| 대표 쿼리 3종(단독 owner, owner+category, 기한초과 조건)에 대해 `EXPLAIN ANALYZE`를 실행하고 기록했다 | TC-DB6-1, TC-DB6-2, TC-DB6-3 |
| 인덱스 스캔 사용 여부(또는 Seq Scan 사유)를 확인했다 | TC-DB6-1, TC-DB6-2, TC-DB6-3 |
| "시작 전/진행중" 필터에 `start_date` 인덱스 커버리지 부족 여부를 확인하고 추가 여부를 판단했다 | TC-DB6-4, TC-DB6-5, TC-DB6-6 (적용 시 TC-DB6-7, 이번엔 N/A) |
| 최종 인덱스 목록을 BE-6(목록 조회 쿼리) 참고 자료로 정리했다 | 위 5절 "최종 확정 인덱스 목록" |
