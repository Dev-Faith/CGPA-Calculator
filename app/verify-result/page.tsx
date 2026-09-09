import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  decodeVerificationPayload,
  type VerificationPayload,
} from "@/lib/student-result-verification";

type VerificationPageProps = {
  searchParams?: Promise<{ data?: string }>;
};

function renderPayload(payload: VerificationPayload) {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge className="mb-2 rounded-full">
                  Verified result
                </Badge>
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  ELERINMOSA COLLEGE OF TECHNOLOGY AND MANAGEMENT SCIENCE (ECOTEMS)
                </div>
                <CardTitle className="mt-1 text-2xl tracking-tight">
                  Office of the Registrar
                </CardTitle>
              </div>
              <div className="text-right text-sm text-muted-foreground">
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

            <div className="grid gap-4 rounded-lg border bg-muted/30 p-5 md:grid-cols-2">
              <div>
                <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Student
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.name}
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                  {payload.matricNo}
                </div>
              </div>
              <div>
                <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Result
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.remark}
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                  GPA:{" "}
                  {typeof payload.gpa === "number"
                    ? payload.gpa.toFixed(2)
                    : payload.gpa}
                </div>
              </div>
              <div>
                <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Department
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.dept}
                </div>
                <div className="text-sm text-muted-foreground">
                  {payload.session ?? "N/A"} / {payload.semester ?? "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Courses
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {payload.courseCount ?? "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Recorded course entries
                </div>
              </div>
            </div>

            <p className="text-muted-foreground">
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
      <div className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Verification unavailable</CardTitle><CardDescription>This link does not contain a verification payload.</CardDescription></CardHeader>
        </Card>
      </div>
    );
  }

  const payload = decodeVerificationPayload(data);

  if (!payload) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Invalid verification code</CardTitle><CardDescription>The QR payload could not be decoded.</CardDescription></CardHeader>
        </Card>
      </div>
    );
  }

  return renderPayload(payload);
}
