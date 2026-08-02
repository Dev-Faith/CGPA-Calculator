import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  decodeVerificationPayload,
  type VerificationPayload,
} from "@/lib/student-result-verification";

type VerificationPageProps = {
  searchParams?: Promise<{ data?: string }>;
};

function renderPayload(payload: VerificationPayload) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(232,240,255,1),_rgba(248,250,252,1)_45%,_rgba(255,255,255,1))] px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="overflow-hidden border-slate-200 shadow-xl">
          <CardHeader className="border-b bg-slate-50/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge className="mb-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-600">
                  Verified result
                </Badge>
                <CardTitle className="font-serif text-2xl tracking-wide">
                  Office of the Registrar
                </CardTitle>
              </div>
              <div className="text-right text-sm text-slate-600">
                <div>Ref: {payload.reference}</div>
                <div>Date: {payload.issuedOn}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6 text-sm leading-6 md:p-8">
            <p>
              This verification page confirms the result notification encoded in
              the QR code.
            </p>

            <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Student
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.name}
                </div>
                <div className="font-mono text-sm text-slate-700">
                  {payload.matricNo}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Result
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.remark}
                </div>
                <div className="font-mono text-sm text-slate-700">
                  GPA:{" "}
                  {typeof payload.gpa === "number"
                    ? payload.gpa.toFixed(2)
                    : payload.gpa}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Department
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.dept}
                </div>
                <div className="text-sm text-slate-700">
                  {payload.session ?? "N/A"} / {payload.semester ?? "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Courses
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.courseCount ?? "N/A"}
                </div>
                <div className="text-sm text-slate-700">
                  Recorded course entries
                </div>
              </div>
            </div>

            <p className="text-slate-600">
              If you opened this from a printed result letter, the QR code
              pointed to this page and carries the student-specific payload used
              to generate the document.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function VerifyResultPage({
  searchParams,
}: VerificationPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const data = params?.data;

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700">
        <div className="max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Verification unavailable
          </h1>
          <p className="mt-3 text-sm leading-6">
            This link does not contain a verification payload.
          </p>
        </div>
      </div>
    );
  }

  const payload = decodeVerificationPayload(data);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700">
        <div className="max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Invalid verification code
          </h1>
          <p className="mt-3 text-sm leading-6">
            The QR payload could not be decoded.
          </p>
        </div>
      </div>
    );
  }

  return renderPayload(payload);
}
