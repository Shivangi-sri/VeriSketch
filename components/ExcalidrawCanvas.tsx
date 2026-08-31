"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import "@excalidraw/excalidraw/index.css";
import { convertElements, type DiagramElement } from "@/lib/render/excalidraw-elements";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false },
);

type CanvasMode = "preview" | "editor";

type ExcalidrawCanvasProps = {
  diagram?: {
    diagramType?: string;
    elements?: unknown[];
  } | null;
  elements?: unknown[];
  /** Legacy flag: `true` is treated as `mode="editor"`. */
  editable?: boolean;
  mode?: CanvasMode;
  theme?: "light" | "dark";
  height?: number | string;
};

export function ExcalidrawCanvas({
  diagram,
  elements: externalElements,
  editable,
  mode,
  theme = "dark",
  height,
}: ExcalidrawCanvasProps) {
  const resolvedMode: CanvasMode = mode ?? (editable ? "editor" : "preview");
  const isEditor = resolvedMode === "editor";
  const resolvedHeight = height ?? (isEditor ? 560 : 360);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);

  const { excalidrawElements, signature } = useMemo(() => {
    const source = Array.isArray(diagram?.elements)
      ? diagram!.elements
      : Array.isArray(externalElements)
        ? externalElements
        : [];

    const converted = convertElements(source);
    const sig =
      source.map((el) => (el as DiagramElement)?.id ?? "").join("|") || `count-${converted.length}`;

    return { excalidrawElements: converted, signature: sig };
  }, [diagram, externalElements]);

  const fitToContent = () => {
    const api = apiRef.current;
    if (!api) return;
    requestAnimationFrame(() => {
      try {
        api.scrollToContent(api.getSceneElements(), { fitToContent: true, animate: false });
      } catch {
        /* scene not ready yet */
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Canvas</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {isEditor ? "Editing" : "Preview"}
        </span>
      </div>

      <div
        style={{
          height: typeof resolvedHeight === "number" ? `${resolvedHeight}px` : resolvedHeight,
          minHeight: 260,
          width: "100%",
        }}
      >
        <Excalidraw
          key={`${signature}-${theme}`}
          excalidrawAPI={(api: unknown) => {
            apiRef.current = api;
            fitToContent();
          }}
          viewModeEnabled={!isEditor}
          zenModeEnabled={!isEditor}
          gridModeEnabled={false}
          theme={theme}
          UIOptions={{
            canvasActions: {
              toggleTheme: isEditor,
              changeViewBackgroundColor: isEditor,
              clearCanvas: isEditor,
              loadScene: false,
              saveToActiveFile: false,
              saveAsImage: isEditor,
              export: isEditor ? {} : false,
            },
          }}
          initialData={{
            elements: excalidrawElements as never,
            scrollToContent: true,
            files: {},
          }}
        />
      </div>
    </div>
  );
}

export default ExcalidrawCanvas;
