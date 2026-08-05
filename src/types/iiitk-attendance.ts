export interface IIITKCourseAttendance {
  courseId: string;
  courseCode: string;
  courseName: string;
  totalSessions: number;
  attended: number;
  percentage: number;
  remainingBunks: number;
  projectedSemesterBunks: number;
  estimatedTotalSemClasses: number;
  isBelowThreshold: boolean;
}

export interface IIITKUser {
  rollNo: string;
  name: string;
  branch: string;
  semester: number;
}

export interface IIITKLoginResponse {
  access: string;
  refresh: string;
  user: IIITKUser;
}

export interface IIITKRawAttendanceCourse {
  courseId?: string;
  courseCode?: string;
  code?: string;
  courseName?: string;
  name?: string;
  totalSessions?: number;
  totalClasses?: number;
  total?: number;
  attended?: number;
  attendedClasses?: number;
  present?: number;
  percentage?: number;
}

export interface IIITKAttendanceApiResponse {
  courses?: IIITKRawAttendanceCourse[];
  byCourse?: IIITKRawAttendanceCourse[];
  student?: IIITKUser;
  [key: string]: unknown;
}
