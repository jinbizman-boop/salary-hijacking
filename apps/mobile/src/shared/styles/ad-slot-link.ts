import {
  createMobilePublicConfigApi,
  type MobilePublicConfigApiClient,
} from "../api/mobile-api";

export const SALARY_HIJACKING_PARTNER_BENEFITS_URL =
  "https://salaryhijacking.com/partners";

const SENSITIVE_PARTNER_LINK_PAYLOAD_PATTERN =
  /(?:salary|payroll|income|expense|savings?|hijack|amount|account|card|loan|email|phone|token|authorization|bearer|session|refresh|push|fcm|device)/iu;

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
    return (
      url.protocol === "https:" &&
      url.hostname === "salaryhijacking.com" &&
      !url.username &&
      !url.password &&
      !SENSITIVE_PARTNER_LINK_PAYLOAD_PATTERN.test(
        `${url.pathname}\n${url.search}\n${url.hash}`,
      )
    );
  } catch {
    return false;
  }
}
