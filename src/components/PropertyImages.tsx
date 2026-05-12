"use client";

import { useState } from "react";

type Props = {
  images: string[];
  alt: string;
};

const MAX_THUMBS = 5;

export function PropertyImages({ images, alt }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gradient-to-br from-kiwi-200 via-kiwi-100 to-kiwi-50">
        <div className="absolute inset-0 flex items-center justify-center text-sm text-kiwi-600">
          {/* placeholder when listing has no images yet */}
          —
        </div>
      </div>
    );
  }

  const thumbs = images.slice(0, MAX_THUMBS);
  const overflow = images.length - thumbs.length;

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-kiwi-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[activeIdx]}
          src={images[activeIdx]}
          alt={alt}
          loading="eager"
          className="aspect-[16/9] w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-2 grid grid-cols-5 gap-2">
          {thumbs.map((url, i) => {
            const active = i === activeIdx;
            const isLastThumb = i === thumbs.length - 1;
            const showOverflowBadge = isLastThumb && overflow > 0;
            return (
              <button
                key={url + i}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`Image ${i + 1}`}
                aria-pressed={active}
                className={
                  "relative overflow-hidden rounded-lg border transition " +
                  (active
                    ? "border-kiwi-600 ring-2 ring-kiwi-300"
                    : "border-kiwi-200 hover:border-kiwi-400")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                {showOverflowBadge && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                    +{overflow}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
