import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// API: lee los JSON de auditoria Meta de las pages y consolida estadisticas

const AUDIT_DIR = join(process.cwd(), "data", "meta-audit");

const PAGES_META = [
  {
    id: "860529027138846",
    slug: "glass",
    name: "Glass Soler",
    emoji: "🛡️",
    color: "#0EA5E9",
    business: "glass_soler",
  },
  {
    id: "797310113463115",
    slug: "esmeraldas",
    name: "Esmeraldas Soler",
    emoji: "💎",
    color: "#10B981",
    business: "esmeraldas_soler",
  },
  {
    id: "100123132505557",
    slug: "autos",
    name: "Autos Soler",
    emoji: "🚗",
    color: "#F59E0B",
    business: "autos_soler",
  },
  {
    id: "796480326889963",
    slug: "inversiones",
    name: "Inversiones Soler",
    emoji: "🏘️",
    color: "#8B5CF6",
    business: "inversiones_soler",
  },
];

function readJson(filepath: string): any {
  try {
    if (!existsSync(filepath)) return null;
    return JSON.parse(readFileSync(filepath, "utf-8"));
  } catch {
    return null;
  }
}

function buildPageAudit(slug: string) {
  const info = readJson(join(AUDIT_DIR, `${slug}-01-info.json`));
  const posts = readJson(join(AUDIT_DIR, `${slug}-posts.json`)) || [];
  const albums = readJson(join(AUDIT_DIR, `${slug}-03-albums.json`));
  const videos = readJson(join(AUDIT_DIR, `${slug}-04-videos.json`));
  const ratings = readJson(join(AUDIT_DIR, `${slug}-06-ratings.json`));
  const enriched = readJson(join(AUDIT_DIR, `${slug}-posts-enriched.json`)) || [];

  if (!info && posts.length === 0) return null;

  // Stats agregados
  const totalPosts = Array.isArray(posts) ? posts.length : 0;
  const totalPhotos = albums?.data?.reduce(
    (s: number, a: any) => s + (a.count || 0),
    0
  );
  const totalVideos = videos?.data?.length || 0;

  // Posts por mes
  const postsByMonth: Record<string, number> = {};
  for (const p of posts) {
    const m = (p.created_time || "").slice(0, 7);
    if (m) postsByMonth[m] = (postsByMonth[m] || 0) + 1;
  }

  // Engagement total (de enriched)
  const engagement = enriched.reduce(
    (acc: any, p: any) => {
      const e = p._engagement || {};
      acc.likes += e.likes || 0;
      acc.comments += e.comments || 0;
      acc.shares += e.shares || 0;
      return acc;
    },
    { likes: 0, comments: 0, shares: 0 }
  );

  // Top 5 posts
  const topPosts = [...enriched]
    .sort((a: any, b: any) => {
      const sa =
        (a._engagement?.likes || 0) +
        (a._engagement?.comments || 0) * 2 +
        (a._engagement?.shares || 0) * 3;
      const sb =
        (b._engagement?.likes || 0) +
        (b._engagement?.comments || 0) * 2 +
        (b._engagement?.shares || 0) * 3;
      return sb - sa;
    })
    .slice(0, 5);

  // Primer y ultimo post
  const sortedDates = posts
    .map((p: any) => p.created_time)
    .filter(Boolean)
    .sort();
  const firstPost = sortedDates[0];
  const lastPost = sortedDates[sortedDates.length - 1];

  // Days since last post (signal de actividad)
  const daysSinceLastPost = lastPost
    ? Math.floor(
        (Date.now() - new Date(lastPost).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return {
    info: {
      id: info?.id,
      name: info?.name,
      category: info?.category,
      username: info?.username,
      fan_count: info?.fan_count,
      followers_count: info?.followers_count,
      rating: info?.overall_star_rating,
      rating_count: info?.rating_count,
      phone: info?.phone,
      emails: info?.emails,
      website: info?.website,
      link: info?.link,
      about: info?.about,
      location: info?.location?.city,
      is_published: info?.is_published,
      verification_status: info?.verification_status,
      picture: info?.picture?.data?.url,
      cover: info?.cover?.source,
      instagram: info?.instagram_business_account
        ? {
            username: info.instagram_business_account.username,
            followers: info.instagram_business_account.followers_count,
            posts: info.instagram_business_account.media_count,
            biography: info.instagram_business_account.biography,
            profile_pic: info.instagram_business_account.profile_picture_url,
          }
        : null,
    },
    stats: {
      total_posts: totalPosts,
      total_photos: totalPhotos || 0,
      total_videos: totalVideos,
      total_albums: albums?.data?.length || 0,
      total_ratings: ratings?.data?.length || 0,
      first_post: firstPost,
      last_post: lastPost,
      days_since_last_post: daysSinceLastPost,
      total_likes: engagement.likes,
      total_comments: engagement.comments,
      total_shares: engagement.shares,
    },
    posts_by_month: postsByMonth,
    albums: albums?.data || [],
    videos: (videos?.data || []).map((v: any) => ({
      id: v.id,
      title: v.title || "Sin titulo",
      length: v.length,
      views: v.views,
      created_time: v.created_time,
      permalink: v.permalink_url,
    })),
    top_posts: topPosts.map((p: any) => ({
      id: p.id,
      message: (p.message || "Sin mensaje").slice(0, 200),
      created_time: p.created_time,
      permalink: p.permalink_url,
      picture: p.full_picture,
      likes: p._engagement?.likes || 0,
      comments: p._engagement?.comments || 0,
      shares: p._engagement?.shares || 0,
    })),
  };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("page");

  if (slug) {
    const meta = PAGES_META.find((p) => p.slug === slug);
    if (!meta) {
      return NextResponse.json({ error: "Page no encontrada" }, { status: 404 });
    }
    const audit = buildPageAudit(slug);
    return NextResponse.json({ meta, audit });
  }

  // Audit de las 4 pages
  const results = PAGES_META.map((meta) => ({
    meta,
    audit: buildPageAudit(meta.slug),
  }));

  // Aggregate stats
  const totals = results.reduce(
    (acc, r) => {
      if (!r.audit) return acc;
      const s = r.audit.stats;
      acc.total_pages++;
      acc.total_posts += s.total_posts;
      acc.total_photos += s.total_photos;
      acc.total_videos += s.total_videos;
      acc.total_fans += r.audit.info.fan_count || 0;
      acc.total_followers += r.audit.info.followers_count || 0;
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

  return NextResponse.json({ totals, pages: results });
}
