import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="grid flex-1 place-items-center p-6">
      <div
        className="flex items-center gap-3 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2Icon className="size-5 animate-spin text-primary" />
        <span>Loading result import...</span>
      </div>
    </div>
  );
}
