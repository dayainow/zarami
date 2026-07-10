import { Metadata } from "next";
import { ResumeClient } from "@/components/profile/ResumeClient";

export const metadata: Metadata = {
  title: "이력서 / 포트폴리오 - Zarami",
  description: "Zarami 테크트리 기반 자동 생성 이력서",
};

export default function ResumePage() {
  return <ResumeClient />;
}
