export const KAU_ACCESS_COOKIE = "kau_access_token";
export const KAU_REFRESH_COOKIE = "kau_refresh_token";

export function authCookieNames() {
  return { access: KAU_ACCESS_COOKIE, refresh: KAU_REFRESH_COOKIE };
}
