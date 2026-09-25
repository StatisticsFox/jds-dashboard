// 대시보드 캐릭터 '총총'. 로그인한 사람만 받을 수 있는 /api/chongchong 에서 불러옴
// 흰 동그라미 안에 넣어서 다크 모드에서도 스티커처럼 보이게 함
export function Mascot({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-accent/60 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* next/image는 서버가 이미지를 대신 받아 오는데, 그때는 로그인 쿠키가 없어서 일반 img 사용 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/api/chongchong" alt="총총" width={size} height={size} className="h-full w-full object-cover" />
    </span>
  );
}

// 캐릭터 볼의 노란 별
export function Star({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={`inline-block shrink-0 ${className}`}>
      <path
        d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
        fill="var(--star)"
        stroke="var(--star-edge)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
