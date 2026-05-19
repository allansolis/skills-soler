"use client";

import { useState, useEffect, useMemo } from "react";
import { useBusiness } from "@/context/BusinessContext";
import {
  Image as ImageIcon,
  Video,
  FileText,
  FolderOpen,
  ExternalLink,
  RefreshCw,
  Filter,
  Calendar,
} from "lucide-react";

interface MetaAsset {
  id: string;
  externalId: string;
  business: string;
  assetType: "video" | "photo" | "album" | "post" | "ig_media";
  platform: "facebook" | "instagram";
  title: string | null;
  description: string | null;
  permalink: string | null;
  thumbnail: string | null;
  externalCreatedAt: number | null;
  createdAt: number;
}

interface AssetTypeCount {
  assetType: string;
  count: number;
}

const TYPE_ICONS: Record<string, typeof Video> = {
  video: Video,
  photo: ImageIcon,
  album: FolderOpen,
  post: FileText,
  ig_media: ImageIcon,
};

const TYPE_LABELS: Record<string, string> = {
  video: "Videos",
  photo: "Fotos",
  album: "Albums",
  post: "Posts",
  ig_media: "Instagram",
};

const TYPE_COLORS: Record<string, string> = {
  video: "#EF4444",
  photo: "#3B82F6",
  album: "#8B5CF6",
  post: "#10B981",
  ig_media: "#EC4899",
};

function formatDate(unix: number | null): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncate(s: string | null, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export default function MetaContentPage() {
  const { business, businessConfig } = useBusiness();
  const [items, setItems] = useState<MetaAsset[]>([]);
  const [counts, setCounts] = useState<AssetTypeCount[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const url =
        filter === "all"
          ? `/api/meta-assets?business=${business}&limit=200`
          : `/api/meta-assets?business=${business}&type=${filter}&limit=200`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setCounts(data.counts || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, filter]);

  const totalCount = useMemo(
    () => counts.reduce((s, c) => s + c.count, 0),
    [counts]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-purple-500" />
            Contenido Meta{" "}
            <span style={{ color: businessConfig.color }}>
              {businessConfig.emoji} {businessConfig.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} assets · videos, fotos, albums y posts extraídos de Facebook + Instagram
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Cargando" : "Refrescar"}
        </button>
      </div>

      {/* Counts cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg border p-4 text-left transition-colors ${
            filter === "all" ? "bg-muted/60 ring-2 ring-primary/40" : "hover:bg-muted/30"
          }`}
        >
          <div className="text-xs text-muted-foreground">Todos</div>
          <div className="text-2xl font-bold tabular-nums">{totalCount}</div>
        </button>
        {counts.map((c) => {
          const Icon = TYPE_ICONS[c.assetType] || FileText;
          const color = TYPE_COLORS[c.assetType] || "#64748b";
          const isActive = filter === c.assetType;
          return (
            <button
              key={c.assetType}
              onClick={() => setFilter(c.assetType)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                isActive ? "bg-muted/60 ring-2 ring-primary/40" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-muted-foreground">
                  {TYPE_LABELS[c.assetType] || c.assetType}
                </div>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="text-2xl font-bold tabular-nums">{c.count}</div>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Sin assets para mostrar. Ejecuta el script de extracción para sincronizar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((a) => {
            const Icon = TYPE_ICONS[a.assetType] || FileText;
            const color = TYPE_COLORS[a.assetType] || "#64748b";
            return (
              <article
                key={a.id}
                className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {a.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.thumbnail}
                      alt={a.title || a.assetType}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="h-12 w-12 opacity-30" style={{ color }} />
                    </div>
                  )}
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: color }}
                  >
                    {a.assetType}
                  </div>
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-white">
                    {a.platform === "instagram" ? "IG" : "FB"}
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-medium leading-snug line-clamp-2 mb-1">
                    {truncate(a.title, 120) || "(sin título)"}
                  </h3>
                  {a.description && a.description !== a.title && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {truncate(a.description, 140)}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(a.externalCreatedAt)}
                    </span>
                    {a.permalink && (
                      <a
                        href={a.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        Ver
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
