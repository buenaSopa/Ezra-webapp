import Link from "next/link";
import { formatDistance } from "date-fns";
import { MessageSquare, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserChatSessions } from "@/app/actions/chat-actions";
import { AddProductButton } from "@/components/add-product-dialog";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  session_type: string;
  products: {
    id: string;
    name: string;
    metadata: any;
  };
}

interface RecentChatsProps {
  limit?: number;
}

export async function RecentChats({ limit = 5 }: RecentChatsProps) {
  const { success, data: chatSessions } = await getUserChatSessions();
  
  // If there are no chat sessions, show the get started message
  if (!success || !chatSessions || chatSessions.length === 0) {
    return (
      <div className="text-center max-w-[400px] px-4 mx-auto">
        <h2 className="text-2xl font-semibold mb-3">Get Started</h2>
        <p className="text-muted-foreground mb-6">Add your first product to start creating marketing content</p>
        <AddProductButton />
      </div>
    );
  }
  
  // Determine if we should show the "View all" link
  const hasMoreChats = chatSessions.length > limit;
  const chatsToShow = chatSessions.slice(0, limit);
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Recent Conversations</CardTitle>
        <CardDescription>Continue where you left off</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {chatsToShow.map((chat: ChatSession) => (
            <Link 
              href={`/chat/${chat.id}`} 
              key={chat.id}
              className="flex items-center justify-between py-3 px-2 hover:bg-muted transition-colors rounded-md -mx-2"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-md">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{chat.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {chat.products?.name} • {formatDistance(new Date(chat.updated_at), new Date(), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 