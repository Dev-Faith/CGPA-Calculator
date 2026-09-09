"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  LockKeyholeIcon,
  UserIcon,
} from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="items-center border-b text-center">
          <div className="mb-2 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <GraduationCapIcon className="size-6" />
          </div>
          <CardTitle>Administrator sign in</CardTitle>
          <CardDescription>
            Manage result imports, review drafts, and publish approved results.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={formAction} className="grid gap-5">
            {state.error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {state.error}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  disabled={isPending}
                  className="pl-9"
                  placeholder="Enter your username"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyholeIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="pl-9 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={isPending}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Looking for a result?{" "}
            <Link
              href="/results"
              className="font-medium text-primary hover:underline"
            >
              Student lookup
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
