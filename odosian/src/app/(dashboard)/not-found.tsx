import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-5xl font-bold text-primary mb-2">404</h1>
      <h2 className="text-lg font-semibold text-text mb-2">Page Not Found</h2>
      <p className="text-text-secondary text-sm mb-6 text-center max-w-md">
        This page doesn&apos;t exist in the dashboard.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
