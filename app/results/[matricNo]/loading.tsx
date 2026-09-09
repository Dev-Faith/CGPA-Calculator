import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
      <div
        className="flex items-center gap-3 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2Icon className="size-5 animate-spin text-primary" />
        <span>Loading student result...</span>
      </div>
    </main>
  );
}
