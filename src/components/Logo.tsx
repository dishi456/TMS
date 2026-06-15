// Tenant Management System wordmark logo. Aspect ratio ~3.5:1.
export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="Tenant Management System" className={`w-auto ${className}`} />
  );
}
