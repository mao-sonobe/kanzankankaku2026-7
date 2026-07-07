"use client";

import { useState } from "react";
import { techIconUrl } from "@/lib/domain/tech-icon";
import { cn } from "@/lib/utils";

/**
 * 技術名の横に出す小さなアイコン。deviconから取得し、
 * 見つからない技術は頭文字の丸アバターにフォールバックする。
 */
export function TechIcon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = techIconUrl(name);

  if (!url || failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex flex-none items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground",
          className
        )}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // 外部SVG(devicon)を表示するだけなのでnext/imageの最適化は不要。
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      className={cn("inline-block flex-none", className)}
      onError={() => setFailed(true)}
    />
  );
}
