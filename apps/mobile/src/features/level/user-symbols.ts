import type { GrowthGoalDomain, GrowthGoalIcon } from "./goal-architecture";

export const USER_SYMBOL_RESOLUTION_PRIORITY = [
  "USER_SELECTED",
  "CATEGORY_DEFAULT",
  "KEYWORD_AUTO_SUGGESTION",
  "GENERIC_FALLBACK",
] as const;

export type UserSymbolCategory = Readonly<{
  title: string;
  aliases: readonly string[];
  items: readonly GrowthGoalIcon[];
}>;

export const USER_SYMBOL_SYSTEM_ICON_CATEGORIES = [
  {
    title: "성장",
    aliases: ["목표", "완료", "성과", "성장", "습관"],
    items: [
      { iconKey: "target", iconType: "SYSTEM_ICON" },
      { iconKey: "star", iconType: "SYSTEM_ICON" },
      { iconKey: "check", iconType: "SYSTEM_ICON" },
      { iconKey: "activity", iconType: "SYSTEM_ICON" },
    ],
  },
  {
    title: "공부",
    aliases: ["독서", "책", "공부", "기록", "글쓰기"],
    items: [
      { iconKey: "book-open", iconType: "SYSTEM_ICON" },
      { iconKey: "writing", iconType: "SYSTEM_ICON" },
      { iconKey: "languages", iconType: "SYSTEM_ICON" },
      { iconKey: "newspaper", iconType: "SYSTEM_ICON" },
    ],
  },
  {
    title: "건강",
    aliases: ["운동", "헬스", "건강", "러닝", "홈트"],
    items: [
      { iconKey: "dumbbell", iconType: "SYSTEM_ICON" },
      { iconKey: "heart", iconType: "SYSTEM_ICON" },
      { iconKey: "activity", iconType: "SYSTEM_ICON" },
    ],
  },
  {
    title: "생활",
    aliases: ["돈", "절약", "업무", "생활", "커리어"],
    items: [
      { iconKey: "piggy-bank", iconType: "SYSTEM_ICON" },
      { iconKey: "briefcase", iconType: "SYSTEM_ICON" },
      { iconKey: "target", iconType: "SYSTEM_ICON" },
    ],
  },
] as const satisfies readonly UserSymbolCategory[];

