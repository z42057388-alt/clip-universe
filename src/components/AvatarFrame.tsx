import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import bronzeImg from "@/assets/frames/bronze.png";
import silverImg from "@/assets/frames/silver.png";
import goldImg from "@/assets/frames/gold.png";
import neonImg from "@/assets/frames/neon.png";
import rubyImg from "@/assets/frames/ruby.png";
import diamondRedImg from "@/assets/frames/diamond_red.png";
import cyberpunkRedImg from "@/assets/frames/cyberpunk_red.png";

// Maps frame id -> frame overlay image (kept client-side so bundler includes them)
export const FRAME_IMAGES: Record<string, string> = {
  bronze: bronzeImg,
  silver: silverImg,
  gold: goldImg,
  neon: neonImg,
  ruby: rubyImg,
  cyberpunk_red: cyberpunkRedImg,
  diamond_red: diamondRedImg,
};

interface Props {
  frame?: string | null;
  className?: string;
  children: ReactNode;
}

export const AvatarFrame = ({ frame, className, children }: Props) => {
  const img = frame ? FRAME_IMAGES[frame] : undefined;
  return (
    <div className={cn("relative inline-block shrink-0", className)}>
      {children}
      {img && (
        <img
          src={img}
          alt=""
          loading="lazy"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[135%] h-[135%] max-w-none object-contain"
        />
      )}
    </div>
  );
};
