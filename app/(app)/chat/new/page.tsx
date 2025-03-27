"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createChatSession } from "@/app/actions/chat-actions";
import { Spinner } from "@/components/ui/spinner";

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createNewChat = async () => {
      if (!productId) {
        setError("No product ID provided. Please go back and try again.");
        setIsLoading(false);
        return;
      }

      try {
        // Create a new chat session
        const result = await createChatSession({
          productId,
          sessionType: "general"
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create chat session");
        }

        // Navigate to the new chat session
        router.push(`/chat/${result.data.id}`);
      } catch (err: any) {
        console.error("Error creating chat session:", err);
        setError(`Error creating chat session: ${err.message}`);
        setIsLoading(false);
      }
    };

    createNewChat();
  }, [productId, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Spinner size="lg" />
      <p className="mt-4 text-muted-foreground">Creating your chat session...</p>
    </div>
  );
}