import { Skeleton } from '@/components/ui/skeleton';

export function EmployeeWorkspaceSkeleton() {
  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="space-y-2 border border-border p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((index) => (
          <div key={index} className="space-y-2 border border-border p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
