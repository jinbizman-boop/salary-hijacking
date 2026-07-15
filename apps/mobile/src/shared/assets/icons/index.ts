/* eslint-disable @typescript-eslint/no-require-imports -- React Native icon assets must use static require() calls for Metro bundling. */
import type { ImageSourcePropType } from "react-native";

export const appIconAssets = {
  bottomTabs: {
    salary: require("./bottom-tabs/salary-tab.png") as ImageSourcePropType,
    plan: require("./bottom-tabs/plan-tab.png") as ImageSourcePropType,
    level: require("./bottom-tabs/level-tab.png") as ImageSourcePropType,
    community:
      require("./bottom-tabs/community-tab.png") as ImageSourcePropType,
    profile: require("./bottom-tabs/profile-tab.png") as ImageSourcePropType,
  },
  common: {
    alarm: require("./common/alarm.png") as ImageSourcePropType,
    settings: require("./common/settings.png") as ImageSourcePropType,
    left: require("./common/left.png") as ImageSourcePropType,
    close: require("./common/close.png") as ImageSourcePropType,
    camera: require("./common/camera.png") as ImageSourcePropType,
    imageGallery: require("./common/image-gallery.png") as ImageSourcePropType,
    file: require("./common/file.png") as ImageSourcePropType,
    heart: require("./common/heart.png") as ImageSourcePropType,
    share: require("./common/share.png") as ImageSourcePropType,
    speechBubble: require("./common/speech-bubble.png") as ImageSourcePropType,
    more: require("./common/more.png") as ImageSourcePropType,
    edit: require("./common/edit.png") as ImageSourcePropType,
  },
  money: {
    coins: require("./money/coins.png") as ImageSourcePropType,
    coffee: require("./money/coffee.png") as ImageSourcePropType,
    bibimbap: require("./money/bibimbap.png") as ImageSourcePropType,
    cigarettes: require("./money/cigarettes.png") as ImageSourcePropType,
    cutlery: require("./money/cutlery.png") as ImageSourcePropType,
    latteArt: require("./money/latte-art.png") as ImageSourcePropType,
  },
  level: {
    ai: require("./level/ai.png") as ImageSourcePropType,
    book: require("./level/book.png") as ImageSourcePropType,
    read: require("./level/read.png") as ImageSourcePropType,
    news: require("./level/news.png") as ImageSourcePropType,
    technology: require("./level/technology.png") as ImageSourcePropType,
    video: require("./level/video.png") as ImageSourcePropType,
    box: require("./level/box.png") as ImageSourcePropType,
    folders: require("./level/folders.png") as ImageSourcePropType,
  },
  community: {
    application: require("./community/application.png") as ImageSourcePropType,
    communication:
      require("./community/communication.png") as ImageSourcePropType,
  },
  profile: {
    mypageProfile:
      require("./profile/mypage-profile.png") as ImageSourcePropType,
  },
  social: {
    kakao: require("./social/kakao.png") as ImageSourcePropType,
    naver: require("./social/naver.png") as ImageSourcePropType,
    google: require("./social/google.png") as ImageSourcePropType,
    facebook: require("./social/facebook.png") as ImageSourcePropType,
  },
  brands: {
    chatGpt: require("./brands/chat-gpt.png") as ImageSourcePropType,
    youtube: require("./brands/youtube.png") as ImageSourcePropType,
    netflix: require("./brands/netflix.png") as ImageSourcePropType,
  },
} as const;
