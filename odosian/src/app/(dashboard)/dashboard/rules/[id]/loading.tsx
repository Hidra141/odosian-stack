import { Skeleton } from "@/components/ui/loading";

export default function RuleDetailLoading() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-48 rounded-xl mb-6" />
      <Skeleton className="h-64 rounded-xl mb-6" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
