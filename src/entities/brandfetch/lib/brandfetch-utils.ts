export class BrandfetchUtils {
  static getImageUrl(domain: string, size: number = 80): string {
    const clientId = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

    return `https://cdn.brandfetch.io/${domain}/w/${size}/h/${size}/fallback/lettermark/type/icon?c=${clientId}`;
  }
}
