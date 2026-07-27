"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold text-danger mb-2">Error</h1>
      <h2 className="text-lg font-semibold text-text mb-2">Something went wrong</h2>
      <p className="text-text-secondary text-sm mb-6 text-center max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={() => unstable_retry()}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
