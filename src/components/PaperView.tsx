import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ClipboardCopy } from 'lucide-react';

import { toMermaid } from '../services/pedigree-mermaid';
import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface PaperViewProps {
  readonly individuals: readonly Individual[];
  readonly t: Translation;
}

/**
 * Paper View — renders the pedigree as a Mermaid flowchart and provides
 * export actions (SVG download, PNG download, copy source, copy SVG).
 *
 * Mermaid is loaded dynamically to keep the main bundle lean.
 */
export function PaperView({ individuals, t }: PaperViewProps): React.JSX.Element {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef<number>(0);

  const source = toMermaid(individuals);

  useEffect(() => {
    let cancelled = false;
    const currentRender = ++renderIdRef.current;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          flowchart: {
            curve: 'basis',
            nodeSpacing: 28,
            rankSpacing: 52,
          },
        });

        if (cancelled || currentRender !== renderIdRef.current) return;

        const { svg } = await mermaid.render(`mermaid-paper-${currentRender}`, source);

        if (cancelled || currentRender !== renderIdRef.current) return;

        const styledSvg = svg.replace(
          '</svg>',
          `<style>
            svg {
              background: transparent;
            }
            .node rect,
            .node polygon,
            .node circle,
            .node path {
              stroke-width: 2px;
            }
            .edgePath path {
              stroke-width: 2px;
            }
            .nodeLabel,
            .label text,
            .node foreignObject div {
              max-width: 120px;
            }
            .node foreignObject div {
              width: 120px !important;
              min-width: 120px !important;
              max-width: 120px !important;
              min-height: 56px !important;
              text-align: center;
              white-space: normal;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.2;
              word-break: break-word;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto;
              padding: 4px 6px;
              box-sizing: border-box;
            }
            .node .label {
              max-width: 120px;
            }
          </style></svg>`,
        );

        setSvgHtml(styledSvg);
      } catch (e) {
        if (!cancelled && currentRender === renderIdRef.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled && currentRender === renderIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source]);

  const handleDownloadSvg = useCallback(() => {
    if (svgHtml === null) return;
    const blob = new Blob([svgHtml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pedigree.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [svgHtml]);

  const handleDownloadPng = useCallback(() => {
    if (svgHtml === null) return;
    const svgBlob = new Blob([svgHtml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * 2;
      canvas.height = img.naturalHeight * 2;
      const ctx = canvas.getContext('2d');
      if (ctx === null) return;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob === null) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'pedigree.png';
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = url;
  }, [svgHtml]);

  const handleCopySource = useCallback(() => {
    void navigator.clipboard?.writeText(source).catch(() => {});
  }, [source]);

  const handleCopySvg = useCallback(() => {
    if (svgHtml === null) return;
    void navigator.clipboard?.writeText(svgHtml).catch(() => {});
  }, [svgHtml]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface shrink-0">
        <button
          type="button"
          onClick={handleDownloadSvg}
          disabled={svgHtml === null}
          className="panel-button inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          {t.downloadSvg}
        </button>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={svgHtml === null}
          className="panel-button inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          {t.downloadPng}
        </button>
        <button
          type="button"
          onClick={handleCopySource}
          className="panel-button inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded"
        >
          <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />
          {t.copyMermaidSource}
        </button>
        <button
          type="button"
          onClick={handleCopySvg}
          disabled={svgHtml === null}
          className="panel-button inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />
          {t.copySvg}
        </button>
      </div>

      {/* Diagram area */}
      <div className="flex-1 overflow-auto flex items-start justify-center bg-surface-raised/40 p-8">
        {loading ? (
          <div className="flex items-center justify-center gap-3 pt-16" role="status" aria-label="Loading diagram">
            <div className="w-8 h-8 rounded-full border-2 border-border bg-surface-raised animate-pulse" />
            <div className="w-8 h-8 rounded-full border-2 border-border bg-surface-raised animate-pulse [animation-delay:150ms]" />
            <div className="w-8 h-8 rounded-full border-2 border-border bg-surface-raised animate-pulse [animation-delay:300ms]" />
          </div>
        ) : error !== null ? (
          <div className="text-red-600 text-sm font-mono p-4" role="alert">
            {error}
          </div>
        ) : svgHtml !== null ? (
          <div
            ref={containerRef}
            className="paper-mermaid min-w-fit rounded-2xl border border-border bg-surface p-6 shadow-sm"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : null}
      </div>
    </div>
  );
}
