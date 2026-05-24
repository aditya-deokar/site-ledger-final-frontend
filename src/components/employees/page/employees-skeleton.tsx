import { Skeleton } from '@/components/ui/skeleton';

export function EmployeesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-60" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="space-y-2 border border-border p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-border border border-border">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center gap-4 p-4 lg:p-6">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
