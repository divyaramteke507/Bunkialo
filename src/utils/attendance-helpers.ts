import type { AttendanceRecord } from "@/types";

type RecordIdentity = Pick<AttendanceRecord, "date" | "description">;
type AttendanceRecordDateIdentity = Pick<AttendanceRecord, "date">;

const MONTH_TO_NUMBER: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export const formatSyncTime = (timestamp: number | null): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day} ${month}`;
};

export const parseTimeSlot = (dateStr: string): string | null => {
  const timeMatch = dateStr.match(
    /(\d{1,2}(?::\d{2})?(?:AM|PM)\s*-\s*\d{1,2}(?::\d{2})?(?:AM|PM))/i,
  );
  return timeMatch ? timeMatch[1] : null;
};

export const parseRecordDate = (dateStr: string): Date | null => {
  const dateMatch = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (!dateMatch) return null;
  const [, day, monthStr, year] = dateMatch;
  const month = MONTH_TO_NUMBER[monthStr.toLowerCase()];
  if (!month) return null;
  return new Date(`${year}-${month}-${day.padStart(2, "0")}T00:00:00`);
};

const parseTimeToMinutes = (timeStr: string): number | null => {
  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/i);
  if (!match) return null;

  const [, hourStr, minuteStr, meridiem] = match;
  const hour12 = Number.parseInt(hourStr, 10);
  const minutes = minuteStr ? Number.parseInt(minuteStr, 10) : 0;
  if (hour12 < 1 || hour12 > 12 || minutes < 0 || minutes > 59) return null;

  let hour24 = hour12 % 12;
  if (meridiem.toUpperCase() === "PM") hour24 += 12;
  return hour24 * 60 + minutes;
};

export const getAttendanceRecordEndDate = (dateStr: string): Date | null => {
  const recordDate = parseRecordDate(dateStr);
  if (!recordDate) return null;

  const timeSlot = parseTimeSlot(dateStr);
  if (!timeSlot) return recordDate;

  const [, endPartRaw] = timeSlot.split("-").map((part) => part.trim());
  if (!endPartRaw) return recordDate;

  const endMinutes = parseTimeToMinutes(endPartRaw);
  if (endMinutes === null) return recordDate;

  const endDate = new Date(recordDate);
  endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  return endDate;
};

export const isAttendanceRecordCompleted = (
  record: AttendanceRecordDateIdentity,
  now: Date = new Date(),
): boolean => {
  const sessionEnd = getAttendanceRecordEndDate(record.date);
  if (!sessionEnd) return false;
  return sessionEnd <= now;
};

export const filterCompletedAttendanceRecords = (
  records: AttendanceRecord[],
  now: Date = new Date(),
): AttendanceRecord[] =>
  records.filter((record) => isAttendanceRecordCompleted(record, now));

const normalizeRecordPart = (value: string): string => value.trim();

export const buildRecordKey = (date: string, description: string): string =>
  `${normalizeRecordPart(date)}-${normalizeRecordPart(description)}`;

// Keep compatibility with older persisted bunk entries where LMS bunks used
// description = date instead of record.description.
export const getRecordKeyVariants = (record: RecordIdentity): string[] => {
  const date = normalizeRecordPart(record.date);
  const description = normalizeRecordPart(record.description);
  const primaryKey = buildRecordKey(date, description);
  const legacyKey = buildRecordKey(date, date);
  return primaryKey === legacyKey ? [primaryKey] : [primaryKey, legacyKey];
};

export const recordsReferToSameSession = (
  left: RecordIdentity,
  right: RecordIdentity,
): boolean => {
  const rightKeySet = new Set<string>(getRecordKeyVariants(right));
  return getRecordKeyVariants(left).some((key) => rightKeySet.has(key));
};

export const getCanonicalRecordDescription = (
  record: RecordIdentity,
): string => {
  const description = normalizeRecordPart(record.description);
  if (description.length > 0) return description;
  return normalizeRecordPart(record.date);
};

// compute unknown count from courses and bunk courses
export const computeUnknownCount = (
  courses: { courseId: string; records: AttendanceRecord[] }[],
  bunkCourses: {
    courseId: string;
    bunks: { date: string; description: string }[];
  }[],
): number => {
  if (courses.length === 0) return 0;

  const resolvedKeysByCourse = new Map<string, Set<string>>();
  for (const course of bunkCourses) {
    const keys = new Set<string>();
    for (const bunk of course.bunks) {
      for (const key of getRecordKeyVariants(bunk)) {
        keys.add(key);
      }
    }
    resolvedKeysByCourse.set(course.courseId, keys);
  }

  const now = new Date();

  let count = 0;
  for (const course of courses) {
    const resolvedKeys = resolvedKeysByCourse.get(course.courseId);
    for (const record of course.records) {
      if (record.status !== "Unknown") continue;
      if (!isAttendanceRecordCompleted(record, now)) continue;
      const isResolved = getRecordKeyVariants(record).some((key) =>
        resolvedKeys?.has(key),
      );
      if (isResolved) continue;
      count += 1;
    }
  }
  return count;
};


export interface BunkStatus {
  status: 'safe' | 'critical';
  value: number; 
}

export function calculateBunkStatus(attended: number, conducted: number, target: number = 80): BunkStatus {
  if (conducted === 0) return { status: 'safe', value: 0 };
  
  const currentPercentage = (attended / conducted) * 100;
  
  if (currentPercentage >= target) {
    const bunksAllowed = Math.floor(1.25 * attended - conducted);
    return { status: 'safe', value: bunksAllowed };
  } else {
    const classesNeeded = Math.ceil(4 * conducted - 5 * attended);
    return { status: 'critical', value: classesNeeded };
  }
}
