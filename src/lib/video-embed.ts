const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export function getVideoEmbedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!YOUTUBE_HOSTS.has(url.hostname) && !VIMEO_HOSTS.has(url.hostname)) return null;

    if (YOUTUBE_HOSTS.has(url.hostname)) {
      const videoId = url.hostname.includes("youtu.be")
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.pathname === "/watch"
          ? url.searchParams.get("v")
          : url.pathname.split("/").filter(Boolean).at(-1);
      return videoId
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
        : null;
    }

    const videoId = url.pathname.split("/").filter(Boolean).at(-1);
    return videoId && /^\d+$/.test(videoId)
      ? `https://player.vimeo.com/video/${videoId}`
      : null;
  } catch {
    return null;
  }
}
