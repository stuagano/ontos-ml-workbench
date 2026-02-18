/**
 * Skeleton - Loading placeholder components
 *
 * Provides visual loading states that match the shape of content being loaded.
 */

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

// Base animated skeleton bar
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-db-gray-200 rounded',
        className
      )}
    />
  );
}

// Card skeleton for template cards, job cards, etc.
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Table row skeleton
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-3 border-b border-db-gray-100">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-6 rounded" />
    </div>
  );
}

// Stats card skeleton
export function SkeletonStats() {
  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// Grid of skeleton cards
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// List of skeleton rows
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white rounded-lg border border-db-gray-200">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// Page header skeleton
export function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}

// Full page loading skeleton
export function SkeletonPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <SkeletonHeader />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStats key={i} />
        ))}
      </div>
      <SkeletonCardGrid />
    </div>
  );
}
