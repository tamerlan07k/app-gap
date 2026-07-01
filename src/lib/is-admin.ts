const ADMIN_EMAIL = "appgap2009@gmail.com";

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}
