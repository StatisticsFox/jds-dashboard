import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 캐릭터 이미지는 public이 아닌 프로젝트 폴더에 있으므로 배포 때 함께 포함되도록 지정
  outputFileTracingIncludes: {
    "/api/chongchong": ["./chongchong.jpg"],
  },
};

export default nextConfig;
