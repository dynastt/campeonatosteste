import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AnnouncementPopupProps {
  announcement: {
    id: string;
    title: string;
    description?: string | null;
    image_url?: string | null;
  } | null;
}

/** Popup do aviso para visitantes do link público. Aparece toda vez que abrir o link. */
const AnnouncementPopup = ({ announcement }: AnnouncementPopupProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (announcement) setOpen(true);
    else setOpen(false);
  }, [announcement?.id]);

  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{announcement.title}</DialogTitle>
          {announcement.description && (
            <DialogDescription className="whitespace-pre-wrap text-sm pt-1">
              {announcement.description}
            </DialogDescription>
          )}
        </DialogHeader>
        {announcement.image_url && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
            <img
              src={announcement.image_url}
              alt={announcement.title}
              className="w-full max-h-[300px] object-contain"
              loading="lazy"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementPopup;