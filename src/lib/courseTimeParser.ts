/**
 * Course Time Parser
 * Parses course time strings and provides utility functions for course scheduling
 */

// Time period configuration
export const TIME_PERIODS = {
  M: { start: "07:10", end: "08:00", label: "M" },
  1: { start: "08:10", end: "09:00", label: "1" },
  2: { start: "09:10", end: "10:00", label: "2" },
  3: { start: "10:10", end: "11:00", label: "3" },
  4: { start: "11:10", end: "12:00", label: "4" },
  A: { start: "12:10", end: "13:00", label: "A" },
  5: { start: "13:30", end: "14:20", label: "5" },
  6: { start: "14:30", end: "15:20", label: "6" },
  7: { start: "15:30", end: "16:20", label: "7" },
  8: { start: "16:30", end: "17:20", label: "8" },
  9: { start: "17:30", end: "18:20", label: "9" },
  10: { start: "18:30", end: "19:20", label: "10" },
  11: { start: "19:25", end: "20:15", label: "11" },
  12: { start: "20:20", end: "21:10", label: "12" },
  13: { start: "21:15", end: "22:05", label: "13" },
} as const;

export type PeriodKey = keyof typeof TIME_PERIODS;

// Day mapping
export const DAY_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
};

export const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

// Parsed time slot
export type TimeSlot = {
  day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayLabel: string; // "一", "二", etc.
  periods: PeriodKey[]; // ["2", "3", "4"]
  startTime: string; // "09:10"
  endTime: string; // "12:00"
};

/**
 * Parse course time string
 * Example: "(一)2-4,(三)5-7" -> [{ day: 1, periods: ["2","3","4"] }, { day: 3, periods: ["5","6","7"] }]
 */
export function parseCourseTime(timeString: string | null): TimeSlot[] {
  if (!timeString) return [];

  const slots: TimeSlot[] = [];

  // Split by comma to handle multiple time slots
  const parts = timeString.split(/[,，]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Match pattern like (一)2-4 or (一)M or (二)A
    const match = trimmed.match(/\(([一二三四五六日])\)([MA\d]+(?:-[MA\d]+)?)/);
    if (!match) continue;

    const dayLabel = match[1];
    const periodPart = match[2];
    const day = DAY_MAP[dayLabel];

    if (day === undefined) continue;

    // Parse period range
    const periods: PeriodKey[] = [];

    // Define period order
    const periodOrder: PeriodKey[] = ["M", "1", "2", "3", "4", "A", "5", "6", "7", "8", "9", "10", "11", "12", "13"];

    if (periodPart.includes("-")) {
      // Range like "2-4" or "M-2"
      const [start, end] = periodPart.split("-");
      const startIdx = periodOrder.indexOf(start as PeriodKey);
      const endIdx = periodOrder.indexOf(end as PeriodKey);

      if (startIdx !== -1 && endIdx !== -1) {
        for (let i = startIdx; i <= endIdx; i++) {
          periods.push(periodOrder[i]);
        }
      }
    } else {
      // Single period like "M" or "5"
      if (periodPart in TIME_PERIODS) {
        periods.push(periodPart as PeriodKey);
      }
    }

    if (periods.length > 0) {
      const startTime = TIME_PERIODS[periods[0]].start;
      const endTime = TIME_PERIODS[periods[periods.length - 1]].end;

      slots.push({
        day,
        dayLabel,
        periods,
        startTime,
        endTime,
      });
    }
  }

  return slots;
}

/**
 * Format time slots to readable string
 * Example: [{ day: 1, periods: ["2","3","4"] }] -> "週一 09:10-12:00"
 */
export function formatTimeSlots(slots: TimeSlot[]): string {
  if (slots.length === 0) return "";

  return slots
    .map((slot) => {
      const dayName = `週${slot.dayLabel}`;
      const timeRange = `${slot.startTime}-${slot.endTime}`;
      return `${dayName} ${timeRange}`;
    })
    .join(", ");
}

/**
 * Get all days that have classes
 */
export function getActiveDays(slots: TimeSlot[]): number[] {
  const days = new Set(slots.map((slot) => slot.day));
  return Array.from(days).sort();
}

/**
 * Get all periods used across all days
 */
export function getAllPeriods(slots: TimeSlot[]): PeriodKey[] {
  const periodSet = new Set<PeriodKey>();
  slots.forEach((slot) => {
    slot.periods.forEach((period) => periodSet.add(period));
  });

  // Use correct period order (M, 1-9, A, 10-13)
  const periodOrder: PeriodKey[] = ["M", "1", "2", "3", "4", "A", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
  return periodOrder.filter((p) => periodSet.has(p));
}

/**
 * Check if a specific day and period has class
 */
export function hasClassAt(slots: TimeSlot[], day: number, period: PeriodKey): boolean {
  return slots.some((slot) => slot.day === day && slot.periods.includes(period));
}
