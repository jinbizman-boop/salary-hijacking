import {
  createMobilePublicConfigApi,
  type MobilePublicConfigApiClient,
} from "../api/mobile-api";

export const SALARY_HIJACKING_PARTNER_BENEFITS_URL =
  "https://salaryhijacking.com/partners";

export function createPartnerBenefitsUrlLoader(
  createPublicConfigApi: () => MobilePublicConfigApiClient = () =>
    createMobilePublicConfigApi(),
): () => Promise<string> {
  let cachedPartnerBenefitsUrl: string | null = null;
  let partnerBenefitsUrlInFlight: Promise<string> | null = null;

  return async () => {
    if (cachedPartnerBenefitsUrl) return cachedPartnerBenefitsUrl;
    if (partnerBenefitsUrlInFlight) return partnerBenefitsUrlInFlight;

    partnerBenefitsUrlInFlight = createPublicConfigApi()
      .getPublicAppConfig()
      .then((config) => {
        const nextUrl = config.links.partnerBenefitsUrl;
        cachedPartnerBenefitsUrl = isSafePartnerBenefitsUrl(nextUrl)
          ? nextUrl
          : SALARY_HIJACKING_PARTNER_BENEFITS_URL;
        return cachedPartnerBenefitsUrl;
      })
      .catch(() => {
        cachedPartnerBenefitsUrl = SALARY_HIJACKING_PARTNER_BENEFITS_URL;
        return cachedPartnerBenefitsUrl;
      })
      .finally(() => {
        partnerBenefitsUrlInFlight = null;
      });

    return partnerBenefitsUrlInFlight;
  };
}

export const loadPartnerBenefitsUrl = createPartnerBenefitsUrlLoader();

function isSafePartnerBenefitsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "salaryhijacking.com";
  } catch {
    return false;
  }
}
