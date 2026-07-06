// Shared types and localStorage persistence for the AppGap profile flow.
// Each step saves independently — losing one step does not affect others.

export interface AcademicInfo {
  gradeLevel: string;
  unweightedGpa: string;
  satScore: string;
  actScore: string;
}

export interface Course {
  id: string;
  name: string;
  type: string;
  status: string;
  gradeLevel: string;
  apExamScore: string;
}

export interface CareerDirection {
  majorCategory: string;
  specificMajor: string;
  careerInterest: string;
  selectivity: string;
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  grades: string[];
  leadershipRole: string;
  description: string;
  hoursPerWeek: string;
  weeksPerYear: string;
  meaningfulness: number | null;
}

export interface Award {
  id: string;
  name: string;
  level: string;
  grade: string;
}

export interface Step1Data {
  info: AcademicInfo;
  courses: Course[];
}

export interface HighSchoolInfo {
  schoolType: string;
}

export interface Step3Data {
  activities: Activity[];
  awards: Award[];
}

const KEY_STEP1 = "appgap:step1";
const KEY_STEP2 = "appgap:step2";
const KEY_STEP3 = "appgap:step3";
const KEY_SCHOOL = "appgap:school";

function safeParse<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveStep1(info: AcademicInfo, courses: Course[]): void {
  localStorage.setItem(KEY_STEP1, JSON.stringify({ info, courses }));
}

export function loadStep1(): Step1Data | null {
  return safeParse<Step1Data>(KEY_STEP1);
}

export function saveStep2(data: CareerDirection): void {
  localStorage.setItem(KEY_STEP2, JSON.stringify(data));
}

export function loadStep2(): CareerDirection | null {
  return safeParse<CareerDirection>(KEY_STEP2);
}

export function saveStep3(activities: Activity[], awards: Award[]): void {
  localStorage.setItem(KEY_STEP3, JSON.stringify({ activities, awards }));
}

export function loadStep3(): Step3Data | null {
  return safeParse<Step3Data>(KEY_STEP3);
}

export function saveSchoolInfo(data: HighSchoolInfo): void {
  localStorage.setItem(KEY_SCHOOL, JSON.stringify(data));
}

export function loadSchoolInfo(): HighSchoolInfo | null {
  return safeParse<HighSchoolInfo>(KEY_SCHOOL);
}