export const USER_SYMBOL_EMOJI_CATEGORIES = [
  {
    title: "😀 표정/감정",
    aliases: ["표정", "감정", "기분", "웃음", "행복"],
    items: ["😀", "🙂", "😊", "😄", "😌", "🤔", "😎", "🥳", "😭", "😴"],
  },
  {
    title: "👤 사람/신체",
    aliases: ["사람", "몸", "손", "응원", "박수"],
    items: ["👍", "👍🏻", "👏", "🙌", "💪", "🦵", "👀", "🧠", "👨‍💻", "🧑‍🏫"],
  },
  {
    title: "📚 독서/공부",
    aliases: ["책", "독서", "공부", "자격증", "학습"],
    items: ["📚", "📖", "📕", "📗", "📘", "📙", "🔖", "🎓", "🧠", "📝"],
  },
  {
    title: "✏️ 기록/글쓰기",
    aliases: ["기록", "글쓰기", "일기", "메모", "노트"],
    items: ["✏️", "✍️", "📝", "📓", "📔", "📒", "🗒️", "📌", "📎", "✅"],
  },
  {
    title: "📰 뉴스/정보",
    aliases: ["뉴스", "정보", "경제뉴스", "기사", "신문"],
    items: ["📰", "🗞️", "📢", "📊", "📈", "💹", "🏭", "🏛️", "💻", "🌎"],
  },
  {
    title: "💬 언어/대화",
    aliases: ["언어", "외국어", "회화", "말하기", "대화"],
    items: ["💬", "🗣️", "👂", "📣", "🔤", "🅰️", "📖", "✍️", "🎧", "🌐"],
  },
  {
    title: "🌎 외국어/세계",
    aliases: ["영어", "일본어", "중국어", "스페인어", "프랑스어", "세계"],
    items: ["🌎", "🌍", "🌏", "🇺🇸", "🇬🇧", "🇯🇵", "🇨🇳", "🇪🇸", "🇫🇷", "🇰🇷"],
  },
  {
    title: "🏃 운동",
    aliases: ["운동", "러닝", "런닝", "걷기", "스포츠"],
    items: ["🏃", "🏃‍♂️", "🏃‍♀️", "🚶", "🚴", "🤸", "⚽", "🏀", "🎾", "🏊"],
  },
  {
    title: "🏋️ 헬스",
    aliases: ["헬스", "PT", "웨이트", "상체", "하체", "근력"],
    items: ["🏋️", "🏋️‍♂️", "🏋️‍♀️", "💪", "🦵", "🔥", "⏱️", "🎯", "🥇", "📋"],
  },
  {
    title: "🧘 스트레칭/마음관리",
    aliases: ["스트레칭", "요가", "명상", "마음", "회복"],
    items: ["🧘", "🧘‍♂️", "🧘‍♀️", "🌿", "🍃", "☁️", "🕯️", "💆", "😌", "🌙"],
  },
  {
    title: "🥗 식생활",
    aliases: ["음식", "식단", "샐러드", "밥", "카페", "커피", "라떼"],
    items: ["🥗", "🍱", "🍚", "🥪", "🍎", "🥑", "🥕", "☕", "🥤", "🍵"],
  },
  {
    title: "💧 수분",
    aliases: ["물", "수분", "마시기", "텀블러"],
    items: ["💧", "🚰", "🥤", "🧊", "🍵", "☕", "🍼", "✅"],
  },
  {
    title: "😴 수면/회복",
    aliases: ["수면", "잠", "회복", "휴식", "저녁"],
    items: ["😴", "🛌", "🌙", "⭐", "🌃", "🕙", "🧘", "☁️"],
  },
  {
    title: "❤️ 건강/웰니스",
    aliases: ["건강", "병원", "약국", "보험", "웰니스"],
    items: ["❤️", "💚", "🩺", "💊", "🏥", "🧘", "🏃", "🥗", "💧", "😴"],
  },
  {
    title: "💰 돈/절약",
    aliases: ["돈", "절약", "무지출", "저축", "가계부", "구독", "월세"],
    items: ["💰", "💸", "💳", "🏦", "🪙", "🐷", "📉", "📈", "🧾", "✅"],
  },
  {
    title: "🎯 목표",
    aliases: ["목표", "미션", "타겟", "계획", "루틴"],
    items: ["🎯", "📌", "✅", "☑️", "📅", "⏰", "🧭", "🗓️", "🔁", "🏁"],
  },
  {
    title: "✅ 습관/완료",
    aliases: ["습관", "완료", "체크", "루틴", "성공"],
    items: ["✅", "☑️", "✔️", "🔁", "📆", "🔥", "⭐", "🏆", "👏", "💪"],
  },
  {
    title: "🔥 연속/Streak",
    aliases: ["연속", "스트릭", "불", "꾸준함"],
    items: ["🔥", "⚡", "🌡️", "📈", "🔁", "💪", "🏃", "⭐"],
  },
  {
    title: "⭐ 즐겨찾기/성과",
    aliases: ["즐겨찾기", "별", "성과", "칭찬"],
    items: ["⭐", "🌟", "✨", "🏆", "🥇", "🎖️", "👏", "🎉", "💎", "🚀"],
  },
  {
    title: "🎮 게임/취미",
    aliases: ["게임", "취미", "보드", "재미"],
    items: ["🎮", "🕹️", "🎲", "♟️", "🧩", "🎯", "🃏", "🏆"],
  },
  {
    title: "🎵 음악",
    aliases: ["음악", "기타", "노래", "피아노", "연습"],
    items: ["🎵", "🎧", "🎤", "🎸", "🎹", "🥁", "🎼", "🎶"],
  },
  {
    title: "🎨 창작",
    aliases: ["창작", "그림", "디자인", "사진", "만들기"],
    items: ["🎨", "🖌️", "🖼️", "📷", "🎬", "🧵", "🛠️", "✨"],
  },
  {
    title: "✈️ 여행",
    aliases: ["여행", "비행기", "세계", "지도"],
    items: ["✈️", "🧳", "🗺️", "🚆", "🚇", "🚕", "⛽", "🏝️", "🏔️", "🌎"],
  },
  {
    title: "🏠 생활",
    aliases: ["생활", "집", "청소", "정리", "반려동물"],
    items: ["🏠", "🧹", "🧺", "🛒", "🛏️", "🪴", "🐾", "📦", "🔧", "✅"],
  },
  {
    title: "💼 업무/커리어",
    aliases: ["업무", "커리어", "회사", "일", "프로젝트"],
    items: ["💼", "💻", "📊", "📁", "📌", "📅", "🧑‍💻", "☎️", "✉️", "🚀"],
  },
  {
    title: "🌱 성장",
    aliases: ["성장", "새싹", "레벨업", "자기관리"],
    items: ["🌱", "🌿", "🪴", "🚀", "📈", "⭐", "🏆", "🎯", "🔥", "💎"],
  },
  {
    title: "☀️ 아침",
    aliases: ["아침", "기상", "모닝", "햇살"],
    items: ["☀️", "🌅", "⏰", "🛏️", "☕", "📖", "🏃", "✅"],
  },
  {
    title: "🌙 저녁",
    aliases: ["저녁", "밤", "마감", "수면"],
    items: ["🌙", "🌃", "⭐", "🛌", "📚", "📝", "🧘", "✅"],
  },
] as const satisfies readonly Readonly<{
  title: string;
  aliases: readonly string[];
  items: readonly string[];
}>[];

