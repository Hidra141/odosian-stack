"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";

type Status = "idle" | "verifying" | "success" | "error" | "expired";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage("Your email has been verified successfully!");
        } else if (data.error?.includes("expired")) {
          setStatus("expired");
          setMessage("Verification link has expired. Please request a new one.");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verify();
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-text text-center">
          Email Verification
        </h2>
      </CardHeader>
      <CardBody>
        {status === "idle" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">
              We&apos;ve sent a verification link to your email address. Please
              check your inbox and click the link to verify your account.
            </p>
            <p className="text-text-muted text-xs">
              Didn&apos;t receive the email? Check your spam folder or sign in
              to request a new one.
            </p>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Go to Sign In
              </Button>
            </Link>
          </div>
        )}

        {status === "verifying" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Spinner size="lg" />
            <p className="text-text-secondary text-sm">
              Verifying your email...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-success font-medium">{message}</p>
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </div>
        )}

        {status === "expired" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-warning/10 rounded-full flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-warning)"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <p className="text-warning font-medium">{message}</p>
            <Link href="/login">
              <Button variant="ghost">Sign in to resend</Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-danger/10 rounded-full flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-danger)"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <p className="text-danger font-medium">{message}</p>
            <Link href="/login">
              <Button variant="ghost">Back to Sign In</Button>
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text">
            <span className="text-primary">Odo</span>sian
          </h1>
        </div>
        <Suspense
          fallback={
            <Card>
              <CardBody>
                <div className="flex flex-col items-center gap-4 py-4">
                  <Spinner size="lg" />
                </div>
              </CardBody>
            </Card>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
