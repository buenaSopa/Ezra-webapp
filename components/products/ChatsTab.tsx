import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: string; // ISO date string
}

interface ChatsTabProps {
  productName: string;
  chatSessions: ChatSession[];
  onStartChat: () => void;
  onOpenChat?: (sessionId: string) => void;
}

export function ChatsTab({
  productName,
  chatSessions = [],
  onStartChat,
  onOpenChat
}: ChatsTabProps) {
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
          {chatSessions.length > 0 ? (
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
                      {session.preview}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created on {formatDate(session.createdAt)}
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

// Example usage with mock data
export default function DefaultChatsTab({ productName, onStartChat }: { productName: string, onStartChat: () => void }) {
  const mockChatSessions: ChatSession[] = [
    {
      id: "1",
      title: `${productName} reduces your Tan lines`,
      preview: `I've been using the ${productName} for a week now, and I can already see a reduction in my tan lines.`,
      createdAt: "2023-05-15T12:00:00Z"
    },
    {
      id: "2",
      title: `Competitor analysis: ${productName} vs alternatives`,
      preview: `Analyzed how ${productName} compares to top 3 competitors in the market.`,
      createdAt: "2023-04-28T12:00:00Z"
    }
  ];

  return (
    <ChatsTab 
      productName={productName} 
      chatSessions={mockChatSessions} 
      onStartChat={onStartChat} 
    />
  );
} 