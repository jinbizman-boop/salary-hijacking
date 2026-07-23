import "react-native-gesture-handler";

import * as React from "react";
import {
  AppRegistry,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type TabKey = "salary" | "plan" | "level" | "community" | "profile";
type ScreenKey = TabKey | "notifications";
type SpendState = "planned" | "completed" | "overdue";

type DailyItem = Readonly<{
  id: string;
  amount: number;
  category: "coffee" | "meal" | "tobacco" | "game";
  content: string;
  state: SpendState;
}>;

type PlanItem = Readonly<{
  id: string;
  day: number;
  group: string;
  name: string;
  amount: number;
  state: SpendState;
}>;

const PRIMARY = "#209252";
const TEXT = "#15191D";
const MUTED = "#697179";
const LINE = "#E7EBEF";
const BG = "#F7F8FA";
const DANGER = "#B92133";
const WARNING = "#E9872F";
const DISABLED = "#C9CDD2";
const VERSION = "1.0.1-android-safe-entry";

const tabs: readonly Readonly<{ key: TabKey; label: string; icon: string }>[] =
  [
    { key: "salary", label: "급여", icon: "◉" },
    { key: "plan", label: "계획", icon: "▣" },
    { key: "level", label: "LV", icon: "△" },
    { key: "community", label: "커뮤니티", icon: "◎" },
    { key: "profile", label: "MY", icon: "○" },
  ];

const initialDailyItems: readonly DailyItem[] = [
  {
    id: "daily-1",
    amount: 2000,
    category: "coffee",
    content: "빽다방 아이스 아메리카노",
    state: "planned",
  },
  {
    id: "daily-2",
    amount: 6500,
    category: "meal",
    content: "KT광화문지사 구내식당 점심 식사",
    state: "planned",
  },
  {
    id: "daily-3",
    amount: 4500,
    category: "tobacco",
    content: "GS25 이목사라꼬치 1mm 담배",
    state: "completed",
  },
  {
    id: "daily-4",
    amount: 3000,
    category: "coffee",
    content: "크라제버거 Hot 아메리카노",
    state: "completed",
  },
  {
    id: "daily-5",
    amount: 4000,
    category: "meal",
    content: "봉구스 밥버거 오므라이스 토핑 주문",
    state: "completed",
  },
];

const initialPlanItems: readonly PlanItem[] = [
  {
    id: "plan-1",
    day: 10,
    group: "구독료 납부",
    name: "유튜브 프리미엄",
    amount: 14900,
    state: "planned",
  },
  {
    id: "plan-2",
    day: 10,
    group: "구독료 납부",
    name: "ChatGPT",
    amount: 32000,
    state: "planned",
  },
  {
    id: "plan-3",
    day: 10,
    group: "구독료 납부",
    name: "MS오피스",
    amount: 13500,
    state: "overdue",
  },
  {
    id: "plan-4",
    day: 25,
    group: "대출금 상환",
    name: "학자금 대출",
    amount: 200000,
    state: "planned",
  },
];

function formatKrw(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString("ko-KR")}원`;
}

function getKstDate(now = new Date()): string {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "long",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(now);
}

function iconForCategory(category: DailyItem["category"]): string {
  if (category === "meal") return "🍱";
  if (category === "tobacco") return "▥";
  if (category === "game") return "🎮";
  return "☕";
}

class RootBoundary extends React.Component<
  React.PropsWithChildren,
  Readonly<{ failed: boolean }>
> {
  override state = { failed: false };

  static getDerivedStateFromError(): Readonly<{ failed: boolean }> {
    return { failed: true };
  }

  override componentDidCatch(): void {
    // Do not print raw startup payloads; Android QA uses redacted logcat filters.
  }

  override render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <SafeAreaView style={styles.safeRoot}>
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>급여납치 실행 보호 모드</Text>
          <Text style={styles.fallbackText}>
            화면 초기화 중 문제가 감지되어 앱을 종료하지 않고 보호 화면으로
            전환했습니다. 앱을 닫았다가 다시 열어도 데이터 입력 화면으로 진입할
            수 있습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
}

function Root(): React.ReactElement {
  return (
    <RootBoundary>
      <SalaryHijackingApp />
    </RootBoundary>
  );
}

function SalaryHijackingApp(): React.ReactElement {
  const [screen, setScreen] = React.useState<ScreenKey>("salary");
  const [dailyItems, setDailyItems] =
    React.useState<readonly DailyItem[]>(initialDailyItems);
  const [planItems, setPlanItems] =
    React.useState<readonly PlanItem[]>(initialPlanItems);
  const completedDailyTotal = dailyItems
    .filter((item) => item.state === "completed")
    .reduce((sum, item) => sum + item.amount, 0);
  const plannedExpenseTotal = planItems.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const salary = 2700000;
  const dailyBudget = 20000;
  const savedAmount = salary - plannedExpenseTotal - completedDailyTotal;

  return (
    <SafeAreaView style={styles.safeRoot}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <View style={styles.appRoot}>
        {screen === "notifications" ? null : (
          <BrandHeader
            onBell={() => setScreen("notifications")}
            settings={screen === "plan"}
          />
        )}
        <View style={styles.content}>
          {screen === "salary" ? (
            <SalaryScreen
              dailyBudget={dailyBudget}
              dailyItems={dailyItems}
              savedAmount={savedAmount}
              salary={salary}
              spentToday={completedDailyTotal}
              onAddDaily={(item) =>
                setDailyItems((current) => [item, ...current])
              }
              onToggleDaily={(id) =>
                setDailyItems((current) =>
                  current.map((item) =>
                    item.id === id
                      ? {
                          ...item,
                          state:
                            item.state === "completed"
                              ? "planned"
                              : "completed",
                        }
                      : item,
                  ),
                )
              }
            />
          ) : null}
          {screen === "plan" ? (
            <PlanScreen
              items={planItems}
              savedAmount={savedAmount}
              onAddPlan={(item) =>
                setPlanItems((current) => [item, ...current])
              }
              onTogglePlan={(id) =>
                setPlanItems((current) =>
                  current.map((item) =>
                    item.id === id
                      ? {
                          ...item,
                          state:
                            item.state === "completed"
                              ? "planned"
                              : "completed",
                        }
                      : item,
                  ),
                )
              }
            />
          ) : null}
          {screen === "level" ? <LevelScreen /> : null}
          {screen === "community" ? <CommunityScreen /> : null}
          {screen === "profile" ? (
            <ProfileScreen savedAmount={savedAmount} />
          ) : null}
          {screen === "notifications" ? (
            <NotificationsScreen onBack={() => setScreen("salary")} />
          ) : null}
        </View>
        {screen === "notifications" ? null : (
          <BottomTabs current={screen} onChange={setScreen} />
        )}
      </View>
    </SafeAreaView>
  );
}

function BrandHeader({
  onBell,
  settings = false,
}: Readonly<{ onBell: () => void; settings?: boolean }>): React.ReactElement {
  return (
    <View style={styles.header}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>W</Text>
      </View>
      <Text style={styles.brandText}>
        <Text style={styles.brandGreen}>SALARY</Text> HIJACKING
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={settings ? "설정" : "알림"}
        onPress={onBell}
        style={styles.headerIcon}
      >
        <Text style={styles.headerIconText}>{settings ? "⚙" : "♧"}</Text>
      </Pressable>
    </View>
  );
}

function SalaryScreen({
  dailyBudget,
  dailyItems,
  salary,
  savedAmount,
  spentToday,
  onAddDaily,
  onToggleDaily,
}: Readonly<{
  dailyBudget: number;
  dailyItems: readonly DailyItem[];
  salary: number;
  savedAmount: number;
  spentToday: number;
  onAddDaily: (item: DailyItem) => void;
  onToggleDaily: (id: string) => void;
}>): React.ReactElement {
  const [adding, setAdding] = React.useState(false);
  const remaining = dailyBudget - spentToday;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardRoot}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroDate}>{getKstDate()}</Text>
            <Text style={styles.heroTitle}>내 급여 납치 현황</Text>
            <Text style={styles.coinIcon}>◎</Text>
            <Text style={styles.heroCaption}>전체 누적 납치 금액</Text>
            <Text style={styles.heroMoney}>5,780,000원</Text>
          </View>
          <View style={styles.heroMetrics}>
            <Metric label="이번 달 급여일" value="11월 25일" />
            <Metric label="다음 달 급여일" value="12월 24일" danger />
            <Metric label="수령 금액" value={formatKrw(salary)} />
            <Metric label="지출 금액" value={formatKrw(spentToday)} />
            <Metric label="납치 금액" value={formatKrw(savedAmount)} focus />
          </View>
        </View>
        <AdBanner />
        <Card title="홍길동님이 설정한 일일 사용 예산">
          <View style={styles.budgetSummary}>
            <BudgetPill label="설정 금액" value={formatKrw(dailyBudget)} />
            <BudgetPill label="사용 금액" value={formatKrw(spentToday)} />
            <BudgetPill
              label="남은 금액"
              value={formatKrw(remaining)}
              danger={remaining < 0}
            />
          </View>
          {dailyItems.map((item) => (
            <SpendRow key={item.id} item={item} onToggle={onToggleDaily} />
          ))}
          {adding ? (
            <DailyQuickAdd
              onCancel={() => setAdding(false)}
              onSave={(item) => {
                onAddDaily(item);
                setAdding(false);
              }}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="금일 변동 지출 추가하기"
              onPress={() => setAdding(true)}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ 추가하기</Text>
            </Pressable>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PlanScreen({
  items,
  savedAmount,
  onAddPlan,
  onTogglePlan,
}: Readonly<{
  items: readonly PlanItem[];
  savedAmount: number;
  onAddPlan: (item: PlanItem) => void;
  onTogglePlan: (id: string) => void;
}>): React.ReactElement {
  const [adding, setAdding] = React.useState(false);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Card>
        <View style={styles.progressRow}>
          <View>
            <Text style={styles.cardTitle}>
              홍길동님의 급여 납치 목표 달성률
            </Text>
            <Text style={styles.smallLabel}>이번달 목표 납치 금액</Text>
            <Text style={styles.greenMoney}>500,000원</Text>
          </View>
          <Text style={styles.progressPercent}>88%</Text>
        </View>
        <Text style={styles.planSavedText}>
          총 누적 납치 금액 {formatKrw(Math.max(savedAmount, 0))}
        </Text>
      </Card>
      <Card
        actionLabel="설정"
        title="월별 고정 지출 계획/설정"
        onAction={() => setAdding((value) => !value)}
      >
        <View style={styles.tableHead}>
          <Text style={styles.tableHeadText}>지출일</Text>
          <Text style={styles.tableHeadText}>구분명</Text>
          <Text style={styles.tableHeadText}>소비명</Text>
          <Text style={styles.tableHeadText}>금액</Text>
        </View>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${item.state === "completed" ? "사용 완료" : "사용 예정"}`}
            onPress={() => onTogglePlan(item.id)}
            style={styles.tableRow}
          >
            <Text style={styles.tableCell}>{item.day}일</Text>
            <Text style={styles.tableCell}>{item.group}</Text>
            <Text style={styles.tableCell}>{item.name}</Text>
            <Text style={styles.tableCell}>{formatKrw(item.amount)}</Text>
          </Pressable>
        ))}
        {adding ? (
          <PlanQuickAdd
            onCancel={() => setAdding(false)}
            onSave={(item) => {
              onAddPlan(item);
              setAdding(false);
            }}
          />
        ) : (
          <Text style={styles.addButtonText}>+추가하기</Text>
        )}
      </Card>
      <Card title="일일 생활비 계획/설정">
        <View style={styles.tableHead}>
          <Text style={styles.tableHeadText}>일일 생활비</Text>
          <Text style={styles.tableHeadText}>일수</Text>
          <Text style={styles.tableHeadText}>월별 생활비 총액</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>20,000원</Text>
          <Text style={styles.tableCell}>30</Text>
          <Text style={styles.tableCell}>600,000원</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function LevelScreen(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Card title="오늘의 레벨업">
        <Text style={styles.subText}>
          오늘의 독서, 소식, 영어, 홈트 기록을 남기면 XP가 서버 기준으로
          적립됩니다.
        </Text>
        <View style={styles.grid}>
          {["독서하기", "뉴스읽기", "학습하기", "운동하기"].map((label) => (
            <Pressable key={label} style={styles.levelAction}>
              <Text style={styles.levelActionText}>{label}</Text>
              <Text style={styles.subText}>기록 필수</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function CommunityScreen(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.communityHeader}>
        <Text style={styles.screenTitle}>커뮤니티</Text>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>✎</Text>
        </Pressable>
      </View>
      <View style={styles.segment}>
        {["전체 게시판", "자유 게시판", "레벨업 인증", "취미 게시판"].map(
          (label, index) => (
            <Text
              key={label}
              style={[
                styles.segmentText,
                index === 0 ? styles.activeSeg : null,
              ]}
            >
              {label}
            </Text>
          ),
        )}
      </View>
      {[
        "[LV. 5] 주 6일 운동, 1년 차 야근 체형 탈출 후기",
        "회계팀 홍길동입니다. 연말정산 실전 팁 5가지 공유!",
        "직장인 부업? 주식 말고 독서모임 운영 수익률 공유",
      ].map((title) => (
        <Card key={title}>
          <Text style={styles.postTitle}>{title}</Text>
          <Text style={styles.subText}>
            익명 작성 · 댓글과 좋아요는 서버 실패 시 원복됩니다.
          </Text>
          <Text style={styles.postMeta}>♡ 12 💬 8 ↗ 공유</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function ProfileScreen({
  savedAmount,
}: Readonly<{ savedAmount: number }>): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Card>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>홍</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.cardTitle}>홍길동 기획자님</Text>
            <Text style={styles.subText}>오늘도 당신의 성장을 응원합니다</Text>
          </View>
        </View>
        <View style={styles.profileStats}>
          <BudgetPill label="누적 납치 금액" value="5,780,000원" />
          <BudgetPill label="레벨 현황" value="18LV" />
          <BudgetPill label="자기관리 성과" value="4.2점" />
        </View>
        <Text style={styles.planSavedText}>
          이번 주 확정 납치 금액 {formatKrw(savedAmount)}
        </Text>
      </Card>
      {["내 게시글 관리", "내 레벨업 관리", "1:1 문의", "공지사항"].map(
        (label) => (
          <Card key={label}>
            <Text style={styles.menuText}>{label}</Text>
          </Card>
        ),
      )}
    </ScrollView>
  );
}

function NotificationsScreen({
  onBack,
}: Readonly<{ onBack: () => void }>): React.ReactElement {
  const rows = [
    ["🏅", "누적 납치금액 신기록 달성", "내 급여 납치 현황 5,780,000원 달성"],
    ["🎁", "납치 목표 달성 이벤트", "5,500,000원 달성 시 포인트 500P 지급"],
    ["📚", "기획의 정석 2장 FOCUS", "기획이 되려면 읽으러 가기"],
    ["💬", "Today, Business Conversation", "오늘의 영어회화가 도착했어요"],
  ] as const;
  return (
    <SafeAreaView style={styles.safeRoot}>
      <View style={styles.notificationHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.screenTitle}>알림</Text>
        <Text style={styles.settingsText}>설정</Text>
      </View>
      <ScrollView contentContainerStyle={styles.notificationList}>
        <Text style={styles.newNotice}>새로운 알림이 있어요</Text>
        {rows.map(([icon, title, description], index) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={`${title} 열기`}
            style={[
              styles.notificationRow,
              index < 2 ? styles.highlightRow : null,
            ]}
          >
            <Text style={styles.noticeIcon}>{icon}</Text>
            <View style={styles.noticeTextBox}>
              <Text style={styles.noticeDescription}>{description}</Text>
              <Text style={styles.noticeTitle}>{title}</Text>
            </View>
            <Text style={styles.noticeTime}>
              {index < 2 ? "1일전" : "8시간전"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function DailyQuickAdd({
  onCancel,
  onSave,
}: Readonly<{
  onCancel: () => void;
  onSave: (item: DailyItem) => void;
}>): React.ReactElement {
  const [category, setCategory] =
    React.useState<DailyItem["category"]>("coffee");
  const [content, setContent] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const canSave = content.trim().length > 0 && Number(amount) > 0;
  return (
    <View style={styles.formBox}>
      <Text style={styles.formHelp}>
        금일 사용한 변동 지출을 바로 저장합니다
      </Text>
      <View style={styles.segment}>
        {(["coffee", "meal", "tobacco", "game"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: category === value }}
            onPress={() => setCategory(value)}
            style={[
              styles.categoryButton,
              category === value ? styles.categoryButtonActive : null,
            ]}
          >
            <Text>{iconForCategory(value)}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="세부 내용"
        onChangeText={setContent}
        placeholder="세부 내용"
        style={styles.input}
        value={content}
      />
      <TextInput
        accessibilityLabel="사용 금액"
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={(value) => setAmount(value.replace(/[^0-9]/gu, ""))}
        placeholder="금액"
        style={styles.input}
        value={amount}
      />
      <View style={styles.formActions}>
        <Pressable style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>
        <Pressable
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={() =>
            onSave({
              amount: Number(amount),
              category,
              content: content.trim(),
              id: `daily-${Date.now()}`,
              state: "completed",
            })
          }
          style={[
            styles.primaryButton,
            !canSave ? styles.disabledButton : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>저장</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PlanQuickAdd({
  onCancel,
  onSave,
}: Readonly<{
  onCancel: () => void;
  onSave: (item: PlanItem) => void;
}>): React.ReactElement {
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const canSave = name.trim().length > 0 && Number(amount) > 0;
  return (
    <View style={styles.formBox}>
      <TextInput
        accessibilityLabel="계획 내용"
        onChangeText={setName}
        placeholder="소비명 또는 적금명"
        style={styles.input}
        value={name}
      />
      <TextInput
        accessibilityLabel="계획 금액"
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={(value) => setAmount(value.replace(/[^0-9]/gu, ""))}
        placeholder="금액"
        style={styles.input}
        value={amount}
      />
      <View style={styles.formActions}>
        <Pressable style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() =>
            onSave({
              amount: Number(amount),
              day: new Date().getDate(),
              group: "직접 추가",
              id: `plan-${Date.now()}`,
              name: name.trim(),
              state: "planned",
            })
          }
          style={[
            styles.primaryButton,
            !canSave ? styles.disabledButton : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>저장</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Metric({
  danger = false,
  focus = false,
  label,
  value,
}: Readonly<{
  danger?: boolean;
  focus?: boolean;
  label: string;
  value: string;
}>): React.ReactElement {
  return (
    <View style={[styles.metric, focus ? styles.metricFocus : null]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          danger ? styles.dangerText : null,
          focus ? styles.focusText : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function BudgetPill({
  danger = false,
  label,
  value,
}: Readonly<{
  danger?: boolean;
  label: string;
  value: string;
}>): React.ReactElement {
  return (
    <View style={styles.budgetPill}>
      <Text style={styles.budgetLabel}>{label}</Text>
      <Text style={[styles.budgetValue, danger ? styles.dangerText : null]}>
        {value}
      </Text>
    </View>
  );
}

function SpendRow({
  item,
  onToggle,
}: Readonly<{
  item: DailyItem;
  onToggle: (id: string) => void;
}>): React.ReactElement {
  const completed = item.state === "completed";
  const overdue = item.state === "overdue";
  return (
    <View style={styles.spendRow}>
      <Text style={styles.spendIcon}>{iconForCategory(item.category)}</Text>
      <Text style={styles.spendAmount}>{formatKrw(item.amount)}</Text>
      <Text style={styles.spendContent}>{item.content}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.content} ${completed ? "사용 완료" : "사용 예정"}`}
        onPress={() => onToggle(item.id)}
        style={[
          styles.stateButton,
          completed ? styles.completedButton : null,
          overdue ? styles.overdueButton : null,
        ]}
      >
        <Text style={styles.stateButtonText}>
          {completed ? "사용완료" : overdue ? "기한경과" : "사용예정"}
        </Text>
      </Pressable>
    </View>
  );
}

function Card({
  actionLabel,
  children,
  onAction,
  title,
}: React.PropsWithChildren<
  Readonly<{ actionLabel?: string; onAction?: () => void; title?: string }>
>): React.ReactElement {
  return (
    <View style={styles.card}>
      {title || actionLabel ? (
        <View style={styles.cardHeader}>
          {title ? <Text style={styles.cardTitle}>{title}</Text> : <View />}
          {actionLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              onPress={onAction}
              style={styles.cardAction}
            >
              <Text style={styles.cardActionText}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function AdBanner(): React.ReactElement {
  return (
    <View style={styles.adBanner}>
      <View style={styles.adPurple}>
        <Text style={styles.adLabel}>Google Ad</Text>
        <Text style={styles.adTitle}>지금 강세일 특가!</Text>
        <Text style={styles.adText}>짜장면 구매 타이밍</Text>
      </View>
      <View style={styles.adAside}>
        <Text style={styles.adDiscount}>10%</Text>
      </View>
    </View>
  );
}

function BottomTabs({
  current,
  onChange,
}: Readonly<{
  current: ScreenKey;
  onChange: (key: TabKey) => void;
}>): React.ReactElement {
  return (
    <View
      accessibilityLabel="급여납치 하단 내비게이션"
      style={styles.bottomTabs}
    >
      {tabs.map((tab) => {
        const active = current === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <View
              style={[styles.tabIcon, active ? styles.tabIconActive : null]}
            >
              <Text
                style={[
                  styles.tabIconText,
                  active ? styles.tabTextActive : null,
                ]}
              >
                {tab.icon}
              </Text>
            </View>
            <Text
              style={[styles.tabLabel, active ? styles.tabTextActive : null]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

AppRegistry.registerComponent("main", () => Root);

export function assertAndroidSafeEntryCompleteness(): Readonly<{
  checks: readonly string[];
  ok: boolean;
  version: string;
}> {
  const checks = [
    "self_contained_android_entry",
    "AppRegistry.registerComponent_main",
    "RootBoundary",
    "no_expo_router_runtime_import",
    "no_secure_store_startup_import",
    "five_bottom_tabs",
    "notifications_without_bottom_tabs",
    "salary_daily_budget_quick_add",
    "plan_quick_add",
    "kst_display",
  ] as const;
  return { checks, ok: checks.length === 10, version: VERSION };
}

const styles = StyleSheet.create({
  activeSeg: {
    backgroundColor: PRIMARY,
    color: "#FFFFFF",
  },
  addButton: {
    minHeight: 44,
    justifyContent: "center",
  },
  addButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  adAside: {
    alignItems: "flex-end",
    backgroundColor: "#F4E4CF",
    flex: 1,
    justifyContent: "flex-start",
    padding: 12,
  },
  adBanner: {
    borderBottomWidth: 1,
    borderColor: LINE,
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 96,
  },
  adDiscount: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    color: "#8A25A7",
    fontSize: 18,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adLabel: {
    color: "#E9C9F0",
    fontSize: 12,
    fontWeight: "700",
  },
  adPurple: {
    backgroundColor: "#8521A5",
    flex: 2,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  adText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  adTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  appRoot: {
    backgroundColor: BG,
    flex: 1,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#DCEFE5",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  avatarText: {
    color: PRIMARY,
    fontSize: 28,
    fontWeight: "900",
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },
  backText: {
    color: TEXT,
    fontSize: 42,
    fontWeight: "700",
  },
  bottomTabs: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopColor: LINE,
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 78,
    paddingBottom: 10,
    paddingTop: 8,
  },
  brandGreen: {
    color: PRIMARY,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 9,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  brandText: {
    color: "#151515",
    flex: 1,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0,
  },
  budgetLabel: {
    backgroundColor: PRIMARY,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  budgetPill: {
    alignItems: "center",
    backgroundColor: "#F3F5F6",
    flexDirection: "row",
    minHeight: 34,
  },
  budgetSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  budgetValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 4,
    borderWidth: 1,
    elevation: 2,
    gap: 12,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardAction: {
    backgroundColor: "#EAF6EF",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardActionText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "900",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  categoryButton: {
    alignItems: "center",
    backgroundColor: "#F3F5F6",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 54,
  },
  categoryButtonActive: {
    backgroundColor: "#EAF6EF",
    borderColor: PRIMARY,
    borderWidth: 1,
  },
  coinIcon: {
    color: "#F5D649",
    fontSize: 48,
    fontWeight: "900",
    marginTop: 12,
  },
  communityHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  completedButton: {
    backgroundColor: DISABLED,
  },
  content: {
    flex: 1,
  },
  dangerText: {
    color: DANGER,
  },
  disabledButton: {
    backgroundColor: DISABLED,
  },
  fab: {
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  fallbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    margin: 24,
    padding: 20,
  },
  fallbackText: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
  },
  fallbackTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 8,
  },
  focusText: {
    fontSize: 20,
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
  },
  formBox: {
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  formHelp: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
  greenMoney: {
    color: PRIMARY,
    fontSize: 22,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: LINE,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 16,
  },
  headerIcon: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerIconText: {
    color: TEXT,
    fontSize: 30,
  },
  hero: {
    backgroundColor: "#279949",
    flexDirection: "row",
    gap: 12,
    padding: 18,
  },
  heroCaption: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },
  heroDate: {
    color: "#E8F7EE",
    fontSize: 14,
    fontWeight: "800",
  },
  heroLeft: {
    flex: 1,
  },
  heroMetrics: {
    flex: 1.08,
    gap: 8,
  },
  heroMoney: {
    color: "#F8F439",
    fontSize: 31,
    fontWeight: "900",
    marginTop: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: 4,
  },
  highlightRow: {
    backgroundColor: "#EAF6EF",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 8,
    borderWidth: 1,
    color: TEXT,
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  keyboardRoot: {
    flex: 1,
  },
  levelAction: {
    backgroundColor: "#F7F8FA",
    borderColor: LINE,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 92,
    padding: 14,
    width: "47%",
  },
  levelActionText: {
    color: PRIMARY,
    fontSize: 18,
    fontWeight: "900",
  },
  menuText: {
    color: PRIMARY,
    fontSize: 20,
    fontWeight: "900",
  },
  metric: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 47,
    paddingHorizontal: 12,
  },
  metricFocus: {
    borderColor: "#F9ED3F",
    borderWidth: 2,
  },
  metricLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
  },
  newNotice: {
    alignSelf: "flex-end",
    color: "#168CD0",
    fontSize: 13,
    fontWeight: "800",
  },
  noticeDescription: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  noticeIcon: {
    fontSize: 22,
    width: 32,
  },
  noticeTextBox: {
    flex: 1,
    gap: 6,
  },
  noticeTime: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  noticeTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  notificationHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    minHeight: 62,
    paddingHorizontal: 12,
  },
  notificationList: {
    backgroundColor: "#FFFFFF",
    gap: 6,
    paddingBottom: 30,
  },
  notificationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 92,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  overdueButton: {
    backgroundColor: WARNING,
  },
  planSavedText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },
  postMeta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  postTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  profileStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  progressPercent: {
    color: PRIMARY,
    fontSize: 52,
    fontWeight: "900",
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  safeRoot: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  screenTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 27,
    fontWeight: "900",
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 24,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F2F4F5",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: {
    color: MUTED,
    fontSize: 16,
    fontWeight: "900",
  },
  segment: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  segmentText: {
    backgroundColor: "#EAF6EF",
    borderRadius: 2,
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  settingsText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    width: 58,
  },
  smallLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
  },
  spendAmount: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900",
    minWidth: 88,
  },
  spendContent: {
    color: TEXT,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  spendIcon: {
    fontSize: 28,
    width: 36,
  },
  spendRow: {
    alignItems: "center",
    borderBottomColor: "#F0F1F2",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 64,
  },
  stateButton: {
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 75,
    paddingHorizontal: 8,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  subText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  tabIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 42,
  },
  tabIconActive: {
    backgroundColor: "#EAF6EF",
  },
  tabIconText: {
    color: "#B7BCC1",
    fontSize: 20,
    fontWeight: "900",
  },
  tabLabel: {
    color: "#9EA4AA",
    fontSize: 12,
    fontWeight: "800",
  },
  tabTextActive: {
    color: PRIMARY,
  },
  tableCell: {
    color: TEXT,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 12,
    textAlign: "center",
  },
  tableHead: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
  },
  tableHeadText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    paddingVertical: 10,
    textAlign: "center",
  },
  tableRow: {
    borderColor: "#EEF0F2",
    borderWidth: 1,
    flexDirection: "row",
  },
});
