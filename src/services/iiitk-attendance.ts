import type {
  IIITKAttendanceApiResponse,
  IIITKCourseAttendance,
  IIITKLoginResponse,
  IIITKRawAttendanceCourse,
  IIITKUser,
} from "@/types";
import { debug } from "@/utils/debug";
import axios from "axios";
import { Platform } from "react-native";

export const PORTAL_BASE_URL = "https://attendance.iiitkottayam.ac.in";

export const calculateRemainingBunks = (
  attended: number,
  totalSessions: number,
): number => {
  if (totalSessions <= 0) return 0;
  const rawPercentage = (attended / totalSessions) * 100;
  if (rawPercentage < 80) return 0;
  const bunks = Math.floor(attended / 0.8 - totalSessions);
  return Math.max(0, bunks);
};

export const calculateSemesterProjectedBunks = (
  attended: number,
  conductedSoFar: number,
  estimatedTotalSemClasses: number,
): number => {
  const semTotal = Math.max(conductedSoFar, estimatedTotalSemClasses);
  const maxAbsencesAllowed = Math.floor(0.20 * semTotal);
  const missedSoFar = conductedSoFar - attended;
  const remainingFutureBunks = maxAbsencesAllowed - missedSoFar;
  return Math.max(0, remainingFutureBunks);
};

const makeRequest = async <T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
  token?: string | null,
): Promise<T> => {
  const targetUrl = `${PORTAL_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (Platform.OS === "web") {
    headers["X-Target-Url"] = targetUrl;
    const response = await axios({
      method,
      url: "/lms-proxy",
      headers,
      data: body ? JSON.stringify(body) : undefined,
    });
    return response.data as T;
  }

  const response = await axios({
    method,
    url: targetUrl,
    headers,
    data: body ? JSON.stringify(body) : undefined,
  });
  return response.data as T;
};

export const loginToIIITKPortal = async (
  email: string,
  password: string,
): Promise<IIITKLoginResponse> => {
  debug.scraper("Logging in to IIITK Attendance Portal...");
  const data = await makeRequest<IIITKLoginResponse>(
    "/api/auth/login",
    "POST",
    { email: email.trim(), password },
  );
  return data;
};

export const refreshIIITKToken = async (
  refreshToken: string,
): Promise<{ access: string }> => {
  debug.scraper("Refreshing IIITK Portal token...");
  const data = await makeRequest<{ access: string }>(
    "/api/auth/refresh",
    "POST",
    { refresh: refreshToken },
  );
  return data;
};

export const fetchIIITKAttendanceData = async (
  accessToken: string,
  termId?: string,
): Promise<{
  courses: IIITKCourseAttendance[];
  student?: IIITKUser;
}> => {
  debug.scraper("Fetching IIITK Attendance data...");
  const query = termId ? `?termId=${encodeURIComponent(termId)}` : "";
  const rawData = await makeRequest<IIITKAttendanceApiResponse | IIITKRawAttendanceCourse[]>(
    `/api/students/me/attendance${query}`,
    "GET",
    undefined,
    accessToken,
  );

  console.log("IIITK RAW ATTENDANCE RESPONSE:", JSON.stringify(rawData, null, 2));

  let rawCourses: IIITKRawAttendanceCourse[] = [];
  let student: IIITKUser | undefined;

  if (Array.isArray(rawData)) {
    rawCourses = rawData;
  } else if (rawData && typeof rawData === "object") {
    const apiRes = rawData as IIITKAttendanceApiResponse;
    student = apiRes.student;
    if (Array.isArray(apiRes.byCourse)) {
      rawCourses = apiRes.byCourse;
    } else if (Array.isArray(apiRes.courses)) {
      rawCourses = apiRes.courses;
    } else {
      const potentialCourses = Object.values(rawData).filter(
        (val) =>
          val &&
          typeof val === "object" &&
          ("attended" in val ||
            "present" in val ||
            "totalClasses" in val ||
            "totalSessions" in val ||
            "total" in val),
      );
      if (potentialCourses.length > 0) {
        rawCourses = potentialCourses as IIITKRawAttendanceCourse[];
      }
    }
  }

  const courses: IIITKCourseAttendance[] = rawCourses.map((rc, idx) => {
    const rawTotal = rc.totalSessions ?? rc.totalClasses ?? rc.total ?? (rc as Record<string, unknown>).t ?? 0;
    const totalSessions = typeof rawTotal === "string" ? Number.parseFloat(rawTotal) || 0 : Number(rawTotal) || 0;

    const rawPresent = rc.present ?? rc.attended ?? rc.attendedClasses ?? (rc as Record<string, unknown>).p ?? (rc as Record<string, unknown>).presentCount;
    let attended = typeof rawPresent === "string" ? Number.parseFloat(rawPresent) : typeof rawPresent === "number" ? rawPresent : undefined;

    const rawPct = rc.percentage ?? (rc as Record<string, unknown>).pct;
    const percentageVal = typeof rawPct === "string" ? Number.parseFloat(rawPct) : typeof rawPct === "number" ? rawPct : undefined;

    // Fallback: If attended is missing/undefined but percentage and totalSessions exist, compute attended
    if ((attended === undefined || (attended === 0 && percentageVal && percentageVal > 0)) && percentageVal !== undefined && totalSessions > 0) {
      attended = Math.round((percentageVal / 100) * totalSessions);
    } else if (attended === undefined) {
      attended = 0;
    }

    const percentage =
      percentageVal !== undefined
        ? Number(percentageVal.toFixed(1))
        : totalSessions > 0
          ? Number(((attended / totalSessions) * 100).toFixed(1))
          : 0;

    const remainingBunks = calculateRemainingBunks(attended, totalSessions);
    const isBelowThreshold = percentage < 80;

    // Estimate total semester classes based on course name/code or general 13-week term (66 instructional days)
    const codeUpper = (rc.courseCode || rc.code || "").toUpperCase();
    let estimatedTotalSemClasses = 45; // default ~13 weeks x 3.5 sessions/week
    if (codeUpper.includes("BTP") || codeUpper.includes("IBP")) {
      estimatedTotalSemClasses = 75; // 6-credit BTP
    } else if (codeUpper.includes("LAB") || codeUpper.endsWith("L")) {
      estimatedTotalSemClasses = 26; // 13 lab sessions
    } else if (codeUpper.includes("3") || codeUpper.includes("414") || codeUpper.includes("415")) {
      estimatedTotalSemClasses = 39; // 3-credit course (3 sessions/week x 13 wks)
    } else if (codeUpper.includes("411") || codeUpper.includes("412") || codeUpper.includes("413") || codeUpper.includes("4")) {
      estimatedTotalSemClasses = 52; // 4-credit course (4-5 sessions/week x 13 wks)
    }
    estimatedTotalSemClasses = Math.max(totalSessions, estimatedTotalSemClasses);

    const projectedSemesterBunks = calculateSemesterProjectedBunks(
      attended,
      totalSessions,
      estimatedTotalSemClasses,
    );

    return {
      courseId: rc.courseId || rc.courseCode || rc.code || `c-${idx}`,
      courseCode: rc.courseCode || rc.code || rc.courseId || "COURSE",
      courseName:
        rc.courseName || rc.name || rc.courseCode || rc.code || "Course",
      totalSessions,
      attended,
      percentage,
      remainingBunks,
      projectedSemesterBunks,
      estimatedTotalSemClasses,
      isBelowThreshold,
    };
  });

  return { courses, student };
};
