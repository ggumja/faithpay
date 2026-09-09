import { Loader2 } from 'lucide-react';

interface PageLoadingFallbackProps {
  message?: string;
}

export default function PageLoadingFallback({ message = '페이지를 불러오는 중입니다...' }: PageLoadingFallbackProps) {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center">
        {/* Subtle glowing backdrop circle */}
        <div className="absolute w-16 h-16 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 animate-ping opacity-75" />
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shadow-xs">
          <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-4 tracking-tight animate-pulse">
        {message}
      </p>
    </div>
  );
}
