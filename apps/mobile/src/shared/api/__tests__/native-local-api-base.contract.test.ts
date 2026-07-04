import { createCommunityApi } from "../../../features/community/api";
import { createGrowthApi } from "../../../features/level/api";
import { createNotificationsApi } from "../../../features/notifications/api";
import { createPayrollApi } from "../../../features/payroll/api";
import { createPlanCommitmentsApi } from "../../../features/plan/api";
import { createProfileApi } from "../../../features/profile/api";
import { createUploadsApi } from "../../../features/uploads/api";

describe("native Android local API base contract", () => {
  const baseUrl = "http://10.0.2.2:8787";
  const createCorrelationId = () => "android-local-api-base-contract";
  const fetcher = jest.fn() as unknown as typeof fetch;

  it.each([
    [
      "community",
      () =>
        createCommunityApi({
          baseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "growth",
      () =>
        createGrowthApi({
          baseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "notifications",
      () =>
        createNotificationsApi({
          baseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "payroll",
      () =>
        createPayrollApi({
          baseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "plan",
      () =>
        createPlanCommitmentsApi({
          baseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "profile",
      () =>
        createProfileApi({
          baseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
    [
      "uploads",
      () =>
        createUploadsApi({
          baseUrl,
          createCorrelationId,
          fetcher,
          platform: "android",
        }),
    ],
  ])("%s API accepts the Android emulator loopback HTTP bridge", (_, build) => {
    expect(build).not.toThrow();
  });
});
