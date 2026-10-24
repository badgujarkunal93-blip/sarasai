'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ImageExplainUploadProps {
  videoId: string;
  segmentId?: string;
  segmentTitle?: string;
  onNoteCreated?: () => void;
}

export function ImageExplainUpload({
  videoId,
  segmentId,
  segmentTitle,
  onNoteCreated,
}: ImageExplainUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBadge, setSuccessBadge] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size must be under 8MB.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndExplain = async () => {
    if (!previewUrl || !selectedFile) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessBadge(null);

    try {
      const res = await fetch('/api/notes/image-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          segmentId,
          imageBase64: previewUrl,
          mimeType: selectedFile.type,
          fileName: selectedFile.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to explain image.');
      }

      setSuccessBadge(data.badge || 'Powered by Gemma 4 (local)');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onNoteCreated) {
        onNoteCreated();
      }
    } catch (err: any) {
      console.error('[IMAGE UPLOAD ERROR]:', err);
      setErrorMsg(err.message || 'Error uploading slide.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[#FAF8F2] border-2 border-[#111218] rounded-2xl p-4 sm:p-5 shadow-neo-sm space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#B8FF3D] border border-[#111218] flex items-center justify-center text-[#111218] font-bold text-xs shadow-neo-sm">
            🖼️
          </div>
          <div>
            <h4 className="font-display font-bold text-xs sm:text-sm text-[#111218]">
              Upload Slide or Diagram
            </h4>
            <p className="text-[10px] text-[#636573] font-medium">
              Gemma 4 explains the slide and attaches the analysis directly to {segmentTitle ? `"${segmentTitle}"` : 'this lesson'}.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-display border border-[#111218] bg-[#DDF6BD] text-[#111218]">
          <Sparkles className="w-3 h-3 text-[#111218]" />
          <span>Powered by Gemma 4</span>
        </span>
      </div>

      {/* File Drop / Selection Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[#111218]/30 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#111218] hover:bg-[#FFFDF7] transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Slide Preview"
              className="max-h-40 rounded-lg border border-[#111218] shadow-sm object-contain"
            />
            <span className="text-[11px] font-bold text-[#111218]">
              {selectedFile?.name} (Click to change)
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <UploadCloud className="w-7 h-7 mx-auto text-[#111218]" />
            <p className="text-xs font-bold text-[#111218] font-display">
              Click to upload a lecture slide, note, or architecture diagram
            </p>
            <p className="text-[10px] text-[#636573]">PNG, JPG, or WebP up to 8MB</p>
          </div>
        )}
      </div>

      {/* Error or Success notification */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successBadge && (
        <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
            <span>Analysis added to notes!</span>
          </div>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300">
            {successBadge}
          </span>
        </div>
      )}

      {/* Action Button */}
      {selectedFile && (
        <button
          type="button"
          disabled={isUploading}
          onClick={handleUploadAndExplain}
          className="w-full neo-btn-primary py-2.5 text-xs font-bold font-display uppercase flex items-center justify-center gap-2 shadow-neo-sm disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B8FF3D]" />
              <span>Analyzing Diagram with Gemma 4...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#B8FF3D]" />
              <span>Explain Slide & Save to Notes</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
