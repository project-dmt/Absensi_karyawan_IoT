import { useEffect, useMemo, useRef, useState } from "react";

export const DIVISION_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#64748b",
];

export default function AttendanceDivisionChart({
  buckets = [],
  divisions = [],
  maxValue = 1,
  colorById,
}) {
  const [hovered, setHovered] = useState(null);
  const scrollerRef = useRef(null);
  const series = useMemo(
    () => divisions.filter((division) => division.total > 0),
    [divisions]
  );
  const yMax = Math.max(1, Number(maxValue) || 1);

  const tickValues = useMemo(() => {
    const stepCount = Math.min(4, yMax);
    const values = [];
    for (let i = stepCount; i >= 0; i--) {
      values.push(Math.round((yMax / stepCount) * i));
    }
    return [...new Set(values)];
  }, [yMax]);

  const lastActiveBucket = useMemo(() => {
    for (let index = buckets.length - 1; index >= 0; index--) {
      if (series.some((division) => (division.counts?.[index] ?? 0) > 0)) {
        return index;
      }
    }
    return -1;
  }, [buckets, series]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || lastActiveBucket < 0) return;

    const target = scroller.querySelector(
      `[data-bucket-index="${lastActiveBucket}"]`
    );
    if (!target) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetLeft =
      targetRect.left - scrollerRect.left + scroller.scrollLeft;

    scroller.scrollLeft = Math.max(
      0,
      targetLeft - scroller.clientWidth + targetRect.width + 16
    );
  }, [buckets, lastActiveBucket, series]);

  const minWidth = Math.max(
    560,
    buckets.length * Math.max(36, series.length * 8 + 10)
  );

  const colorFor = (division) => {
    if (colorById?.get) {
      return colorById.get(division.id) || "#64748b";
    }
    const index = series.findIndex((item) => item.id === division.id);
    return DIVISION_COLORS[Math.max(index, 0) % DIVISION_COLORS.length];
  };

  if (series.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative h-[280px] w-8 shrink-0">
          {tickValues.map((value) => (
            <span
              key={value}
              className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
              style={{ top: `${(1 - value / yMax) * 100}%` }}
            >
              {value}
            </span>
          ))}
        </div>

        <div ref={scrollerRef} className="min-w-0 flex-1 overflow-x-auto">
          <div style={{ minWidth }}>
            <div className="relative h-[280px]">
              {tickValues.map((value) => (
                <div
                  key={value}
                  className="absolute inset-x-0 h-px border-t border-dashed border-border/60"
                  style={{ top: `${(1 - value / yMax) * 100}%` }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-2">
                {buckets.map((bucket, bucketIndex) => (
                  <div
                    key={bucket.key}
                    data-bucket-index={bucketIndex}
                    className="flex h-full flex-1 flex-col justify-end"
                  >
                    <div className="flex flex-1 items-end justify-center gap-1">
                      {series.map((division) => {
                        const value = division.counts?.[bucketIndex] ?? 0;
                        return (
                          <div
                            key={division.id}
                            className="w-full max-w-[12px] rounded-t-[3px] transition-[height,opacity] duration-300 hover:opacity-80"
                            style={{
                              height: value > 0 ? `${(value / yMax) * 100}%` : 0,
                              minHeight: value > 0 ? 4 : 0,
                              backgroundColor: colorFor(division),
                            }}
                            title={`${bucket.label} • ${division.nama_divisi}: ${value} kehadiran`}
                            onMouseEnter={() =>
                              setHovered({
                                bucket: bucket.label,
                                division: division.nama_divisi,
                                value,
                              })
                            }
                            onMouseLeave={() => setHovered(null)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              {buckets.map((bucket) => (
                <div
                  key={bucket.key}
                  className="flex-1 whitespace-nowrap text-center text-[10px] text-muted-foreground"
                >
                  {bucket.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {hovered && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
          <div className="font-semibold">{hovered.division}</div>
          <div className="text-muted-foreground">{hovered.bucket}</div>
          <div className="mt-1 font-medium">{hovered.value} kehadiran</div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {series.map((division) => (
          <div
            key={division.id}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: colorFor(division) }}
            />
            <span>{division.nama_divisi}</span>
            <span className="tabular-nums text-foreground/70">
              ({division.total})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
