import type { Metadata } from "next";

import { ChatInterface } from "@/components/chat-interface";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace-layout";
import { requireAuth } from "@/lib/require-auth";

export const metadata: Metadata = {
  title: "Semantic Chat",
  description:
    "Interact directly with unified vector context and cross-referenced graph assets.",
};

export default async function ChatPage() {
  await requireAuth("/chat");

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Grounded conversation"
        title="Semantic Chat"
        description="Interact directly with unified vector context and cross-referenced graph assets. Answers stream in real time, grounded in your knowledge base."
      />

      <ChatInterface />
    </WorkspacePage>
  );
}
