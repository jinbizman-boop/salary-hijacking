/* eslint-disable @typescript-eslint/no-require-imports -- React Native icon assets must use static require() calls for Metro bundling. */
import type { ImageSourcePropType } from "react-native";

export const appIconAssets = {
  bottomTabs: {
    salary:
      require("../../../../assets/runtime-icons/bottom-tabs/salary-tab.png") as ImageSourcePropType,
    plan:
      require("../../../../assets/runtime-icons/bottom-tabs/plan-tab.png") as ImageSourcePropType,
    level:
      require("../../../../assets/runtime-icons/bottom-tabs/level-tab.png") as ImageSourcePropType,
    community:
      require("../../../../assets/runtime-icons/bottom-tabs/community-tab.png") as ImageSourcePropType,
    profile:
      require("../../../../assets/runtime-icons/bottom-tabs/profile-tab.png") as ImageSourcePropType,
  },
  common: {
    alarm:
      require("../../../../assets/runtime-icons/common/alarm.png") as ImageSourcePropType,
    settings:
      require("../../../../assets/runtime-icons/common/settings.png") as ImageSourcePropType,
    left:
      require("../../../../assets/runtime-icons/common/left.png") as ImageSourcePropType,
    close:
      require("../../../../assets/runtime-icons/common/close.png") as ImageSourcePropType,
    camera:
      require("../../../../assets/runtime-icons/common/camera.png") as ImageSourcePropType,
    imageGallery:
      require("../../../../assets/runtime-icons/common/image-gallery.png") as ImageSourcePropType,
    file:
      require("../../../../assets/runtime-icons/common/file.png") as ImageSourcePropType,
    heart:
      require("../../../../assets/runtime-icons/common/heart.png") as ImageSourcePropType,
    share:
      require("../../../../assets/runtime-icons/common/share.png") as ImageSourcePropType,
    speechBubble:
      require("../../../../assets/runtime-icons/common/speech-bubble.png") as ImageSourcePropType,
    more:
      require("../../../../assets/runtime-icons/common/more.png") as ImageSourcePropType,
    edit:
      require("../../../../assets/runtime-icons/common/edit.png") as ImageSourcePropType,
  },
  money: {
    coins:
      require("../../../../assets/runtime-icons/money/coins.png") as ImageSourcePropType,
    coffee:
      require("../../../../assets/runtime-icons/money/coffee.png") as ImageSourcePropType,
    bibimbap:
      require("../../../../assets/runtime-icons/money/bibimbap.png") as ImageSourcePropType,
    cigarettes:
      require("../../../../assets/runtime-icons/money/cigarettes.png") as ImageSourcePropType,
    cutlery:
      require("../../../../assets/runtime-icons/money/cutlery.png") as ImageSourcePropType,
    latteArt:
      require("../../../../assets/runtime-icons/money/latte-art.png") as ImageSourcePropType,
  },
  level: {
    ai:
      require("../../../../assets/runtime-icons/level/ai.png") as ImageSourcePropType,
    book:
      require("../../../../assets/runtime-icons/level/book.png") as ImageSourcePropType,
    read:
      require("../../../../assets/runtime-icons/level/read.png") as ImageSourcePropType,
    news:
      require("../../../../assets/runtime-icons/level/news.png") as ImageSourcePropType,
    technology:
      require("../../../../assets/runtime-icons/level/technology.png") as ImageSourcePropType,
    video:
      require("../../../../assets/runtime-icons/level/video.png") as ImageSourcePropType,
    box:
      require("../../../../assets/runtime-icons/level/box.png") as ImageSourcePropType,
    folders:
      require("../../../../assets/runtime-icons/level/folders.png") as ImageSourcePropType,
  },
  community: {
    application:
      require("../../../../assets/runtime-icons/community/application.png") as ImageSourcePropType,
    communication:
      require("../../../../assets/runtime-icons/community/communication.png") as ImageSourcePropType,
  },
  profile: {
    mypageProfile:
      require("../../../../assets/runtime-icons/profile/mypage-profile.png") as ImageSourcePropType,
  },
  social: {
    kakao:
      require("../../../../assets/runtime-icons/social/kakao.png") as ImageSourcePropType,
    naver:
      require("../../../../assets/runtime-icons/social/naver.png") as ImageSourcePropType,
    google:
      require("../../../../assets/runtime-icons/social/google.png") as ImageSourcePropType,
  },
  brands: {
    chatGpt:
      require("../../../../assets/runtime-icons/brands/chat-gpt.png") as ImageSourcePropType,
    youtube:
      require("../../../../assets/runtime-icons/brands/youtube.png") as ImageSourcePropType,
    netflix:
      require("../../../../assets/runtime-icons/brands/netflix.png") as ImageSourcePropType,
  },
} as const;

export const bottomTabIconAssets = appIconAssets.bottomTabs;
