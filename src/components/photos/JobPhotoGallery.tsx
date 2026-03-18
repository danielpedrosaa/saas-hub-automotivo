import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

interface Photo {
  id: string;
  photo_url: string;
  photo_type: string;
}

interface JobPhotoGalleryProps {
  photos: Photo[];
}

export default function JobPhotoGallery({ photos }: JobPhotoGalleryProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos = photos.filter((p) => p.photo_type === "after");

  if (photos.length === 0) return null;

  const renderSection = (title: string, items: Photo[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {items.map((p) => (
            <button
              key={p.id}
              onClick={() => setViewUrl(p.photo_url)}
              className="aspect-square rounded-md overflow-hidden border border-border bg-muted"
            >
              <img
                src={p.photo_url}
                alt={title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" />
          Fotos — {photos.length}
        </p>
        {renderSection("Entrada", beforePhotos)}
        {renderSection("Saída", afterPhotos)}
      </div>

      <Dialog open={!!viewUrl} onOpenChange={(o) => !o && setViewUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-1 bg-black border-none">
          {viewUrl && (
            <img
              src={viewUrl}
              alt="Foto do veículo"
              className="w-full h-full object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
