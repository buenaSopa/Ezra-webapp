import { useRef, useEffect } from "react";
import { Message, MessageProps } from "./message";
import { ChatInput } from "./chat-input";
import { ChatSuggestions } from "./chat-suggestion";

interface ChatContainerProps {
  messages: MessageProps[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  title?: string;
  inputValue?: string;
  onInputChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function ChatContainer({ 
  messages, 
  onSendMessage, 
  isLoading = false, 
  title = "EzraGPT",
  inputValue,
  onInputChange
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const handleSend = (message: string) => {
    onSendMessage(message);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const defaultSuggestions = [
    "Give Me the Product Summary",
  ];

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-sm">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-10">
            <h2 className="text-2xl font-bold mb-4">Chat with review insights!</h2>
            <p className="max-w-md">Ask questions about the product reviews to understand customer feedback.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message key={index} {...message} />
          ))
        )}
        
        {isLoading && (
          <div className="flex items-center space-x-1.5 animate-pulse p-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-primary animation-delay-150"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-primary animation-delay-300"></div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestion Pills */}
      {messages.length === 0 && (
        <div className="px-4 py-3 flex flex-wrap justify-center gap-2">
          {defaultSuggestions.map((suggestion, index) => (
            <button
              key={index}
              className="bg-gray-100 hover:bg-gray-200 text-sm px-4 py-2 rounded-full text-gray-700 transition-colors"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t">
        <ChatInput 
          onSend={handleSend} 
          disabled={isLoading} 
          placeholder="Ask about the product reviews..."
          value={inputValue}
          onChange={onInputChange}
        />
      </div>
    </div>
  );
} 