export function allUserSymbolCategories(): readonly UserSymbolCategory[] {
  return [
    ...USER_SYMBOL_SYSTEM_ICON_CATEGORIES,
    ...USER_SYMBOL_EMOJI_CATEGORIES.map((category) => ({
      aliases: category.aliases,
      title: category.title,
      items: category.items.map(
        (emoji): GrowthGoalIcon => ({ emoji, iconType: "EMOJI" }),
      ),
    })),
  ];
}

export function searchUserSymbols(
  query: string,
  categories: readonly UserSymbolCategory[] = allUserSymbolCategories(),
): readonly UserSymbolCategory[] {
  const normalized = normalizeSymbolKeyword(query);
  if (!normalized) return categories;
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) =>
        symbolSearchText(category, item).includes(normalized),
      ),
    }))
    .filter(
      (category) =>
        category.items.length > 0 ||
        category.aliases.some((alias) =>
          normalizeSymbolKeyword(alias).includes(normalized),
        ) ||
        normalizeSymbolKeyword(category.title).includes(normalized),
    );
}

export function suggestGoalIcon(input: {
  readonly category?: string;
  readonly domain?: GrowthGoalDomain;
  readonly title: string;
  readonly userSelected?: GrowthGoalIcon | null;
}): GrowthGoalIcon {
  if (input.userSelected) return input.userSelected;
  const searchable = normalizeSymbolKeyword(
    `${input.title} ${input.category ?? ""}`,
  );
  const match = allUserSymbolCategories()
    .flatMap((category) => category.items.map((item) => ({ category, item })))
    .find(({ category, item }) =>
      symbolSearchText(category, item).includes(searchable),
    );
  if (match) return match.item;
  if (input.domain === "NEWS")
    return { iconKey: "newspaper", iconType: "SYSTEM_ICON" };
  if (input.domain === "LANGUAGE")
    return { iconKey: "languages", iconType: "SYSTEM_ICON" };
  if (input.domain === "HEALTH")
    return { iconKey: "dumbbell", iconType: "SYSTEM_ICON" };
  return { iconKey: "book-open", iconType: "SYSTEM_ICON" };
}

function symbolSearchText(
  category: UserSymbolCategory,
  item: GrowthGoalIcon,
): string {
  const itemText =
    item.iconType === "EMOJI" ? item.emoji : item.iconKey.replace(/-/gu, " ");
  return normalizeSymbolKeyword(
    [category.title, ...category.aliases, itemText].join(" "),
  );
}

function normalizeSymbolKeyword(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\s+/gu, "")
    .replace(/[./_-]+/gu, "")
    .toLowerCase();
}
