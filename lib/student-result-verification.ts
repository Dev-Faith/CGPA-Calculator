export type VerificationPayload = {
  name: string;
  matricNo: string;
  remark: string;
  gpa: number | string;
  dept: string;
  session?: string;
  semester?: string;
  courseCount?: number;
  issuedOn: string;
  reference: string;
};

function toBase64Url(value: string) {
  if (typeof window === "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  if (typeof window === "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  return decodeURIComponent(
    Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
  );
}

export function createVerificationPayload(
  student: { name: string; matricNo: string; remark: string; gpa: number | string },
  department: { name: string; session?: string; semester?: string; courses?: unknown[] },
  issuedOn: string,
  reference: string,
): VerificationPayload {
  return {
    name: student.name,
    matricNo: student.matricNo,
    remark: student.remark,
    gpa: student.gpa,
    dept: department.name,
    session: department.session,
    semester: department.semester,
    courseCount: department.courses?.length ?? 0,
    issuedOn,
    reference,
  };
}

export function encodeVerificationPayload(payload: VerificationPayload) {
  // Use compact keys to ensure QR code payload is minimal and never exceeds QR capacity
  const compact = {
    n: payload.name,
    m: payload.matricNo,
    r: payload.remark,
    g: payload.gpa,
    d: payload.dept,
    s: payload.session,
    sem: payload.semester,
    c: payload.courseCount,
    i: payload.issuedOn,
    ref: payload.reference,
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeVerificationPayload(encoded: string): VerificationPayload | null {
  try {
    const raw = JSON.parse(fromBase64Url(encoded));
    if (!raw) return null;

    // Legacy format compatibility (where student/department were full nested objects)
    if (raw.student && raw.department) {
      return {
        name: raw.student.name || "",
        matricNo: raw.student.matricNo || "",
        remark: raw.student.remark || "",
        gpa: raw.student.gpa ?? "",
        dept: raw.department.name || "",
        session: raw.department.session,
        semester: raw.department.semester,
        courseCount: raw.department.courses?.length ?? 0,
        issuedOn: raw.issuedOn || "",
        reference: raw.reference || "",
      };
    }

    return {
      name: raw.n || raw.name || "",
      matricNo: raw.m || raw.matricNo || "",
      remark: raw.r || raw.remark || "",
      gpa: raw.g ?? raw.gpa ?? "",
      dept: raw.d || raw.dept || "",
      session: raw.s || raw.session,
      semester: raw.sem || raw.semester,
      courseCount: raw.c ?? raw.courseCount,
      issuedOn: raw.i || raw.issuedOn || "",
      reference: raw.ref || raw.reference || "",
    };
  } catch {
    return null;
  }
}

export const VERIFICATION_BASE_URL = "https://cgpa-calculator-pearl.vercel.app";

export function buildVerificationUrl(baseUrl: string = VERIFICATION_BASE_URL, payload: VerificationPayload) {
  const effectiveBase = baseUrl || VERIFICATION_BASE_URL;
  const url = new URL("/verify-result", effectiveBase);
  url.searchParams.set("data", encodeVerificationPayload(payload));
  return url.toString();
}