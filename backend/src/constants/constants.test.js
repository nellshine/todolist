/**
 * 상수 모듈 최소 단위 테스트 (BE-1)
 *
 * 도메인 정의서 4장(상태 4종)과 5장(기본 카테고리명)의 값과 일치하는지 확인한다.
 */
const test = require('node:test');
const assert = require('node:assert');
const { TODO_STATUS } = require('./status');
const { DEFAULT_CATEGORY_NAME } = require('./category');

test('TODO_STATUS는 도메인 정의서 4장의 상태 4종 값을 가진다', () => {
  assert.strictEqual(TODO_STATUS.NOT_STARTED, 'NOT_STARTED');
  assert.strictEqual(TODO_STATUS.IN_PROGRESS, 'IN_PROGRESS');
  assert.strictEqual(TODO_STATUS.COMPLETED, 'COMPLETED');
  assert.strictEqual(TODO_STATUS.OVERDUE, 'OVERDUE');
  assert.strictEqual(Object.keys(TODO_STATUS).length, 4);
});

test('TODO_STATUS 객체는 변경 불가능하다(Object.freeze)', () => {
  assert.strictEqual(Object.isFrozen(TODO_STATUS), true);
});

test('DEFAULT_CATEGORY_NAME은 도메인 정의서 5장 규칙과 일치하는 "기본"이다', () => {
  assert.strictEqual(DEFAULT_CATEGORY_NAME, '기본');
});
