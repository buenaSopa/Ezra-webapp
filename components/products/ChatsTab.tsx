import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getProductChatSessions } from "@/app/actions/chat-actions";
import { Spinner } from "@/components/ui/spinner";

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
  const handleOpenChat = (sessionId: string) => {
    window.location.href = `/chat/${sessionId}`;
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
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
                onClick={() => onOpenChat && onOpenChat(session.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{session.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getChatSessionPreview(session.session_type)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created on {formatDate(session.created_at)}
                    </p>
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
          
          <Button variant="outline" className="w-full" onClick={onStartChat}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Start New Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}