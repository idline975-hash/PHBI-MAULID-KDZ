import { WifiOff, RefreshCw, Database } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  onRetrySync?: () => void;
  isSyncing?: boolean;
}

export default function OfflineIndicator({ isOnline, onRetrySync, isSyncing = false }: OfflineIndicatorProps) {
  if (isOnline) return null;

  return (
    <aside aria-label="Status Koneksi" className="fixed bottom-4 left-4 z-40 max-w-sm animate-in slide-in-from-bottom duration-200">
      <div className="px-3.5 py-2.5 bg-amber-500/95 backdrop-blur-xs text-white rounded-2xl shadow-xl border border-amber-300 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-600 rounded-xl">
            <WifiOff className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <p className="font-extrabold flex items-center gap-1.5">
              <span>Mode Offline</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-600/60 text-[10px] font-mono">
                <Database className="w-2.5 h-2.5" />
                Cache Aktif
              </span>
            </p>
            <p className="text-[11px] text-amber-100">
              Data tersimpan tetap dapat dibuka. Sinkronisasi otomatis saat terhubung kembali.
            </p>
          </div>
        </div>

        {onRetrySync && (
          <button
            type="button"
            onClick={onRetrySync}
            disabled={isSyncing}
            className="px-2.5 py-1.5 bg-white text-amber-950 font-bold rounded-xl text-[11px] shadow-xs hover:bg-amber-100 transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menghubungkan...' : 'Coba'}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
