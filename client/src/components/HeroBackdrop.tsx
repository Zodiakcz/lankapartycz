import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Header art of the gold games, for the blurred collage behind party banners
export function useGoldArt(max = 4) {
  const [art, setArt] = useState<string[]>([])
  useEffect(() => {
    api.games()
      .then(r => setArt(r.games.filter(g => g.tier === 'gold' && g.imageUrl).slice(0, max).map(g => g.imageUrl)))
      .catch(() => {})
  }, [max])
  return art
}

// One blurred gold-game picture with a dark fade, like the background of a Steam store page.
// `seed` (the party id) picks the picture, so parties differ but each stays the same.
// Sits absolutely inside a `relative` parent and clips itself, so menus in the parent can overflow.
export function HeroBackdrop({ images, seed = 0 }: { images: string[]; seed?: number }) {
  const src = images.length > 0 ? images[seed % images.length] : null
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      {src ? (
        <img src={src} alt="" referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] scale-110 blur-[2px] opacity-50" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/70 via-zinc-900 to-zinc-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />
    </div>
  )
}
