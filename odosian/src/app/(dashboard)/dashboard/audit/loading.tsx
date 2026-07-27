import { Skeleton } from "@/components/ui/loading";

export default function AuditLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3 mb-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
