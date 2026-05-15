"use client";

import { DragEvent, useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024;

export interface PlantImageSelection {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

interface ImageDropzoneProps {
  selection: PlantImageSelection | null;
  onSelectionChange: (selection: PlantImageSelection | null) => void;
  disabled: boolean;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image file."));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export default function ImageDropzone({
  selection,
  onSelectionChange,
  disabled,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const applyFile = useCallback(
    async (file: File) => {
      setLocalError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setLocalError("Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setLocalError("Image must be 4 MB or smaller.");
        return;
      }

      try {
        const base64 = await readFileAsBase64(file);
        if (selection?.previewUrl) {
          URL.revokeObjectURL(selection.previewUrl);
        }
        onSelectionChange({
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mimeType: file.type,
        });
      } catch {
        setLocalError("Could not process that image.");
      }
    },
    [onSelectionChange, selection?.previewUrl],
  );

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) {
      return;
    }
    const file = event.dataTransfer.files[0];
    if (file) {
      await applyFile(file);
    }
  }

  function handleClear(event: React.MouseEvent) {
    event.stopPropagation();
    if (selection?.previewUrl) {
      URL.revokeObjectURL(selection.previewUrl);
    }
    onSelectionChange(null);
    setLocalError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm text-botanical-muted">
        Plant photo (optional)
      </label>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.click();
          }
        }}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragActive
            ? "border-botanical-accent bg-botanical-accent/10"
            : "border-botanical-border bg-botanical-bg/40 hover:border-botanical-muted"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          disabled={disabled}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) {
              await applyFile(file);
            }
          }}
        />

        {selection ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selection.previewUrl}
              alt="Plant preview"
              className="mx-auto max-h-40 rounded-lg object-contain"
            />
            <p className="text-xs text-botanical-muted">{selection.file.name}</p>
            <button
              type="button"
              className="text-xs text-botanical-accent underline"
              onClick={handleClear}
            >
              Remove image
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-botanical-leaf">
              Drag & drop a plant photo here
            </p>
            <p className="mt-1 text-xs text-botanical-muted">
              or click to browse · max 4 MB
            </p>
          </div>
        )}
      </div>
      {localError ? (
        <p className="mt-2 text-xs text-red-300">{localError}</p>
      ) : null}
    </div>
  );
}
