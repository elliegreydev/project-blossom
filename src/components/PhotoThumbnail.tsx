"use client";

import { useEffect, useState } from "react";

// Blobs stored in IndexedDB need an object URL to render, and that URL must
// be revoked when we're done with it or it leaks memory for the life of the
// page. This never uploads anything - the blob never leaves this component.
export default function PhotoThumbnail({ photo, alt }: { photo: Blob; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  if (!url) return null;

  // eslint-disable-next-line @next/next/no-img-element -- local blob: URL, next/image can't optimize it and doesn't need to
  return <img src={url} alt={alt} style={{ width: "100%", borderRadius: 12, display: "block" }} />;
}
