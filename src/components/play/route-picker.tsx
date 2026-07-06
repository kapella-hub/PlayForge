"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import {
  ROUTE_LIBRARY,
  getRoutesByCategory,
  type RouteTemplate,
} from "@/engine/routes-library";

interface RoutePickerProps {
  onSelectRoute: (template: RouteTemplate) => void;
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { key: "short" as const, label: "Short" },
  { key: "medium" as const, label: "Medium" },
  { key: "deep" as const, label: "Deep" },
  { key: "screen" as const, label: "Screen" },
  { key: "block" as const, label: "Block" },
];

/** Small SVG preview of a route shape based on its offsets */
function RoutePreview({ offsets }: { offsets: { dx: number; dy: number }[] }) {
  const svgW = 48;
  const svgH = 48;
  const pad = 6;

  // Build points: start at center-bottom, then apply each offset scaled to fit
  const raw = [{ dx: 0, dy: 0 }, ...offsets];
  const allX = raw.map((p) => p.dx);
  const allY = raw.map((p) => p.dy);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const points = raw.map((p) => ({
    x: pad + ((p.dx - minX) / rangeX) * (svgW - pad * 2),
    y: pad + ((p.dy - minY) / rangeY) * (svgH - pad * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      <path
        d={pathD}
        fill="none"
        stroke="#60a5fa"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Start dot */}
      <circle cx={points[0].x} cy={points[0].y} r={3} fill="#3b82f6" />
      {/* End arrow dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill="#f59e0b"
      />
    </svg>
  );
}

export function RoutePicker({ onSelectRoute, isOpen, onClose }: RoutePickerProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("short");
  const [search, setSearch] = useState("");

  const routes = useMemo(() => {
    // For screen/block we need to handle merged tab
    let pool: RouteTemplate[];
    if (activeTab === "screen" || activeTab === "block") {
      pool = [
        ...getRoutesByCategory("screen"),
        ...getRoutesByCategory("block"),
      ];
    } else {
      pool = getRoutesByCategory(activeTab);
    }
    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [activeTab, search]);

  // Deduplicate the Screen/Block tabs into a single view when either is selected
  const displayTabs = TABS.filter((t) => t.key !== "block");

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border/60 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Route Library</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground/85"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative px-5 pt-3">
          <Search className="absolute left-7.5 top-1/2 h-3.5 w-3.5 translate-y-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routes..."
            className="w-full rounded-lg border border-border/50 bg-secondary py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary/50"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {displayTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                activeTab === tab.key ||
                  (tab.key === "screen" &&
                    (activeTab === "screen" || activeTab === "block"))
                  ? "bg-primary/20 text-primary-emphasis"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground/85",
              )}
            >
              {tab.key === "screen" ? "Screen / Block" : tab.label}
            </button>
          ))}
        </div>

        {/* Route grid */}
        <div className="grid grid-cols-2 gap-2 overflow-y-auto p-5">
          {routes.map((route) => (
            <button
              key={route.id}
              onClick={() => onSelectRoute(route)}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <RoutePreview offsets={route.offsets} />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground group-hover:text-foreground">
                  {route.name}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  {route.description}
                </span>
              </div>
            </button>
          ))}
          {routes.length === 0 && (
            <p className="col-span-2 py-8 text-center text-xs text-muted-foreground/70">
              No routes found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
