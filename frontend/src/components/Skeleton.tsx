function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-6 py-3"><SkeletonPulse className="h-4 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-6 py-4"><SkeletonPulse className="h-4 w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center">
            <SkeletonPulse className="h-12 w-12 rounded-md" />
            <div className="ml-5 flex-1 space-y-2">
              <SkeletonPulse className="h-4 w-24" />
              <SkeletonPulse className="h-6 w-16" />
              <SkeletonPulse className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white shadow rounded-lg overflow-hidden">
          <SkeletonPulse className="h-40 w-full rounded-none" />
          <div className="p-3 space-y-2">
            <SkeletonPulse className="h-4 w-3/4" />
            <SkeletonPulse className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8 space-y-2">
        <SkeletonPulse className="h-8 w-48" />
        <SkeletonPulse className="h-4 w-72" />
      </div>
      <CardSkeleton count={4} />
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <SkeletonPulse className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <SkeletonPulse className="h-8 w-20 mb-2" />
                <SkeletonPulse className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {[1, 2].map((n) => (
          <div key={n} className="bg-white shadow rounded-lg p-6">
            <SkeletonPulse className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <SkeletonPulse className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonPulse className="h-4 w-3/4" />
                    <SkeletonPulse className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
