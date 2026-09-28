import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "retain";

const variants: Record<Variant, string> = {
  primary:
    "bg-sky-500 text-slate-950 hover:bg-sky-400 focus-visible:outline-sky-400 font-semibold",
  secondary:
    "bg-[#16203a] text-slate-200 ring-1 ring-[#26344f] hover:bg-[#1b2745]",
  ghost: "text-slate-300 hover:bg-[#16203a]",
  danger:
    "bg-red-500/90 text-white hover:bg-red-500 font-semibold",
  retain:
    "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400 font-semibold shadow-[0_0_20px_rgba(139,92,246,0.35)]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function LinkButton({ href, children, variant = "primary", className }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
