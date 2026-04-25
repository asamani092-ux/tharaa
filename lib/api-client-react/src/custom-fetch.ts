// @ts-nocheck
/* eslint-disable */

export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;
export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

let _baseUrl: string | null = (import.meta.env.VITE_API_URL as string) || "";
let _authTokenGetter: AuthTokenGetter | null = null;

export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  if (!url.startsWith("/")) return input;
  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();
  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => { headers.set(key, value); });
  }
  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(mediaType && (mediaType.startsWith("text/") || mediaType === "application/xml" || mediaType === "text/xml" || mediaType.endsWith("+xml") || mediaType === "application/x-www-form-urlencoded"));
}

function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate.trim() || undefined : undefined;
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;
  if (typeof data === "string") return data.trim() ? `${prefix}: ${data.slice(0, 200)}` : prefix;
  const message = getStringField(data, "message") ?? getStringField(data, "error");
  return message ? `${prefix}: ${message}` : prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly data: T | null;
  constructor(response: Response, data: T | null, requestInfo: { method: string; url: string }) {
    super(buildErrorMessage(response, data));
    this.status = response.status;
    this.data = data;
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) return null;
  const raw = await response.text();
  try { return JSON.parse(stripBom(raw)); } catch { return raw; }
}

async function parseSuccessBody(response: Response, responseType: "json" | "text" | "blob" | "auto", requestInfo: { method: string; url: string }): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) return null;
  if (responseType === "blob") return response.blob();
  const text = await response.text();
  if (responseType === "text") return text;
  try { return JSON.parse(stripBom(text)); } catch { return text; }
}

export async function customFetch<T = unknown>(input: RequestInfo | URL, options: CustomFetchOptions = {}): Promise<T> {
  const finalInput = applyBaseUrl(input);
  
  // التعديل هنا: أضفنا credentials = "include" كقيمة افتراضية
  const { responseType = "auto", headers: headersInit, credentials = "include", ...init } = options;
  
  const method = resolveMethod(finalInput, init.method);
  const headers = mergeHeaders(isRequest(finalInput) ? finalInput.headers : undefined, headersInit);

  if (typeof init.body === "string" && !headers.has("content-type") && looksLikeJson(init.body)) {
    headers.set("content-type", "application/json");
  }

  if (_authTokenGetter && !headers.has("authorization")) {
    const token = await _authTokenGetter();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  // التعديل هنا: مررنا الـ credentials لطلب الـ fetch
  const response = await fetch(finalInput, { ...init, method, headers, credentials });
  
  const requestInfo = { method, url: resolveUrl(finalInput) };

  if (!response.ok) {
    const errorData = await parseErrorBody(response, method);
    throw new ApiError(response, errorData, requestInfo);
  }

  return (await parseSuccessBody(response, responseType, requestInfo)) as T;
}
