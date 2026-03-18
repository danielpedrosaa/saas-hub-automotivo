import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JobPhotoUploadProps {
  jobId: string;
  photoType: "before" | "after";
  photos: { id: string; photo_url: string }[];
  onPhotosChange: () => void;
  maxPhotos?: number;
}

export default function JobPhotoUpload({
  jobId,
  photoType,
  photos,
  onPhotosChange,
  maxPhotos = 5,
}: JobPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = async (file: File) => {
    if (photos.length >= maxPhotos) {
      toast({ title: `Máximo de ${maxPhotos} fotos`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${jobId}/${photoType}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("job-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("job-photos")
        .getPublicUrl(path);

      const { error: dbErr } = await supabase.from("job_photos").insert({
        job_id: jobId,
        photo_url: urlData.publicUrl,
        photo_type: photoType,
      });
      if (dbErr) throw dbErr;

      onPhotosChange();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (photoId: string, url: string) => {
    try {
      // Extract storage path from URL
      const parts = url.split("/job-photos/");
      if (parts[1]) {
        await supabase.storage.from("job-photos").remove([parts[1]]);
      }
      await supabase.from("job_photos").delete().eq("id", photoId);
      onPhotosChange();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {photoType === "before" ? "Fotos de Entrada" : "Fotos de Saída"}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={p.photo_url}
              alt="Foto do veículo"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              onClick={() => removePhoto(p.id, p.photo_url)}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px]">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
