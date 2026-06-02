import type { Metadata } from "next";

import { ChatInterface } from "@/components/chat-interface";

export const metadata: Metadata = {
  title: "Semantic Chat",
  description:
    "Interact directly with unified vector context and cross-referenced graph assets.",
};

export default function ChatPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Semantic Chat
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Interact directly with unified vector context and cross-referenced
          graph assets. Answers stream in real time, grounded in your knowledge
          base.
        </p>
      </header>

      <ChatInterface />
    </div>
  );
}
