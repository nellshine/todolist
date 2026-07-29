/**
 * config 모듈 최소 단위 테스트 (BE-1)
 *
 * .env 로드 시 필요한 값들이 채워지는지 확인한다.
 */
const test = require('node:test');
const assert = require('node:assert');
const config = require('./config');

test('config.port가 정의되어 있다', () => {
  assert.ok(config.port !== undefined && config.port !== null && config.port !== '');
});

test('config.postgresConnectionString이 정의되어 있다', () => {
  assert.ok(typeof config.postgresConnectionString === 'string' && config.postgresConnectionString.length > 0);
});

test('config.jwtSecret이 정의되어 있다', () => {
  assert.ok(typeof config.jwtSecret === 'string' && config.jwtSecret.length > 0);
});
