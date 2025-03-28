import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface MessageProps {
  content: string;
  role: "user" | "assistant";
  timestamp?: string;
  metadata?: any; // Add optional metadata for sources and other contextual info
}

export function Message({ content, role, metadata }: MessageProps) {
  const isUser = role === "user";
  const [showSources, setShowSources] = useState(false);
  const hasSourceInfo = metadata?.sources && metadata.sources.length > 0;
  
  return (
    <div className="mb-6">
      <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
        <div className={cn(
          "py-3 px-4 max-w-[80%] rounded-2xl",
          isUser 
            ? "bg-black text-white rounded-tr-none" 
            : "bg-gray-100 text-gray-800 rounded-tl-none"
        )}>
          <div className="whitespace-pre-wrap text-sm">{content}</div>
        </div>
      </div>
      
      {/* Source information section */}
      {!isUser && hasSourceInfo && (
        <div className="mt-2 ml-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-gray-500 hover:text-gray-800 px-2 h-auto py-1 flex items-center gap-1"
            onClick={() => setShowSources(!showSources)}
          >
            {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showSources ? "Hide sources" : "Show sources"} ({metadata.sources.length})
          </Button>
          
          {showSources && (
            <div className="mt-2 space-y-2 text-xs">
              {metadata.sources.map((source: any, index: number) => (
                <div key={index} className="border p-2 rounded bg-gray-50">
                  <div className="font-medium mb-1">Source {index + 1} {source.metadata?.rating && `(Rating: ${source.metadata.rating})`}</div>
                  <div className="text-gray-700">{source.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 