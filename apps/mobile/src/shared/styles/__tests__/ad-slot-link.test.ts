import type { MobilePublicConfigApiClient } from "../../api/mobile-api";
import {
  SALARY_HIJACKING_PARTNER_BENEFITS_URL,
  createPartnerBenefitsUrlLoader,
} from "../ad-slot-link";

function publicConfig(
  partnerBenefitsUrl = "https://salaryhijacking.com/partners",
): Awaited<ReturnType<MobilePublicConfigApiClient["getPublicAppConfig"]>> {
  return {
    links: {
      landingUrl: "https://salaryhijacking.com",
      partnerBenefitsUrl,
      privacyUrl: "https://salaryhijacking.com/privacy",
      supportUrl: "https://salaryhijacking.com/support",
      termsUrl: "https://salaryhijacking.com/terms",
    },
    privacy: {
      rawPayrollDataForAds: false,
      rawExpenseDataForAds: false,
      rawSavingsDataForAds: false,
      advertiserUserIdentifierExposure: false,
    },
  };
}

describe("ad slot partner benefits URL loader", () => {
  it("shares one public app-config request across simultaneous ad slots", async () => {
    let requests = 0;
    const api: MobilePublicConfigApiClient = {
      getPublicAppConfig: async () => {
        requests += 1;
        await Promise.resolve();
        return publicConfig();
      },
    };
    const loadPartnerBenefitsUrl = createPartnerBenefitsUrlLoader(() => api);

    const [first, second, third] = await Promise.all([
      loadPartnerBenefitsUrl(),
      loadPartnerBenefitsUrl(),
      loadPartnerBenefitsUrl(),
    ]);
    const fourth = await loadPartnerBenefitsUrl();

    expect([first, second, third, fourth]).toEqual([
      "https://salaryhijacking.com/partners",
      "https://salaryhijacking.com/partners",
      "https://salaryhijacking.com/partners",
      "https://salaryhijacking.com/partners",
    ]);
    expect(requests).toBe(1);
  });

  it("falls back to the fixed contextual partner URL when server config is unsafe", async () => {
    const api: MobilePublicConfigApiClient = {
      getPublicAppConfig: async () =>
        publicConfig("https://tracking.example.com/raw-salary-targeting"),
    };
    const loadPartnerBenefitsUrl = createPartnerBenefitsUrlLoader(() => api);

    await expect(loadPartnerBenefitsUrl()).resolves.toBe(
      SALARY_HIJACKING_PARTNER_BENEFITS_URL,
    );
  });

  it("falls back when partner benefits URL embeds credentials", async () => {
    const api: MobilePublicConfigApiClient = {
      getPublicAppConfig: async () =>
        publicConfig("https://;@salaryhijacking.com/partners"),
    };
    const loadPartnerBenefitsUrl = createPartnerBenefitsUrlLoader(() => api);

    await expect(loadPartnerBenefitsUrl()).resolves.toBe(
      SALARY_HIJACKING_PARTNER_BENEFITS_URL,
    );
  });
});
