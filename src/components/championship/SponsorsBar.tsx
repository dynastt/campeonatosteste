import { useState } from 'react';

interface SponsorsBarProps {
  sponsors?: string[];
}

/** Faixa fina e discreta com logos de patrocinadores, exibida no topo. */
const SponsorsBar = ({ sponsors }: SponsorsBarProps) => {
  const list = (sponsors || []).filter(Boolean).slice(0, 7);
  if (list.length === 0) return null;
  return (
    <div className="border-b bg-muted/30 backdrop-blur">
      <div className="container mx-auto px-4 py-1.5">
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Apoio</span>
          {list.map((url, i) => (
            <SponsorImage key={`${url}-${i}`} src={url} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

const SponsorImage = ({ src, index }: { src: string; index: number }) => {
  const [error, setError] = useState(false);
  if (error) return null;
  return (
    <img
      src={src}
      alt={`Patrocinador ${index + 1}`}
      className="h-7 sm:h-8 w-auto max-w-[110px] object-contain opacity-80 hover:opacity-100 transition-opacity"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

export default SponsorsBar;