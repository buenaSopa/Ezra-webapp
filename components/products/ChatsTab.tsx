import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Edit, Trash2, MoreVertical, Check, X } from "lucide-react";
import { getProductChatSessions, updateChatSessionTitle, deleteChatSession } from "@/app/actions/chat-actions";
import { Spinner } from "@/components/ui/spinner";
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
import { useRouter } from "next/navigation";

interface ChatSession {
  id: string;
  title: string;
  session_type: string;
  created_at: string;
}

interface ChatsTabProps {
  productId: string;
  productName: string;
  onStartChat: () => void;
  onOpenChat?: (sessionId: string) => void;
}

export default function DefaultChatsTab({ 
  productId,
  productName, 
  onStartChat 
}: ChatsTabProps) {
  const router = useRouter();
  
  const handleOpenChat = (sessionId: string) => {
    router.push(`/chat/${sessionId}`);
  };

  return (
    <ChatsTab
      productId={productId}
      productName={productName}
      onStartChat={onStartChat}
      onOpenChat={handleOpenChat}
    />
  );
}

export function ChatsTab({
  productId,
  productName,
  onStartChat,
  onOpenChat
}: ChatsTabProps) {
  const router = useRouter();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for editing and deleting
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchChatSessions = async () => {
    try {
      const result = await getProductChatSessions(productId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch chat sessions");
      }
      setChatSessions(result.data);
    } catch (err: any) {
      console.error("Error fetching chat sessions:", err);
      setError("Failed to load chat sessions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatSessions();
  }, [productId]);

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get a preview/excerpt for the chat session
  const getChatSessionPreview = (sessionType: string) => {
    const previewMap: Record<string, string> = {
      "general": "General conversation about the product",
      "analysis": "Analysis of product features and performance",
      "marketing_angle": "Marketing angle and positioning discussion",
      "script_generation": "Script generation for product advertisement"
    };

    return previewMap[sessionType] || "Chat about this product";
  };

  // Handle editing the chat title
  const handleEditTitle = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditedTitle(session.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingSessionId) return;
    if (!editedTitle.trim()) {
      toast.error("Chat title cannot be empty");
      return;
    }

    try {
      const result = await updateChatSessionTitle({
        sessionId: editingSessionId,
        title: editedTitle.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update chat title");
      }

      // Update the local state
      setChatSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === editingSessionId 
            ? { ...session, title: editedTitle.trim() } 
            : session
        )
      );
      
      toast.success("Chat title updated successfully");
    } catch (err: any) {
      console.error("Error updating chat title:", err);
      toast.error(`Failed to update chat title: ${err.message}`);
    } finally {
      setEditingSessionId(null);
      setEditedTitle("");
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
    setEditedTitle("");
    setIsEditingTitle(false);
  };

  // Handle deleting the chat session
  const handleDeleteChat = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      const result = await deleteChatSession(sessionId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete chat session");
      }

      // Remove the deleted session from the state
      setChatSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      toast.success("Chat session deleted successfully");
    } catch (err: any) {
      console.error("Error deleting chat session:", err);
      toast.error(`Failed to delete chat session: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(null);
    }
  };

  const handleCardClick = (e: React.MouseEvent, sessionId: string) => {
    // Check if the click event target or its ancestors have the custom data attribute
    if (
      e.target && 
      (
        (e.target as HTMLElement).closest('[data-no-navigation="true"]') ||
        editingSessionId === sessionId ||
        isEditingTitle
      )
    ) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    
    // Otherwise, navigate to the chat
    onOpenChat && onOpenChat(sessionId);
  };

  const handleOpenDeleteDialog = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteDialogOpen(sessionId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous chats about {productName}</CardTitle>
        <CardDescription>
          View your conversation history about this product
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
            </div>
          ) : chatSessions.length > 0 ? (
            chatSessions.map(session => (
              <Card 
                key={session.id} 
                className="p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={(e) => handleCardClick(e, session.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-2" data-no-navigation="true">
                          <Input
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="h-8 max-w-[300px]"
                            placeholder="Enter chat title"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => handleSaveTitle(e)}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => handleCancelEdit(e)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="font-medium text-foreground">{session.title}</h3>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {getChatSessionPreview(session.session_type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created on {formatDate(session.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div data-no-navigation="true">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => handleEditTitle(session, e)}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit Title
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDeleteDialogOpen(session.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No chat sessions yet</p>
            </div>
          )}
          
          {/* <Button variant="outline" className="w-full" onClick={onStartChat}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Start New Chat
          </Button> */}
        </div>

        {/* Move AlertDialog outside of the card components so it's not affected by card clicks */}
        {chatSessions.map(session => (
          <AlertDialog 
            key={`delete-dialog-${session.id}`}
            open={deleteDialogOpen === session.id} 
            onOpenChange={(open) => !open && setDeleteDialogOpen(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete this chat session and all its messages.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => handleDeleteChat(session.id, e)}
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
        ))}
      </CardContent>
    </Card>
  );
}