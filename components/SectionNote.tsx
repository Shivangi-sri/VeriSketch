"use client";

import { useEffect, useRef, useState } from "react";
import type { SectionRun } from "@/lib/types";
import { convertElements } from "@/lib/render/excalidraw-elements";

function toBullets(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function SectionNote({ index, section }: { index: number; section: SectionRun }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  const elements = section.diagram?.elements ?? [];
  const hasElements = elements.length > 0;

  useEffect(() => {
    if (!hasElements) return;
    let cancelled = false;

    (async () => {
      try {
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({
          elements: convertElements(elements) as never,
          appState: {
            exportBackground: true,
            exportWithDarkMode: false,
            viewBackgroundColor: "#ffffff",
            exportPadding: 16,
          },
          files: null,
        });

        if (cancelled) return;
        svg.setAttribute("width", "100%");
        svg.style.height = "auto";
        svg.style.maxWidth = "100%";
        containerRef.current?.replaceChildren(svg);
      } catch (error) {
        console.error("Failed to export section diagram:", error);
        if (!cancelled) setRenderFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.diagram]);

  return (
    <section className="break-inside-avoid">
      <h2 className="text-xl font-semibold text-zinc-900">
        {index}. {section.title}
      </h2>

      <ul className="mt-2 list-disc space-y-1 pl-6 text-[15px] leading-relaxed text-zinc-800">
        {toBullets(section.explanation).map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {hasElements && !renderFailed ? (
        <div
          ref={containerRef}
          className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white p-2"
        />
      ) : (
        <p className="mt-3 text-xs italic text-zinc-400">Diagram not available for this section.</p>
      )}
    </section>
  );
}
