/**
 * GET /health 엔드포인트 최소 통합 테스트 (BE-1)
 *
 * DB 연결(verifyConnection)에는 의존하지 않도록 createApp()만 사용해 임시 포트로 기동한다.
 * 별도 HTTP 클라이언트 라이브러리 없이 Node 내장 http 모듈로 직접 요청한다.
 */
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('./app');

test('GET /health는 200과 { status: "ok" }를 반환한다', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();

    const { statusCode, body } = await new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}/health`, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body: data });
          });
        })
        .on('error', reject);
    });

    assert.strictEqual(statusCode, 200);
    assert.deepStrictEqual(JSON.parse(body), { status: 'ok' });
  } finally {
    server.close();
  }
});
