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
import { Spinner } from "@/components/ui/spinner";

// `react-force-graph-2d` reaches directly into the DOM and the HTML5 canvas,
// so it must never run during server rendering. Defer the engine to the
// browser via a dynamic import with SSR disabled, falling back to the polished
// skeleton while the chunk streams in.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

const CANVAS_HEIGHT = 560;
const GRAPH_VIEW_PADDING = 72;

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

  // Pull the adjacency payload from the Neo4j-backed subgraph endpoint once on
  // mount. The fetcher already normalizes the response to the GraphData shape.
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

  // The force graph needs explicit pixel dimensions to stay inside its card.
  // Track the container width responsively rather than letting it fill the
  // whole window.
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
          className="relative w-full overflow-hidden bg-[#18221b]"
          style={{ height: CANVAS_HEIGHT }}
        >
          {isLoading ? (
            <GraphSkeleton />
          ) : error ? (
            <GraphMessage
              title="Graph unavailable"
              description={error}
            />
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
                linkColor={() => "rgba(214, 205, 189, 0.34)"}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={() => "rgba(255, 255, 255, 0.78)"}
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

                  // Solid node disc, colored by its group metadata.
                  ctx.beginPath();
                  ctx.arc(
                    typedNode.x,
                    typedNode.y,
                    radius,
                    0,
                    2 * Math.PI,
                    false
                  );
                  ctx.fillStyle = typedNode.color ?? "rgba(99, 102, 241, 0.9)";
                  ctx.fill();

                  // Plain-text label, offset to the right. Font size scales
                  // linearly with the zoom factor so text stays legible.
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Geist, sans-serif`;
                  ctx.textAlign = "left";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = "rgba(244, 239, 228, 0.92)";
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
      className="flex w-full flex-col items-center justify-center gap-4 bg-[#18221b] px-6"
      style={{ height: CANVAS_HEIGHT }}
    >
      <Spinner className="size-8 text-primary" />
      <p className="text-sm font-medium text-muted-foreground">
        Rendering knowledge graph…
      </p>
    </div>
  );
}

function GraphEmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 py-10 text-center">
      <span className="flex size-12 items-center justify-center border border-[#d6cdbd] bg-white/60 text-[#315b40]">
        <UploadSimple weight="duotone" className="size-6" />
      </span>
      <p className="text-sm font-medium text-foreground">
        No graph data yet
      </p>
      <p className="max-w-sm text-xs/relaxed text-muted-foreground">
        Upload documents to extract entities and concepts. Once ingested, their
        relationships will surface here as an interactive graph.
      </p>
    </div>
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
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs/relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
