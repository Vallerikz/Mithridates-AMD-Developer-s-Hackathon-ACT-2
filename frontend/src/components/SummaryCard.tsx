import { motion } from "framer-motion";
import { FileText } from "lucide-react";

interface SummaryCardProps {
  summary: string | null;
  isLoading: boolean;
}

export function SummaryCard({ summary, isLoading }: SummaryCardProps) {
  if (!isLoading && !summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto mt-8 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">Post-Session Analysis</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Summary Report
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Processing Analysis...</p>
          </div>
        ) : (
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-800 leading-relaxed text-sm whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
