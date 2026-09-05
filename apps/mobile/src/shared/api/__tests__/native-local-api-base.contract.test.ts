import { createCommunityApi } from "../../../features/community/api";
import { createBudgetApi } from "../../../features/budget/api";
import { createGrowthApi } from "../../../features/level/api";
import { createNotificationsApi } from "../../../features/notifications/api";
import { createPayrollApi } from "../../../features/payroll/api";
import { createPlanCommitmentsApi } from "../../../features/plan/api";
import { createProfileApi } from "../../../features/profile/api";
import { createUploadsApi } from "../../../features/uploads/api";

describe("native Android local API base contract", () => {
  const baseUrl = "http://10.0.2.2:8787";
  const credentialedBaseUrl = "https://operator:secret@api.salaryhijacking.com";
  const createCorrelationId = () => "android-local-api-base-contract";
  const fetcher = jest.fn() as unknown as typeof fetch;

  const featureApiFactories = [
    [
      "budget",
      (nextBaseUrl: string) =>
        createBudgetApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "community",
      (nextBaseUrl: string) =>
        createCommunityApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "growth",
      (nextBaseUrl: string) =>
        createGrowthApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "notifications",
      (nextBaseUrl: string) =>
        createNotificationsApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "payroll",
      (nextBaseUrl: string) =>
        createPayrollApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "plan",
      (nextBaseUrl: string) =>
        createPlanCommitmentsApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "profile",
      (nextBaseUrl: string) =>
        createProfileApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "uploads",
      (nextBaseUrl: string) =>
        createUploadsApi({
          baseUrl: nextBaseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
  ] as const;

  it.each(featureApiFactories)(
    "%s API accepts the Android emulator loopback HTTP bridge",
    (_, build) => {
      expect(() => build(baseUrl)).not.toThrow();
    },
  );

  it.each(featureApiFactories)(
    "%s API does not read unsupported React Native URL credential accessors",
    (_, build) => {
      const NativeUrl = global.URL;
      class ReactNativeLikeUrl extends NativeUrl {
        override get username(): string {
          throw new Error("URL.username is not implemented");
        }

        override get password(): string {
          throw new Error("URL.password is not implemented");
        }

        override get protocol(): string {
          throw new Error("URL.protocol is not implemented");
        }

        override get hostname(): string {
          throw new Error("URL.hostname is not implemented");
        }
      }

      global.URL = ReactNativeLikeUrl as typeof URL;
      try {
        expect(() => build(baseUrl)).not.toThrow(
          "URL.username is not implemented",
        );
      } finally {
        global.URL = NativeUrl;
      }
    },
  );

  it.each(featureApiFactories)(
    "%s API rejects base URLs with embedded credentials",
    (_, build) => {
      expect(() => build(credentialedBaseUrl)).toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
