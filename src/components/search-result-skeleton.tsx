import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function SearchResultSkeleton() {
  return (
    <Card className="border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
          <Skeleton className="h-9 w-16 rounded" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SearchResultsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-5 w-64 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <SearchResultSkeleton />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
