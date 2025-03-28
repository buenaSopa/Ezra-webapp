import { cn } from "@/lib/utils";

export interface MessageProps {
  content: string;
  role: "user" | "assistant";
  timestamp?: string;
  metadata?: any; // Add optional metadata for sources and other contextual info
}

export function Message({ content, role }: MessageProps) {
  const isUser = role === "user";
  
  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "py-3 px-4 max-w-[80%] rounded-2xl",
        isUser 
          ? "bg-black text-white rounded-tr-none" 
          : "bg-gray-100 text-gray-800 rounded-tl-none"
      )}>
        <div className="whitespace-pre-wrap text-sm">{content}</div>
      </div>
    </div>
  );
} 