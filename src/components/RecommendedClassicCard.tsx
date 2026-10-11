import React from 'react';
import { BookOpen } from 'lucide-react';

interface RecommendedClassicCardProps {
  book: string;
  author: string;
  coreIdea: string;
}

export function RecommendedClassicCard({
  book,
  author,
  coreIdea,
}: RecommendedClassicCardProps) {
  // Normalize book title: If title already has book brackets 『...』, use as is; otherwise wrap with 『...』
  let displayTitle = book.trim().replace(/^『『/g, '『').replace(/』』$/g, '』');
  if (!displayTitle.startsWith('『')) {
    displayTitle = `『${displayTitle}』`;
  }

  return (
    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-200/80 transition-colors shadow-2xs space-y-1.5 group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <BookOpen
            size={13}
            className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0"
          />
          <span className="font-semibold text-xs text-slate-900 truncate">
            {displayTitle}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium shrink-0">
          {author}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
        {coreIdea}
      </p>
    </div>
  );
}
