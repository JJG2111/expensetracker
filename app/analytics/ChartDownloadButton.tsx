"use client";

import { toPng } from "html-to-image";
import { useState } from "react";

export default function ChartDownloadButton({ filename, targetId }: { filename: string; targetId: string }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadChart() {
    const target = document.getElementById(targetId);
    if (!target) return;

    setDownloading(true);
    try {
      const dataUrl = await toPng(target, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2
      });
      const link = document.createElement("a");
      link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button className="btn btn-outline-secondary btn-sm" type="button" disabled={downloading} onClick={downloadChart}>
      {downloading ? "Downloading..." : "Download Chart"}
    </button>
  );
}
