"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PaperPlaneRight,
  Robot,
  User,
  WarningCircle,
} from "@phosphor-icons/react";

import { streamChatResponse } from "@/lib/api-client";
import { AuthenticationRequiredError } from "@/lib/auth-fetch";
import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const ERROR_NOTICE =
  "The connection to the GraphRAG engine was interrupted. Please try sending your message again.";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [erroredIds, setErroredIds] = useState<Set<string>>(new Set());

  const viewportRef = useRef<HTMLDivElement>(null);

  // Smoothly track printing tokens by pinning the viewport to the bottom
  // whenever the message array changes (new turn or streamed content).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // History must reflect only the turns that preceded this exchange.
    const history = messages;

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      for await (const token of streamChatResponse(trimmed, history)) {
        // Mutate only the placeholder's content via its unique id so the rest
        // of the array stays referentially stable and does not flash.
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + token }
              : message
          )
        );
      }
    } catch (caughtError) {
      if (caughtError instanceof AuthenticationRequiredError) {
        return;
      }
      setErroredIds((prev) => new Set(prev).add(assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Robot weight="duotone" className="size-4 text-primary" />
          Conversation
        </CardTitle>
      </CardHeader>

      <CardContent
        ref={viewportRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto py-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Robot weight="duotone" className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Ask anything about your knowledge base
            </p>
            <p className="max-w-sm text-xs/relaxed text-muted-foreground">
              Responses are grounded in unified vector context and
              cross-referenced graph assets.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLoading={isLoading}
              errored={erroredIds.has(message.id)}
            />
          ))
        )}
      </CardContent>

      <CardFooter className="border-t pt-4">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Send a message..."
            autoComplete="off"
            disabled={isLoading}
            aria-label="Message input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? <Spinner /> : <PaperPlaneRight weight="fill" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

function MessageBubble({
  message,
  isLoading,
  errored,
}: {
  message: Message;
  isLoading: boolean;
  errored: boolean;
}) {
  const isUser = message.role === "user";
  const isStreaming =
    !isUser && isLoading && message.content.length === 0 && !errored;

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {isUser ? (
          <User weight="fill" className="size-4" />
        ) : (
          <Robot weight="fill" className="size-4" />
        )}
      </span>

      <div
        className={cn(
          "flex max-w-[88%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-card-foreground shadow-sm"
        )}
      >
        {isStreaming ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Spinner />
            Thinking...
          </span>
        ) : (
          message.content && (
            <MessageContent content={message.content} isUser={isUser} />
          )
        )}

        {errored && (
          <Alert variant="destructive">
            <WarningCircle weight="fill" />
            <AlertTitle>Response interrupted</AlertTitle>
            <AlertDescription>{ERROR_NOTICE}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

function MessageContent({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  if (isUser) {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }

  return (
    <div className="flex flex-col gap-3 overflow-hidden break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-3 text-xl font-semibold first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 text-lg font-semibold first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-base font-semibold first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="leading-6">{children}</p>,
          ul: ({ children }) => (
            <ul className="ml-5 list-disc marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-5 list-decimal marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="my-1 leading-6">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);

            return isBlock ? (
              <code className={cn("block overflow-x-auto", className)}>
                {children}
              </code>
            ) : (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-5">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <div className="my-3 h-px bg-border" />,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-md border">
              <table className="w-full border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b bg-muted px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b px-3 py-2 align-top leading-5">
              {children}
            </td>
          ),
        }}
      >
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

function normalizeMarkdown(content: string): string {
  return content.replace(/<br\s*\/?>/gi, "  \n");
}
