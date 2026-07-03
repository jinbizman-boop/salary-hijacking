export const AUTH_PASSWORD_POLICY_MESSAGE =
  "비밀번호는 10자 이상이며 영문과 숫자를 모두 포함해야 합니다.";

export function isServerAuthPasswordCandidate(value: string): boolean {
  const password = value.trim();
  return (
    password.length >= 10 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
