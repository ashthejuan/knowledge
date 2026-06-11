"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
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

type GraphColors = {
  canvas: string;
  label: string;
  node: string;
};

const DEFAULT_GRAPH_COLORS: GraphColors = {
  canvas: "#ffffff",
  label: "#111827",
  node: "rgba(37, 99, 235, 0.9)",
};

function readGraphColors(): GraphColors {
  if (typeof window === "undefined") {
    return DEFAULT_GRAPH_COLORS;
  }

  const styles = getComputedStyle(document.documentElement);

  return {
    canvas:
      styles.getPropertyValue("--graph-canvas").trim() ||
      DEFAULT_GRAPH_COLORS.canvas,
    label:
      styles.getPropertyValue("--graph-label").trim() ||
      DEFAULT_GRAPH_COLORS.label,
    node:
      styles.getPropertyValue("--graph-node").trim() ||
      DEFAULT_GRAPH_COLORS.node,
  };
}

function useGraphColors(): GraphColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState(DEFAULT_GRAPH_COLORS);

  useEffect(() => {
    setColors(readGraphColors());
  }, [resolvedTheme]);

  return colors;
}

export function KnowledgeGraph() {
  const graphColors = useGraphColors();
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
          style={{ height: CANVAS_HEIGHT, backgroundColor: graphColors.canvas }}
        >
          {isLoading ? (
            <GraphSkeleton canvasColor={graphColors.canvas} />
          ) : error ? (
            <GraphMessage
              title="Graph unavailable"
              description={error}
              canvasColor={graphColors.canvas}
            />
          ) : isEmpty ? (
            <GraphEmptyState canvasColor={graphColors.canvas} />
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
                linkDirectionalParticleColor={() => graphColors.label}
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
                  ctx.fillStyle = typedNode.color ?? graphColors.node;
                  ctx.fill();

                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  ctx.textAlign = "left";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = graphColors.label;
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

function GraphSkeleton({ canvasColor }: { canvasColor?: string }) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-4 bg-background px-6 text-muted-foreground"
      style={
        canvasColor ? { height: CANVAS_HEIGHT, backgroundColor: canvasColor } : { height: CANVAS_HEIGHT }
      }
    >
      <Spinner className="size-8 text-primary" />
      <p className="text-sm font-medium text-foreground">
        Rendering knowledge graph…
      </p>
    </div>
  );
}

function GraphEmptyState({ canvasColor }: { canvasColor: string }) {
  return (
    <Empty
      className="h-full min-h-[560px] border-none bg-background text-foreground"
      style={{ backgroundColor: canvasColor }}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UploadSimple weight="duotone" />
        </EmptyMedia>
        <EmptyTitle>No graph data yet</EmptyTitle>
        <EmptyDescription>
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
  canvasColor,
}: {
  title: string;
  description: string;
  canvasColor: string;
}) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background px-8 py-10 text-center text-muted-foreground"
      style={{ backgroundColor: canvasColor }}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs/relaxed">{description}</p>
    </div>
  );
}
