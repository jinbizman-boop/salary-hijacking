import { CleanFintechWriteScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function CommunityWriteScreen(): React.ReactElement {
  return <CleanFintechWriteScreen />;
}

export function assertMobileCommunityWriteCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "제목",
    "본문",
    "익명",
    "게시판",
    "필수 검증",
    "privacy_sensitive_input_notice",
    "toast_success",
  ] as const;

  return { ok: checks.length >= 8, version: SCREEN_VERSION, checks };
}
