export class BrandfetchUtils {
  static API_HOSTNAME = "api.brandfetch.io";
  static CDN_HOSTNAME = "cdn.brandfetch.io";

  static getImageUrl(domain: string, size: number = 80): string {
    const clientId = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

    return `https://${this.CDN_HOSTNAME}/${domain}/w/${size}/h/${size}/fallback/lettermark/type/icon?c=${clientId}`;
  }
}
