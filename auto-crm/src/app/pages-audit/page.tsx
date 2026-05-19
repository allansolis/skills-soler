"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import {
  Users,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Video,
  Globe,
  Phone,
  Mail,
  ExternalLink,
  Camera,
} from "lucide-react";

// Alias since Instagram icon not in lucide
const Instagram = Camera;

interface PageAudit {
  meta: {
    id: string;
    slug: string;
    name: string;
    emoji: string;
    color: string;
    business: string;
  };
  audit: {
    info: {
      name: string;
      category: string;
      username?: string;
      fan_count: number;
      followers_count: number;
      rating: number;
      rating_count: number;
      phone?: string;
      emails?: string[];
      website?: string;
      link?: string;
      about?: string;
      is_published?: boolean;
      picture?: string;
      cover?: string;
      instagram?: {
        username: string;
        followers: number;
        posts: number;
        biography?: string;
        profile_pic?: string;
      } | null;
    };
    stats: {
      total_posts: number;
      total_photos: number;
      total_videos: number;
      total_albums: number;
      total_ratings: number;
      first_post?: string;
      last_post?: string;
      days_since_last_post?: number;
      total_likes: number;
      total_comments: number;
      total_shares: number;
    };
    posts_by_month: Record<string, number>;
    albums: any[];
    videos: any[];
    top_posts: any[];
  } | null;
}

