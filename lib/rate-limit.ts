import "server-only";

// 짧은 시간에 너무 많이 시도하는 것을 막는 간단한 제한 (서버 메모리에 기록)
// 서버가 재시작되면 기록이 사라지는 '보조' 장치. 주된 방어는 추측 불가능한 8자리 코드
const hits = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
