'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, AlertCircle, RefreshCw, Sparkles, Check } from 'lucide-react';

interface MermaidViewerProps {
  chartDefinition: string;
  title?: string;
  type?: 'flowchart' | 'mindmap';
  providerBadge?: {
    provider: 'local' | 'cloud';
    model: string;
  };
}

export function MermaidViewer({
  chartDefinition,
  title = 'Diagram',
  type = 'flowchart',
  providerBadge,
}: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      setIsRendering(true);
      setRenderError(null);

      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          themeVariables: {
            primaryColor: '#FFFDF7',
            primaryBorderColor: '#111218',
            primaryTextColor: '#111218',
            lineColor: '#111218',
            secondaryColor: '#B8FF3D',
            tertiaryColor: '#E9DFFF',
            mainBkg: '#FFFDF7',
            nodeBorder: '#111218',
            clusterBkg: '#FAF8F2',
          },
        });

        const uniqueId = `mermaid_${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chartDefinition);

        if (isMounted) {
          setSvgContent(svg);
          setIsRendering(false);
        }
      } catch (err: any) {
        console.warn('[MERMAID RENDER ERROR]:', err);
        if (isMounted) {
          setRenderError(
            'Unable to visually render diagram. Please review the structured summary below.'
          );
          setIsRendering(false);
        }
      }
    };

    if (chartDefinition) {
      renderChart();
    }

    return () => {
      isMounted = false;
    };
  }, [chartDefinition]);

  // Download SVG
  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('SVG saved');
    setTimeout(() => setDownloadSuccess(null), 2000);
  };

  // Download PNG
  const handleDownloadPNG = () => {
    if (!svgContent) return;
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // high resolution
      canvas.width = (img.width || 800) * scale;
      canvas.height = (img.height || 600) * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess('PNG saved');
      setTimeout(() => setDownloadSuccess(null), 2000);
    };

    img.src = url;
  };

  return (
    <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-4 sm:p-5 shadow-neo space-y-3.5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-[#111218]/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#B8FF3D] border border-[#111218] flex items-center justify-center text-[#111218] shadow-neo-sm font-bold text-xs">
            {type === 'flowchart' ? '⚡' : '🧠'}
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-[#111218] leading-tight">
              {title}
            </h4>
            <span className="text-[10px] text-[#636573] font-medium uppercase tracking-wider">
              {type === 'flowchart' ? 'Process Flow' : 'Mind Map Tree'}
            </span>
          </div>
        </div>

        {/* Actions & Badge */}
        <div className="flex items-center gap-2">
          {providerBadge && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-display border border-[#111218] bg-[#DDF6BD] text-[#111218]">
              <Sparkles className="w-3 h-3 text-[#111218]" />
              <span>Gemma 4 ({providerBadge.provider})</span>
            </span>
          )}

          {svgContent && !renderError && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownloadSVG}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold font-display bg-[#FFFDF7] text-[#111218] border border-[#111218] rounded-lg shadow-neo-sm hover:bg-[#FAF8F2] transition-all"
                title="Download Vector SVG"
              >
                <Download className="w-3 h-3" />
                <span>SVG</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold font-display bg-[#111218] text-white border border-[#111218] rounded-lg shadow-neo-sm hover:bg-[#21232C] transition-all"
                title="Download High-Res PNG"
              >
                <Download className="w-3 h-3" />
                <span>PNG</span>
              </button>
            </div>
          )}
          {downloadSuccess && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 animate-in fade-in">
              <Check className="w-3 h-3" />
              <span>{downloadSuccess}</span>
            </span>
          )}
        </div>
      </div>

      {/* Diagram Canvas or Clean Fallback */}
      <div className="min-h-[220px] flex items-center justify-center p-3 rounded-xl bg-[#FAF8F2] border border-[#111218]/15 overflow-x-auto">
        {isRendering ? (
          <div className="flex flex-col items-center gap-2 text-xs font-medium text-[#636573]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#111218]" />
            <span>Rendering visual diagram with Gemma 4...</span>
          </div>
        ) : renderError ? (
          <div className="max-w-md text-center p-4 space-y-2">
            <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
            <p className="text-xs font-semibold text-[#111218]">{renderError}</p>
            <pre className="text-[10px] text-left bg-white p-2.5 rounded border border-[#111218]/20 overflow-x-auto text-[#636573] font-mono">
              {chartDefinition}
            </pre>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full flex justify-center py-2 [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
}
