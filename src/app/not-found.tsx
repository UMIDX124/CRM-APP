import Link from "next/link";
import WolfLogo from "@/components/WolfLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[400px] bg-[var(--primary)]/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[300px] bg-[var(--info)]/[0.03] rounded-full blur-[80px]" />
      </div>

      <div className="relative text-center max-w-md animate-fade-in-up">
        <div className="flex justify-center mb-6 opacity-20">
          <WolfLogo size="mark" className="opacity-40" />
        </div>
        <div className="text-[100px] font-black leading-none mb-4 select-none text-gradient-primary">
          404
        </div>
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2 tracking-tight">Lost in the wilderness</h1>
        <p className="text-sm text-[var(--foreground-dim)] mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="btn-primary inline-flex px-8 py-3 text-sm">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
