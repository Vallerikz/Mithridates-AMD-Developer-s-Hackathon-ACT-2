import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, FileText } from "lucide-react";

interface HistoryItem {
  video_id: number;
  summary_text: string | null;
  created_at: string;
}

interface HistoryResponse {
  items: HistoryItem[];
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the dynamic API URL instead of hardcoded port 5000
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/history?page=1&per_page=20`);
      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }
      const data: HistoryResponse = await res.json();
      setHistory(data.items || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed top-0 left-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-r border-slate-100"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-black">
                <Clock className="w-5 h-5" />
                <h2 className="text-lg font-bold tracking-tight">History</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-black hover:bg-slate-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {isLoading ? (
                <div className="text-sm font-medium text-slate-400 uppercase tracking-widest text-center mt-10 animate-pulse">
                  Loading past sessions...
                </div>
              ) : error ? (
                <div className="text-sm font-medium text-rose-500 text-center mt-10">
                  {error}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center mt-20 flex flex-col items-center opacity-50">
                  <FileText className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-sm font-medium text-slate-500">Wow, such empty. Start streaming to build up your fact-checking history!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {history.map((item) => (
                    <div
                      key={item.video_id}
                      className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                        {formatDate(item.created_at)}
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed">
                        {item.summary_text ? (
                          item.summary_text
                        ) : (
                          <span className="italic text-slate-400">No summary was generated for this session.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
