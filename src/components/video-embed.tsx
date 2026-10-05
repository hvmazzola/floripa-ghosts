import { getVideoEmbedUrl } from "@/lib/video-embed";

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const embedUrl = getVideoEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="aspect-video overflow-hidden rounded-lg border border-[#2d3d47] bg-black">
      <iframe
        className="size-full"
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
