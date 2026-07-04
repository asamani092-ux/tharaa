/** إعدادات الرصد من API (PHP قد يعيد primaryDay نصاً أو submissionStartDay رقماً). */
export type SubmissionSettingsInput = {
  allDaysActive?: boolean;
  primaryDay?: string;
  submissionStartDay?: number;
};

export type SubmissionWindowKind = "anytime" | "official" | "late" | "off";

export type SubmissionWindow = {
  kind: SubmissionWindowKind;
  allowsPrimary: boolean;
  primaryDayNum: number;
  lateDayNum: number;
  primaryDayLabelAr: string;
  lateDayLabelAr: string;
  todayLabelAr: string;
};

const DAY_NAME_TO_NUM: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const DAY_NUM_TO_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function resolvePrimaryDayNum(settings: SubmissionSettingsInput): number {
  if (settings.primaryDay && DAY_NAME_TO_NUM[settings.primaryDay] !== undefined) {
    return DAY_NAME_TO_NUM[settings.primaryDay];
  }
  if (
    typeof settings.submissionStartDay === "number" &&
    settings.submissionStartDay >= 0 &&
    settings.submissionStartDay <= 6
  ) {
    return settings.submissionStartDay;
  }
  return 5;
}

/**
 * نافذة الرصد الأسبوعي — O(1) زمنياً ومكانياً.
 */
export function getSubmissionWindow(
  settings: SubmissionSettingsInput,
  now: Date = new Date()
): SubmissionWindow {
  const today = now.getDay();
  const primaryDayNum = resolvePrimaryDayNum(settings);
  const lateDayNum = (primaryDayNum + 1) % 7;
  const primaryDayLabelAr = DAY_NUM_TO_AR[primaryDayNum] ?? "—";
  const lateDayLabelAr = DAY_NUM_TO_AR[lateDayNum] ?? "—";
  const todayLabelAr = DAY_NUM_TO_AR[today] ?? "—";

  const base = { primaryDayNum, lateDayNum, primaryDayLabelAr, lateDayLabelAr, todayLabelAr };

  if (settings.allDaysActive) {
    return { kind: "anytime", allowsPrimary: true, ...base };
  }

  if (today === primaryDayNum) {
    return { kind: "official", allowsPrimary: true, ...base };
  }

  if (today === lateDayNum) {
    return { kind: "late", allowsPrimary: true, ...base };
  }

  return { kind: "off", allowsPrimary: false, ...base };
}
