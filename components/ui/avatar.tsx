import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Avatar({ className, children, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 