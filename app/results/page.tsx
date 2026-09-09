"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GraduationCapIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResultsPage() {
  const router = useRouter();
  const [matricNo, setMatricNo] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = matricNo.trim().toUpperCase();
    if (normalized) router.push(`/results/${encodeURIComponent(normalized)}`);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="items-center border-b text-center">
          <div className="mb-2 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <GraduationCapIcon className="size-6" />
          </div>
          <CardTitle>Student result lookup</CardTitle>
          <CardDescription>Enter your matric number to view published semester results and cumulative GPA.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="matricNo">Matric number</Label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="matricNo" value={matricNo} onChange={(event) => setMatricNo(event.target.value)} placeholder="e.g. ECT25/COM/001" className="pl-9 uppercase" autoCapitalize="characters" autoComplete="off" required />
              </div>
            </div>
            <Button type="submit" className="w-full">View result</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Administrator? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
