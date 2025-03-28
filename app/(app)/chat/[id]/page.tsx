"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatContainer } from "@/components/chat/chat-container";
import { MessageProps } from "@/components/chat/message";
import { 
  getChatSession, 
  getChatMessages, 
  updateChatSessionTitle,
  deleteChatSession,
  chatWithProductReviews
} from "@/app/actions/chat-actions";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Edit, Trash2, Check, X, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ChatPageProps {
  params: {
    id: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatSession, setChatSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // State for edit mode
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load chat session and messages
  useEffect(() => {
    const loadChatData = async () => {
      try {
        // Get chat session details
        const sessionResult = await getChatSession(id);
        if (!sessionResult.success) {
          throw new Error(sessionResult.error || "Failed to load chat session");
        }
        
        setChatSession(sessionResult.data);
        setEditedTitle(sessionResult.data.title); // Initialize edited title
        
        // Get chat messages
        const messagesResult = await getChatMessages(id);
        if (!messagesResult.success) {
          throw new Error(messagesResult.error || "Failed to load chat messages");
        }
        
        // Convert to message props format
        const formattedMessages = messagesResult.data.map((msg: any) => ({
          content: msg.content,
          role: msg.role,
          metadata: msg.metadata,
        }));
        
        setMessages(formattedMessages);
      } catch (err: any) {
        console.error("Error loading chat data:", err);
        setError(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChatData();
  }, [id]);

  const handleSendMessage = async (message: string) => {
    // Add user message to chat
    const userMessage: MessageProps = {
      content: message,
      role: "user"
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    
    try {
      // Format all messages for the RAG API
      const chatMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Get the product ID from the chat session
      const productId = chatSession?.product_id;
      
      // Call the RAG API with all messages
      const response = await chatWithProductReviews(chatMessages, productId);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Create assistant response with source metadata
      const assistantMessage: MessageProps = {
        content: response.message,
        role: "assistant",
        metadata: {
          sources: response.sources
        }
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in chat:", error);
      
      // Add error message as assistant response
      const errorMessage: MessageProps = {
        content: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        role: "assistant"
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Failed to generate response");
    } finally {
      setIsSending(false);
    }
  };

  // Handle editing the chat title
  const handleEditTitle = () => {
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      toast.error("Chat title cannot be empty");
      return;
    }

    setIsSavingTitle(true);
    try {
      const result = await updateChatSessionTitle({
        sessionId: id,
        title: editedTitle.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update chat title");
      }

      // Update local state
      setChatSession({ ...chatSession, title: editedTitle.trim() });
      toast.success("Chat title updated successfully");
    } catch (err: any) {
      console.error("Error updating chat title:", err);
      toast.error(`Failed to update chat title: ${err.message}`);
    } finally {
      setIsSavingTitle(false);
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(chatSession?.title || ""); // Reset to original title
    setIsEditingTitle(false);
  };

  // Handle deleting the chat session
  const handleDeleteChat = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteChatSession(id);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete chat session");
      }

      toast.success("Chat session deleted successfully");
      
      // Navigate back to the product page
      router.push(`/products/${result.productId}`);
    } catch (err: any) {
      console.error("Error deleting chat session:", err);
      toast.error(`Failed to delete chat session: ${err.message}`);
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Helper function to generate responses based on prompts
  const getResponseForMessage = (message: string): string => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes("script") || lowerMsg.includes("write")) {
      return "I'd be happy to help you write an ad script! To create an effective script, I'll need some information:\n\n1. What's the product or service you're advertising?\n2. Who is your target audience?\n3. What's the key message or benefit you want to highlight?\n4. How long should the script be (15s, 30s, 60s)?\n\nOnce you provide these details, I can craft a compelling script for your campaign.";
    }
    
    if (lowerMsg.includes("storyboard") || lowerMsg.includes("build")) {
      return "Creating a storyboard is a great way to visualize your ad before production. Let's break this down into steps:\n\n1. First, let's clarify the key scenes you want to include\n2. For each scene, we'll describe the visuals, text overlays, and any voiceover\n3. We'll include timing for each segment\n\nWhat's the core concept of your ad that you'd like to storyboard?";
    }
    
    if (lowerMsg.includes("variation") || lowerMsg.includes("generate")) {
      return "I can help generate ad variations to test different approaches. Some aspects we can vary include:\n\n• Headline approaches (question, statistic, direct benefit)\n• Tone (humorous, serious, inspirational)\n• Call-to-action phrasing\n• Value proposition emphasis\n\nWhich ad would you like me to create variations for?";
    }
    
    return `I'm here to help with your product "${chatSession?.products?.name}". What would you like to know about it?`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Loading chat session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full max-w-6xl mx-auto relative">
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 bg-background border-b flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/products/${chatSession?.product_id}`)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
        </Button>
        
        {isEditingTitle ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="h-9"
              placeholder="Enter chat title"
              disabled={isSavingTitle}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSaveTitle}
              disabled={isSavingTitle}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancelEdit}
              disabled={isSavingTitle}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <h2 className="text-lg font-medium">{chatSession?.title}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditTitle}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Title
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Chat
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will permanently delete this chat session and all its messages.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteChat} 
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        {isDeleting ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Deleting...
                          </>
                        ) : (
                          "Delete"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      
      {/* Adjust top padding to account for the header */}
      <div className="pt-16 h-full">
        <ChatContainer
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isSending}
        />
      </div>
    </div>
  );
}