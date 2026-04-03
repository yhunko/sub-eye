export class BrandfetchUtils {
  static API_HOSTNAME = "api.brandfetch.io";
  static CDN_HOSTNAME = "cdn.brandfetch.io";

  static getImageUrl(domain: string, size: number = 256): string | undefined {
    const normalizedDomain = BrandfetchUtils.normalizeDomain(domain);

    if (!normalizedDomain) {
      return undefined;
    }

    const clientId = import.meta.env.VITE_BRANDFETCH_CLIENT_ID;
    const encodedDomain = encodeURIComponent(normalizedDomain);

    return `https://${BrandfetchUtils.CDN_HOSTNAME}/${encodedDomain}/w/${size}/h/${size}/fallback/lettermark/type/icon?c=${clientId}`;
  }

  static normalizeDomain(input: string): string | null {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
      return null;
    }

    const withoutScheme = trimmed.replace(/^https?:\/\//, "");
    const hostCandidate = withoutScheme.split("/")[0].replace(/\.$/, "");

    if (!hostCandidate) {
      return null;
    }

    const labels = hostCandidate.split(".");

    if (labels.length < 2) {
      return null;
    }

    const isValid = labels.every((label) => /^[a-z0-9-]+$/i.test(label));
    if (!isValid) {
      return null;
    }

    return hostCandidate;
  }
}
