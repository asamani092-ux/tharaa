/** إعدادات المنصة عبر Hostinger: `/api/settings.php` */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGetSettingsQueryKey } from "@workspace/api-client-react";

export type PlatformSettings = {
  id: number;
  weeklyQuota: number;
  submissionStartDay?: number;
  submissionStartHour?: number;
  normalDeadlineDay?: number;
  normalDeadlineHour?: number;
  lateDeadlineDay?: number;
  lateDeadlineHour?: number;
  gradeThresholdExcellent?: number;
  gradeThresholdGood?: number;
  gradeThresholdAcceptable?: number;
  allDaysActive: boolean;
  primaryDay?: string;
  maintenanceMode?: boolean;
  curriculumPdfUrl?: string | null;
  curriculumPdfUrlFull?: string | null;
  curriculumPdfUrlSimplified?: string | null;
  priorAchievementEnabled?: boolean;
  atRiskInactiveDays?: number;
};

export const PLATFORM_SETTINGS_QUERY_KEY = ["platform-settings-php"] as const;

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }
}

function apiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: string }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const res = await fetch("/api/settings.php", { credentials: "include" });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, "تعذر تحميل الإعدادات"));
  }
  return data as PlatformSettings;
}

export async function patchPlatformSettings(
  body: Record<string, unknown>
): Promise<PlatformSettings> {
  const headers = { "Content-Type": "application/json" };
  const init: RequestInit = {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  };

  let res = await fetch("/api/settings.php", init);
  let data = await parseJsonResponse(res);

  if (res.status === 405) {
    res = await fetch("/api/settings.php", { ...init, method: "PUT" });
    data = await parseJsonResponse(res);
  }

  if (!res.ok) {
    throw new Error(apiErrorMessage(data, "تعذر حفظ الإعدادات"));
  }

  return data as PlatformSettings;
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: PLATFORM_SETTINGS_QUERY_KEY,
    queryFn: fetchPlatformSettings,
  });
}

export function usePatchPlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchPlatformSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(PLATFORM_SETTINGS_QUERY_KEY, saved);
      queryClient.setQueryData(getGetSettingsQueryKey(), saved);
    },
  });
}
