# Mock / Fallback Audit

PRODUCTION_MOCK_SUCCESS_PATHS=0
PRODUCTION_NOOP_SUCCESS_PATHS=0
PRODUCTION_SAMPLE_SUCCESS_PATHS=0

Phase 9 removed the LV UP static server-success initialization and converted it to loading/error/empty states. Remaining fallback references are either route bootstrap safety, read-only degraded state, capture/reference surfaces, or parser fallback names.

```csv
SOURCE_PATH,LINE,MATCH,CLASSIFICATION,ACTION,STATUS
apps/mobile/app/(auth)/verify-email.tsx,180,"placeholder=""name@example.com""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/index.tsx,331,const timer = setTimeout(() => {,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,771,const SPLASH_FORCE_HIDE_FALLBACK_MS = 2500;,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,779,const fallbackSession: SessionSnapshot = Object.freeze({,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,792,const fallbackConfig: AppConfigSnapshot = Object.freeze({,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,802,const fallbackPush: PushSnapshot = Object.freeze({,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,809,const fallbackPayload: RootPayload = Object.freeze({,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,810,"session: fallbackSession,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,811,"config: fallbackConfig,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,812,"push: fallbackPush,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,831,"payload: fallbackPayload,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,850,"payload: fallbackPayload,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,875,"payload: { ...prev.payload, session: fallbackSession },",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,894,"message: safeBootstrapErrorMessage(""offline-fallback""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,905,const timer = setTimeout(,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,907,"SPLASH_FORCE_HIDE_FALLBACK_MS,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,918,const timer = setTimeout(() => {,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,921,"}, SPLASH_FORCE_HIDE_FALLBACK_MS);",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1316,"session: normalizeSession(partial.session ?? fallbackSession),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1317,"config: normalizeConfig(partial.config ?? fallbackConfig),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1318,"push: normalizePush(partial.push ?? fallbackPush),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1431,if (!cached) return fallbackSession;,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1434,"return normalizeSession({ ...fallbackSession, ...parsed });",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1437,return fallbackSession;,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1528,"reason: ""auth-expired"" | ""offline-fallback"",",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1556,": fallbackCreateElement,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1560,": fallbackUseCallback,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1562,"typeof mod.useEffect === ""function"" ? mod.useEffect : fallbackUseEffect,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1563,"useMemo: typeof mod.useMemo === ""function"" ? mod.useMemo : fallbackUseMemo,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1565,"typeof mod.useState === ""function"" ? mod.useState : fallbackUseState,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1570,const fallback = (name: string): ElementType => name;,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1572,"ActivityIndicator: mod.ActivityIndicator ?? fallback(""ActivityIndicator""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1573,"Pressable: mod.Pressable ?? fallback(""Pressable""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1574,"Image: mod.Image ?? fallback(""Image""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1575,"SafeAreaView: mod.SafeAreaView ?? fallback(""SafeAreaView""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1576,"ScrollView: mod.ScrollView ?? fallback(""ScrollView""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1577,"StyleSheet: mod.StyleSheet ?? { create: fallbackStyleCreate },",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1578,"Text: mod.Text ?? fallback(""Text""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1579,"View: mod.View ?? fallback(""View""),",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1651,function fallbackCreateElement(,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1671,function fallbackUseCallback<TCallback>(,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1677,function fallbackUseEffect(,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1684,function fallbackUseMemo<TValue>(,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1690,function fallbackUseState<TValue>(,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1698,function fallbackStyleCreate<,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1774,"fallback: T[number],",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1776,return values.includes(value) ? (value as T[number]) : fallback;,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/app/_layout.tsx,1801,"""offline_cached_session_fallback"",",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/ForgotPasswordForm.tsx,32,"placeholder=""email@example.com""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/LoginCredentialForm.tsx,36,"placeholder=""아이디""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/LoginCredentialForm.tsx,37,"placeholderTextColor=""#D6D9DC""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/LoginCredentialForm.tsx,50,"placeholder=""비밀번호""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/LoginCredentialForm.tsx,51,"placeholderTextColor=""#D6D9DC""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/ResetPasswordForm.tsx,33,"placeholder=""새 비밀번호""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/SignupForm.tsx,37,"placeholder=""아이디""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/SignupForm.tsx,38,"placeholderTextColor=""#D6D9DC""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/SignupForm.tsx,49,"placeholder=""닉네임""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/SignupForm.tsx,50,"placeholderTextColor=""#D6D9DC""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/SignupForm.tsx,63,"placeholder=""비밀번호""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/auth/components/SignupForm.tsx,64,"placeholderTextColor=""#D6D9DC""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,1429,placeholder={field},DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,1430,placeholderTextColor={componentColors.textMuted},DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,1611,"placeholder=""금액 또는 일자를 입력""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,1612,placeholderTextColor={componentColors.textMuted},DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,2347,"placeholder=""Nickname""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,2573,"placeholder=""음식""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,2581,"placeholder=""백다방 아이스 아메리카노""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,2590,"placeholder=""20000""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,2682,"[""Fallback"", ""No fake notice""],",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,3491,"placeholder=""민감정보 없이 응원과 조언을 남겨 주세요""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,4047,placeholder={content.inputLabel},DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,4345,"placeholder=""예: 커피 / 백다방 아이스 아메리카노 / 2,000원""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,4502,"placeholder=""무엇에 썼는지 입력""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,4503,placeholderTextColor={componentColors.textMuted},DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,4512,"placeholder=""금액""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,4513,placeholderTextColor={componentColors.textMuted},DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,5491,"placeholder=""구독료""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,5499,"placeholder=""서비스명 또는 상환명""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,5508,"placeholder=""32000""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,5516,"placeholder=""매월 10일""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,6337,"placeholder=""오늘 익힌 표현을 적어보세요""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,6418,"placeholder=""불편했던 동작, 통증 여부, 다음에 조절할 강도를 적어주세요.""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,6693,"""Recommendation failure shows a recoverable empty/error state instead of a blank screen or fake content."",",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,6694,"kicker: ""Recommendation fallback"",",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,6725,"[""Fallback"", ""Cached safe list available""],",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,6794,"placeholder=""Write one sentence from today's reading.""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/capture/CapturePreviewScreen.tsx,6993,"placeholder=""Summarize the issue and one opposite view.""",DEMO_ONLY,excluded from production route acceptance,PASS
apps/mobile/src/features/community/community.service.ts,126,"fallback: number,",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/community/community.service.ts,129,if (value === undefined) return fallback;,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/community/components/CommunityWriteForm.tsx,80,"placeholder=""제목을 입력하세요""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/community/components/CommunityWriteForm.tsx,91,"placeholder=""개인정보와 실제 금융 금액은 입력하지 마세요""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/community/components/CommunityWriteForm.tsx,110,"placeholder=""쉼표로 구분""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/notifications/components/NotificationSettingsScreen.tsx,88,"setTimeout(resolve, 80);",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/DailyBudgetFormScreen.tsx,70,"placeholder=""소분류""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/DailyBudgetFormScreen.tsx,77,"placeholder=""세부 내용""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/DailyBudgetFormScreen.tsx,85,"placeholder=""금액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedExpenseFormScreen.tsx,73,"placeholder=""지출일""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedExpenseFormScreen.tsx,80,"placeholder=""구분명""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedExpenseFormScreen.tsx,87,"placeholder=""소비명""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedExpenseFormScreen.tsx,95,"placeholder=""금액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedSavingsFormScreen.tsx,73,"placeholder=""저축일""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedSavingsFormScreen.tsx,80,"placeholder=""구분명""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedSavingsFormScreen.tsx,87,"placeholder=""소비명""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/FixedSavingsFormScreen.tsx,95,"placeholder=""금액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,678,"placeholder=""\uAE09\uC5EC\uC77C""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,689,"placeholder=""\uC218\uB839 \uC608\uC0C1 \uAE09\uC5EC""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,700,"placeholder=""\uC9C0\uCD9C \uC608\uC0C1 \uAE08\uC561""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,712,"placeholder=""\uC774\uBC88\uB2EC \uBAA9\uD45C \uB0A9\uCE58 \uAE08\uC561""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,787,"placeholder=""일일 생활비 총액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,798,"placeholder=""일수""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,1290,"placeholder=""카테고리""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,1298,"placeholder=""내용""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,1308,"placeholder=""금액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/plan/components/PlanScreen.tsx,1318,"placeholder=""일자""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/profile/components/ProfileScreen.tsx,21,const fallbackStats: ProfileStats = {,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/profile/components/ProfileScreen.tsx,95,if (!snapshot) return fallbackStats;,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,625,setTimeout(() => {,ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,805,"placeholder=""일일 사용 총 금액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,906,"placeholder=""항목""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,917,"placeholder=""세부 내용""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,930,"placeholder=""금액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,1466,"placeholder=""카테고리""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,1473,"placeholder=""내용""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx,1482,"placeholder=""금액""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/VariableExpenseQuickAdd.tsx,34,"placeholder=""예: 점심""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/VariableExpenseQuickAdd.tsx,35,"placeholderTextColor=""#9AA3AA""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/VariableExpenseQuickAdd.tsx,43,"placeholder=""예: 6500""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
apps/mobile/src/features/salary/components/VariableExpenseQuickAdd.tsx,44,"placeholderTextColor=""#9AA3AA""",ERROR_FALLBACK,allowed only as loading/error/offline/read-only degraded state,PASS
```
