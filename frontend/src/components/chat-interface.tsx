"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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

    const history = messages;

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      for await (const token of streamChatResponse(trimmed, history)) {
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
    <Card className="flex h-[640px] flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-3">
          <Robot weight="duotone" className="size-4 text-primary" />
          Conversation
        </CardTitle>
      </CardHeader>

      <CardContent
        ref={viewportRef}
        className="flex flex-1 flex-col gap-5 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <Empty className="flex-1 border-none">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Robot weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>Ask anything about your knowledge base</EmptyTitle>
              <EmptyDescription>
                Responses are grounded in unified vector context and
                cross-referenced graph assets.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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

      <CardFooter className="border-t">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-3">
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
            size="sm"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            className="px-4"
          >
            {isLoading ? (
              <Spinner />
            ) : (
              <>
                <PaperPlaneRight weight="fill" />
                Enter message
              </>
            )}
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
        "flex items-start gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md border",
          isUser
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted text-primary"
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
          "flex max-w-[88%] flex-col gap-2 rounded-lg border px-4 py-3 text-sm",
          isUser
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted text-foreground"
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
    return <p className="whitespace-pre-wrap wrap-break-word">{content}</p>;
  }

  return (
    <div className="flex flex-col gap-3 overflow-hidden wrap-break-word">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
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
              <code className="rounded bg-background px-1 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs leading-5">
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
            <div className="my-2 overflow-x-auto rounded-md border border-border">
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
  let normalized = content.replace(/\r\n/g, "\n");
  normalized = normalized.replace(/<br\s*\/?>/gi, "  \n");

  // Some model outputs use standalone "$" lines to fence equations.
  // Collapse those into $$ blocks so the markdown math parser can render them.
  normalized = normalized.replace(
    /(^|\n)\$\n([\s\S]*?)\n\$(?=\n|$)/g,
    (_match, leading, math) => `${leading}$$\n${math.trim()}\n$$`
  );

  // LLMs often emit LaTeX using \(...\) and \[...\] delimiters.
  // Convert them into the delimiter style supported by remark-math.
  normalized = normalized
    .replace(/\\\[((?:.|\n)*?)\\\]/g, "\n\n$$\n$1\n$$\n\n")
    .replace(/\\\(((?:.|\n)*?)\\\)/g, "$$$1$$");

  // Ensure display math blocks ($$...$$) are separated from surrounding text
  // with blank lines so remark-math can parse them correctly.
  normalized = normalized.replace(
    /([^\n])\n(\$\$)/g,
    "$1\n\n$2"
  );
  normalized = normalized.replace(
    /(\$\$)\n([^\n])/g,
    "$1\n\n$2"
  );

  return normalized;
}
