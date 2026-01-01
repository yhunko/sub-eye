export class BrandfetchUtils {
  static HOSTNAME = "cdn.brandfetch.io";

  static getImageUrl(domain: string, size: number = 80): string {
    const clientId = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

    return `https://${this.HOSTNAME}/${domain}/w/${size}/h/${size}/fallback/lettermark/type/icon?c=${clientId}`;
  }
}
