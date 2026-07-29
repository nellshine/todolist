/**
 * 헬스체크 컨트롤러 (BE-1)
 *
 * 순수 liveness 체크만 담당한다. DB 상태 등 추가 정보는 포함하지 않는다(과설계 방지).
 */
function getHealth(req, res) {
  res.status(200).json({ status: 'ok' });
}

module.exports = { getHealth };
