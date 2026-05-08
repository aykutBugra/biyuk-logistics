"use client";

import { Skeleton } from "primereact/skeleton";

const skeletonPt = {
  root: {
    className: "rounded-xl bg-slate-200 animate-pulse",
  },
};

export default function DashboardPageSkeleton() {
  return (
    <div className="space-y-6" data-motion-skip>
      {/* Stat row skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton pt={skeletonPt} width="40%" height="0.75rem" />
            <Skeleton pt={skeletonPt} className="mt-3" width="30%" height="2rem" />
          </div>
        ))}
      </div>

      {/* Action card row skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton pt={skeletonPt} width="50%" height="0.625rem" />
            <Skeleton pt={skeletonPt} width="80%" height="1.25rem" />
            <Skeleton pt={skeletonPt} width="100%" height="3rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
