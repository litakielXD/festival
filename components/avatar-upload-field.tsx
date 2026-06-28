"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface AvatarUploadFieldProps {
  userId: string;
  initialAvatarUrl?: string | null;
  fieldName?: string;
  label?: string;
  pathPrefix?: string;
  onUrlChange?: (url: string) => void;
}

export function AvatarUploadField({
  userId,
  initialAvatarUrl,
  fieldName = "avatarUrl",
  label = "Profilbild",
  pathPrefix = "profile",
  onUrlChange
}: AvatarUploadFieldProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function fileToSquareJpeg(file: File) {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - side) / 2);
    const sy = Math.floor((bitmap.height - side) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas konnte nicht initialisiert werden.");
    }

    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.9);
    });
    if (!blob) {
      throw new Error("Bild konnte nicht verarbeitet werden.");
    }

    return blob;
  }

  async function onFileSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bitte nur Bilddateien auswaehlen.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Bild ist zu gross (max. 15 MB).");
      return;
    }

    setIsUploading(true);
    setError("");

    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "");
    const path = `${userId}/${pathPrefix}/${Date.now()}-${safeName}.jpg`;

    let uploadBody: Blob;
    try {
      uploadBody = await fileToSquareJpeg(file);
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Bild konnte nicht verarbeitet werden.");
      setIsUploading(false);
      return;
    }

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, uploadBody, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false
    });

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    onUrlChange?.(data.publicUrl);
    setIsUploading(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {avatarUrl ? (
        <Image src={avatarUrl} alt="Profilbild Vorschau" width={80} height={80} className="h-20 w-20 rounded-full border border-slate-300 object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 text-xs text-muted">Kein Bild</div>
      )}
      <input type="hidden" name={fieldName} value={avatarUrl} />
      <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 text-sm hover:bg-slate-200 dark:hover:bg-slate-700">
        {isUploading ? "Upload laeuft..." : "Aus Datei waehlen"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void onFileSelected(file);
          }}
        />
      </label>
      <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 text-sm hover:bg-slate-200 dark:hover:bg-slate-700">
        {isUploading ? "Upload laeuft..." : "Kamera/Fotomediathek (mobil)"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void onFileSelected(file);
          }}
        />
      </label>
      <p className="text-xs text-muted">Hinweis: Auf Desktop oeffnet der Browser immer den Datei-Dialog.</p>
      <p className="text-xs text-muted">Bilder werden automatisch quadratisch zugeschnitten und auf 512x512 optimiert.</p>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
