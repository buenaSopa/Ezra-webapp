import React, { FormEvent, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  value,
  onChange
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = React.useState("");
  
  // Use controlled input if provided
  const isControlled = value !== undefined && onChange !== undefined;
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isControlled) {
      onChange?.(e);
    } else {
      setMessage(e.target.value);
    }
    
    // Auto resize the textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const messageToSend = isControlled ? value : message;
    
    if (messageToSend?.trim()) {
      onSend(messageToSend);
      if (!isControlled) {
        setMessage("");
      }
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "inherit";
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        ref={textareaRef}
        value={isControlled ? value : message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="resize-none min-h-[50px] pr-10 py-3"
        rows={1}
      />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="absolute right-2 top-2.5 h-8 w-8 p-0"
        disabled={disabled || !(isControlled ? value?.trim() : message?.trim())}
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
} 