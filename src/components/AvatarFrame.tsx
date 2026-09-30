import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Maps frame id -> ring classes (kept client-side so dynamic classes are not purged)
const FRAME_STYLES: Record<string, string> = {
  bronze: "ring-4 ring-amber-600",
  silver: "ring-4 ring-slate-300",
  gold: "ring-4 ring-yellow-400",
  neon: "ring-4 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]",
  ruby: "ring-4 ring-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.7)]",
  diamond_red: "ring-4 ring-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)]",
};

interface Props {
  frame?: string | null;
  className?: string;
  children: ReactNode;
}

export const AvatarFrame = ({ frame, className, children }: Props) => (
  <div className={cn("rounded-full", frame && FRAME_STYLES[frame], className)}>{children}</div>
);
