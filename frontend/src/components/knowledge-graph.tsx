"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { ShareNetwork, UploadSimple } from "@phosphor-icons/react";

import { fetchSubgraph } from "@/lib/graph-client";
import { AuthenticationRequiredError } from "@/lib/auth-fetch";
import type { GraphData, GraphNode } from "@/types/graph";
import {
  Card,
  CardContent,
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
import { Spinner } from "@/components/ui/spinner";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

const CANVAS_HEIGHT = 560;
const GRAPH_VIEW_PADDING = 72;
const CANVAS_BG = "#111827";

export function KnowledgeGraph() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: CANVAS_HEIGHT });

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchSubgraph();
        if (!cancelled) setGraphData(data);
      } catch (caughtError) {
        if (caughtError instanceof AuthenticationRequiredError) {
          return;
        }
        if (!cancelled) {
          setError(
            "Unable to reach the graph service. Confirm the backend is running and try again."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: CANVAS_HEIGHT,
        });
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const isEmpty = !isLoading && !error && graphData.nodes.length === 0;

  useEffect(() => {
    if (isLoading || isEmpty || error || dimensions.width === 0) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      graphRef.current?.zoomToFit(400, GRAPH_VIEW_PADDING);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [dimensions.width, error, graphData.nodes.length, isEmpty, isLoading]);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-3">
          <ShareNetwork weight="duotone" className="size-4 text-primary" />
          Knowledge Graph
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden"
          style={{ height: CANVAS_HEIGHT, backgroundColor: CANVAS_BG }}
        >
          {isLoading ? (
            <GraphSkeleton />
          ) : error ? (
            <GraphMessage title="Graph unavailable" description={error} />
          ) : isEmpty ? (
            <GraphEmptyState />
          ) : (
            dimensions.width > 0 && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor="transparent"
                warmupTicks={80}
                cooldownTicks={120}
                onEngineStop={() =>
                  graphRef.current?.zoomToFit(400, GRAPH_VIEW_PADDING)
                }
                nodeAutoColorBy="type"
                linkColor={() => "rgba(148, 163, 184, 0.4)"}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={() => "rgba(248, 250, 252, 0.78)"}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const typedNode = node as GraphNode & {
                    x: number;
                    y: number;
                    color?: string;
                  };
                  const rawLabel = typedNode.label ?? typedNode.id;
                  const label =
                    rawLabel.length > 28
                      ? `${rawLabel.slice(0, 28)}…`
                      : rawLabel;
                  const radius = 5;

                  ctx.beginPath();
                  ctx.arc(
                    typedNode.x,
                    typedNode.y,
                    radius,
                    0,
                    2 * Math.PI,
                    false
                  );
                  ctx.fillStyle = typedNode.color ?? "rgba(37, 99, 235, 0.9)";
                  ctx.fill();

                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  ctx.textAlign = "left";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = "#f9fafb";
                  ctx.fillText(label, typedNode.x + radius + 8, typedNode.y);
                }}
              />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GraphSkeleton() {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-4 px-6 text-zinc-400"
      style={{ height: CANVAS_HEIGHT, backgroundColor: CANVAS_BG }}
    >
      <Spinner className="size-8 text-primary" />
      <p className="text-sm font-medium">Rendering knowledge graph…</p>
    </div>
  );
}

function GraphEmptyState() {
  return (
    <Empty
      className="h-full min-h-[560px] border-none text-zinc-300"
      style={{ backgroundColor: CANVAS_BG }}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-zinc-800 text-zinc-200">
          <UploadSimple weight="duotone" />
        </EmptyMedia>
        <EmptyTitle className="text-zinc-100">No graph data yet</EmptyTitle>
        <EmptyDescription className="text-zinc-400">
          Upload documents to extract entities and concepts. Once ingested, their
          relationships will surface here as an interactive graph.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function GraphMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 py-10 text-center text-zinc-300"
      style={{ backgroundColor: CANVAS_BG }}
    >
      <p className="text-sm font-medium text-zinc-100">{title}</p>
      <p className="max-w-sm text-xs/relaxed text-zinc-400">{description}</p>
    </div>
  );
}
