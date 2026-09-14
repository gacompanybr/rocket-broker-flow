import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMetaVideoPreview } from "@/lib/meta.functions";

export type AdCreative = {
  id: string;
  campaign_id: string;
  adset_name: string | null;
  nome: string;
  effective_status: string | null;
  media_type: string;
  thumbnail_url: string | null;
  image_url: string | null;
  video_id: string | null;
  body: string | null;
  title: string | null;
  link_url: string | null;
};

export function AdCreativeCard({ ad, campaignName }: { ad: AdCreative; campaignName?: string }) {
  const [open, setOpen] = useState(false);
  const getVideo = useServerFn(getMetaVideoPreview);
  const video = useQuery({
    queryKey: ["meta_video", ad.video_id],
    enabled: open && Boolean(ad.video_id),
    staleTime: 10 * 60_000,
    queryFn: () => getVideo({ data: { videoId: ad.video_id ?? "" } }),
  });
  const thumbnail = ad.thumbnail_url ?? ad.image_url;

  return (
    <>
      <article className="group min-w-0 overflow-hidden rounded-md border border-border bg-card">
        <button
          type="button"
          className="relative block aspect-video w-full overflow-hidden bg-muted text-left"
          onClick={() => setOpen(true)}
          aria-label={`Abrir criativo ${ad.nome}`}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`Prévia do anúncio ${ad.nome}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </span>
          )}
          {ad.media_type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/15 text-background">
              <PlayCircle className="h-10 w-10" />
            </span>
          )}
        </button>
        <div className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold">{ad.nome}</h3>
            <Badge variant="outline" className="shrink-0 border-success/40 text-success">
              Ativo
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{campaignName ?? ad.adset_name ?? "Meta Ads"}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
            Ver anúncio
          </Button>
        </div>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ad.title || ad.nome}</DialogTitle>
            <DialogDescription>{campaignName} · {ad.adset_name ?? "Conjunto não informado"}</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-md bg-muted">
            {ad.video_id && video.data?.source ? (
              <video controls preload="metadata" poster={thumbnail ?? undefined} className="max-h-[55svh] w-full bg-foreground">
                <source src={video.data.source} />
              </video>
            ) : thumbnail ? (
              <img src={thumbnail} alt={`Criativo ${ad.nome}`} referrerPolicy="no-referrer" className="max-h-[55svh] w-full object-contain" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-muted-foreground">
                {video.isLoading ? "Carregando vídeo…" : "Prévia indisponível"}
              </div>
            )}
          </div>
          {ad.body && <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{ad.body}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}