export default function PagesAuditPage() {
  const { business, businessConfig } = useBusiness();
  const [data, setData] = useState<{ totals: any; pages: PageAudit[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/pages-audit")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8">Cargando auditoria...</div>;
  }

  if (!data) {
    return <div className="p-8">Error cargando datos</div>;
  }

  // Filter by current business (unless "Ver todo" is toggled)
  const filteredPages = showAll
    ? data.pages
    : data.pages.filter((p) => p.meta.business === business);

  // The page for current business
  const currentPage =
    filteredPages.length === 1 ? filteredPages[0] : null;

  // Recompute totals from filtered pages
  const totals = filteredPages.reduce(
    (acc, p) => {
      if (!p.audit) return acc;
      const s = p.audit.stats;
      acc.total_pages++;
      acc.total_posts += s.total_posts;
      acc.total_photos += s.total_photos;
      acc.total_videos += s.total_videos;
      acc.total_fans += p.audit.info.fan_count || 0;
      acc.total_followers += p.audit.info.followers_count || 0;
      return acc;
    },
    {
      total_pages: 0,
      total_posts: 0,
      total_photos: 0,
      total_videos: 0,
      total_fans: 0,
      total_followers: 0,
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🔍 Auditoria Meta — <span style={{ color: businessConfig.color }}>
              {businessConfig.emoji} {businessConfig.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {showAll
              ? "Mostrando las 4 marcas del Grupo Soler"
              : `Filtrado por marca activa. Cambia el switcher arriba o "Ver todas".`}
          </p>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted/60"
        >
          {showAll ? "Solo marca activa" : "Ver las 4 marcas"}
        </button>
      </div>

      {/* Totales globales (filtrados) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KPI label="Pages" value={totals.total_pages} icon={<Users className="h-4 w-4" />} />
        <KPI label="Fans" value={totals.total_fans.toLocaleString()} icon={<Heart className="h-4 w-4 text-pink-500" />} />
        <KPI label="Followers" value={totals.total_followers.toLocaleString()} icon={<Users className="h-4 w-4 text-blue-500" />} />
        <KPI label="Posts" value={totals.total_posts} icon={<MessageCircle className="h-4 w-4 text-emerald-500" />} />
        <KPI label="Fotos" value={totals.total_photos} icon={<ImageIcon className="h-4 w-4 text-amber-500" />} />
        <KPI label="Videos" value={totals.total_videos} icon={<Video className="h-4 w-4 text-purple-500" />} />
      </div>

      {/* Lista de pages filtrada */}
      <div className={`grid grid-cols-1 ${showAll ? "md:grid-cols-2" : ""} gap-4`}>
        {filteredPages.map((p) => (
          <div
            key={p.meta.id}
            className="text-left rounded-lg border p-5"
            style={{ borderLeftColor: p.meta.color, borderLeftWidth: 4 }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-2xl">{p.meta.emoji}</span>
                  {p.meta.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {p.meta.id}
                </p>
              </div>
              {p.audit?.info.username && (
                <span className="text-xs text-muted-foreground">
                  @{p.audit.info.username}
                </span>
              )}
            </div>

            {!p.audit ? (
              <p className="text-sm text-muted-foreground italic">
                Sin datos de auditoria (correr audit_pages_*.py)
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <div className="text-xl font-bold">{p.audit.info.fan_count || 0}</div>
                    <div className="text-xs text-muted-foreground">fans</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{p.audit.stats.total_posts}</div>
                    <div className="text-xs text-muted-foreground">posts</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{p.audit.stats.total_photos}</div>
                    <div className="text-xs text-muted-foreground">fotos</div>
                  </div>
                </div>

                {/* Indicators */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {p.audit.info.instagram ? (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded">
                      <Instagram className="inline h-3 w-3 mr-1" />
                      @{p.audit.info.instagram.username} · {p.audit.info.instagram.followers} followers
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded">
                      ❌ Sin IG vinculado
                    </span>
                  )}
                  {p.audit.info.phone && (
                    <span className="px-2 py-0.5 bg-muted rounded">
                      📞 {p.audit.info.phone}
                    </span>
                  )}
                  {p.audit.stats.days_since_last_post != null && (
                    <span
                      className={`px-2 py-0.5 rounded ${
                        p.audit.stats.days_since_last_post > 30
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : p.audit.stats.days_since_last_post > 7
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      Último post hace {p.audit.stats.days_since_last_post}d
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {currentPage && currentPage.audit && (
        <DetailPanel page={currentPage} />
      )}
    </div>
  );
}

function KPI({ label, value, icon }: any) {
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function DetailPanel({ page }: { page: PageAudit }) {
  const a = page.audit!;
  return (
    <div className="border rounded-lg p-6 bg-card space-y-5">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        {page.meta.emoji} Detalle: {page.meta.name}
      </h2>

      {/* Info basica */}
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <h3 className="font-medium mb-2">Información de página</h3>
          <ul className="space-y-1 text-muted-foreground">
            <li><strong>Categoría:</strong> {a.info.category || "—"}</li>
            <li><strong>Username:</strong> @{a.info.username || "—"}</li>
            <li><strong>Fans:</strong> {a.info.fan_count || 0}</li>
            <li><strong>Rating:</strong> {a.info.rating || 0} ({a.info.rating_count || 0} reviews)</li>
            <li><strong>Publicada:</strong> {a.info.is_published === false ? "❌ No" : "✅ Sí"}</li>
            {a.info.phone && <li><Phone className="inline h-3 w-3 mr-1" />{a.info.phone}</li>}
            {a.info.emails && a.info.emails.length > 0 && (
              <li><Mail className="inline h-3 w-3 mr-1" />{a.info.emails.join(", ")}</li>
            )}
            {a.info.website && (
              <li><Globe className="inline h-3 w-3 mr-1" />
                <a href={a.info.website} target="_blank" className="text-primary hover:underline">
                  {a.info.website}
                </a>
              </li>
            )}
            {a.info.link && (
              <li>
                <a href={a.info.link} target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                  Ver página en Facebook <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            )}
          </ul>
          {a.info.about && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              "{a.info.about.slice(0, 200)}"
            </p>
          )}
        </div>

        <div>
          <h3 className="font-medium mb-2">Stats agregados</h3>
          <ul className="space-y-1 text-muted-foreground text-sm">
            <li><strong>Posts totales:</strong> {a.stats.total_posts}</li>
            <li><strong>Fotos:</strong> {a.stats.total_photos}</li>
            <li><strong>Videos:</strong> {a.stats.total_videos}</li>
            <li><strong>Albums:</strong> {a.stats.total_albums}</li>
            <li><strong>Reviews:</strong> {a.stats.total_ratings}</li>
            {a.stats.first_post && (
              <li><strong>Primer post:</strong> {a.stats.first_post.slice(0, 10)}</li>
            )}
            {a.stats.last_post && (
              <li><strong>Último post:</strong> {a.stats.last_post.slice(0, 10)}</li>
            )}
            <li>
              <strong>Engagement (30 últimos):</strong>{" "}
              {a.stats.total_likes}❤️ {a.stats.total_comments}💬 {a.stats.total_shares}↗️
            </li>
          </ul>
        </div>
      </div>

      {/* Instagram vinculado */}
      {a.info.instagram && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Instagram className="h-4 w-4" /> Instagram vinculado
          </h3>
          <div className="text-sm">
            <strong>@{a.info.instagram.username}</strong>
            {" • "}
            {a.info.instagram.followers} followers
            {" • "}
            {a.info.instagram.posts} posts
            {a.info.instagram.biography && (
              <p className="text-muted-foreground mt-1">"{a.info.instagram.biography}"</p>
            )}
          </div>
        </div>
      )}

      {/* Posts por mes */}
      {Object.keys(a.posts_by_month).length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Posts por mes (últimos 12)</h3>
          <div className="space-y-1">
            {Object.entries(a.posts_by_month)
              .sort((x, y) => y[0].localeCompare(x[0]))
              .slice(0, 12)
              .map(([month, count]) => (
                <div key={month} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-muted-foreground">{month}</span>
                  <div className="flex-1 bg-muted rounded h-4">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.min(100, (count / 10) * 100)}%`,
                        backgroundColor: page.meta.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Albums */}
      {a.albums.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Albums ({a.albums.length})</h3>
          <div className="grid md:grid-cols-3 gap-2">
            {a.albums.map((al: any) => (
              <div key={al.id} className="border rounded p-2 text-sm">
                <div className="font-medium">{al.name}</div>
                <div className="text-xs text-muted-foreground">{al.count} fotos</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {a.videos.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Videos ({a.videos.length})</h3>
          <div className="space-y-1 text-sm">
            {a.videos.slice(0, 10).map((v: any) => (
              <div key={v.id} className="flex items-center gap-2 text-muted-foreground">
                <Video className="h-3 w-3" />
                <span className="flex-1 truncate">{v.title}</span>
                <span className="text-xs">{v.length?.toFixed(1)}s</span>
                <span className="text-xs">{v.views || 0} views</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top posts */}
      {a.top_posts.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Top posts por engagement</h3>
          <div className="space-y-2">
            {a.top_posts.map((p: any, i: number) => (
              <a
                key={p.id}
                href={p.permalink}
                target="_blank"
                rel="noopener"
                className="block border rounded p-3 hover:bg-muted/30 text-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground font-mono text-xs">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="line-clamp-2">{p.message}</p>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                      <span>{p.created_time?.slice(0, 10)}</span>
                      <span>{p.likes}❤️</span>
                      <span>{p.comments}💬</span>
                      <span>{p.shares}↗️</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
