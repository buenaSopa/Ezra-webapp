"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatContainer } from "@/components/chat/chat-container";
import { MessageProps } from "@/components/chat/message";
import { Message } from "ai";
import { useChat } from "@ai-sdk/react";
import { 
  getChatSession, 
  getChatMessages, 
  updateChatSessionTitle,
  deleteChatSession
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [chatSession, setChatSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // State for edit mode
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize the AI SDK chat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isSending,
    setMessages,
    error: chatError
  } = useChat({
    api: "/api/chat",
    body: {
      productId: chatSession?.product_id,
      sessionId: id
    },
    experimental_throttle: 100,
    onError: (err: Error) => {
      console.error("Chat error:", err);
      toast.error("Error generating response");
    }
  });

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
        
        // Convert to AI SDK Message format
        const formattedMessages: Message[] = messagesResult.data.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          content: msg.content,
          role: msg.role,
        }));
        
        // Set messages for the chat hook once we have them
        setMessages(formattedMessages);
        setIsInitialized(true);
      } catch (err: any) {
        console.error("Error loading chat data:", err);
        setError(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChatData();
  }, [id, setMessages]);

  // Custom submit handler to intercept the form submission
  const handleSendMessage = (formData: FormData) => {
    const message = formData.get('message') as string;
    if (!message?.trim()) return;
    
    // Pass to AI SDK's handleSubmit
    handleSubmit(new Event('submit') as any);
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

  // Convert AI SDK Messages to MessageProps for the ChatContainer
  const adaptedMessages: MessageProps[] = messages.map((msg: Message) => ({
    content: msg.content,
    role: msg.role as "user" | "assistant",
    metadata: msg.annotations?.length ? { sources: msg.annotations } : undefined
  }));

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
          messages={adaptedMessages}
          onSendMessage={(message) => {
            if (message.trim()) {
              // Set the message and trigger submission
              handleInputChange({ target: { value: message } } as React.ChangeEvent<HTMLInputElement>);
              handleSubmit(new Event('submit') as any);
            }
          }}
          isLoading={isSending}
          inputValue={input}
          onInputChange={handleInputChange}
        />
      </div>
    </div>
  );
}