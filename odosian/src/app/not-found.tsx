import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
      <h2 className="text-xl font-semibold text-text mb-2">Page Not Found</h2>
      <p className="text-text-secondary text-sm mb-8 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 border border-border text-text rounded-lg text-sm font-medium hover:bg-surface-light transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
