/**
 * Get a cookie value by name
 * @param name Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookiePart = parts.pop();
    if (cookiePart) {
      return decodeURIComponent(cookiePart.split(";").shift() || "");
    }
  }
  return null;
}

/**
 * Set a cookie with optional parameters
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie options (expires, path, domain, secure, sameSite)
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    expires?: number | Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  } = {}
): void {
  if (typeof window === "undefined") return;
  
  // Always encode the value to handle special characters
  let cookie = `${name}=${encodeURIComponent(value)}`;

  if (options.expires) {
    const expires =
      options.expires instanceof Date
        ? options.expires
        : new Date(Date.now() + options.expires);
    cookie += `; expires=${expires.toUTCString()}`;
  }

  // Always set path to root if not specified
  cookie += `; path=${options.path || "/"}`;
  
  if (options.domain) cookie += `; domain=${options.domain}`;
  
  // If SameSite=None, secure must be true
  if (options.sameSite === "None") {
    options.secure = true;
  }
  
  if (options.secure) cookie += "; secure";
  if (options.sameSite) cookie += `; samesite=${options.sameSite}`;

  document.cookie = cookie;
}

/**
 * Delete a cookie
 * @param name Cookie name
 * @param options Cookie options (path, domain)
 */
export function deleteCookie(
  name: string,
  options: { 
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  } = {}
): void {
  if (typeof window === "undefined") return;
  setCookie(name, "", {
    ...options,
    path: options.path || "/",
    expires: new Date(0),
  });
}
