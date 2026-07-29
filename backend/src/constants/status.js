/**
 * 할일(Todo) 상태 4종 상수 (도메인 정의서 4장)
 *
 * 상태는 DB에 저장하지 않고 조회 시점에 파생 계산한다(services 레이어 담당).
 * 여기서는 매직 문자열을 방지하기 위한 상수 정의만 둔다.
 */
const TODO_STATUS = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
});

module.exports = { TODO_STATUS };
