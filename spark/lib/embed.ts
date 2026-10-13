/** Turn a YouTube / Vimeo / TikTok page link into an embeddable player link. */
export function toEmbed(url: string): { src: string; vertical: boolean } {
  const u = url.trim();
  let m = u.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (m) return { src: `https://www.youtube.com/embed/${m[1]}`, vertical: true };
  m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (m) return { src: `https://www.youtube.com/embed/${m[1]}`, vertical: false };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { src: `https://player.vimeo.com/video/${m[1]}`, vertical: false };
  m = u.match(/tiktok\.com\/.*\/video\/(\d+)/);
  if (m) return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, vertical: true };
  return { src: u, vertical: false };
}
