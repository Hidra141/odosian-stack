import { Skeleton } from "@/components/ui/loading";

export default function AnalysisLoading() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-64 rounded-xl mb-6" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
