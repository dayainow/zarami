/**
 * 학습 견적(예상 시간)을 유저 친화적인 감성 뱃지 문구로 변환합니다.
 * - 4시간 미만: N시간 (가볍게) 또는 N분 (가볍게)
 * - 4시간 ~ 12시간: N시간 (주말용)
 * - 12시간 이상: N일 (장기전)
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분 (가볍게)`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 4) {
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분 (가볍게)` : `${hours}시간 (가볍게)`;
  }

  if (hours < 12) {
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분 (주말용)` : `${hours}시간 (주말용)`;
  }

  const days = Math.max(1, Math.round(hours / 8));
  if (days >= 7) {
    const weeks = Math.round(days / 7);
    return `약 ${weeks}주 (장기전)`;
  }

  return `약 ${days}일 (장기전)`;
}
