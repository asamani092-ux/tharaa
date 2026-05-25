export function buildAnalyticsUrl(batchId: string, track: string): string {
  const params = new URLSearchParams();
  if (batchId !== "all") params.set("batchId", batchId);
  if (track !== "all") params.set("track", track);
  const qs = params.toString();
  return `/api/analytics.php${qs ? `?${qs}` : ""}`;
}

export type SupervisorIndicators = {
  atRisk?: {
    count: number;
    windowDays: number;
    students: { id: number; name: string; batchName: string; lastLogAt?: string | null }[];
  };
  bookBottleneck?: {
    bookId: number;
    title: string;
    stuckCount: number;
    method: string;
  } | null;
};
