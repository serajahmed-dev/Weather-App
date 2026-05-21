import React from "react";
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  badgeLevel?: "low" | "mod" | "high" | "ideal" | "none";
  gaugeType?: "circle" | "semicircle" | "arc" | "none";
  gaugePercent?: number; // 0 to 100
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  unit = "",
  subtitle = "",
  icon: Icon,
  iconColorClass = "text-indigo-400",
  badgeLevel = "none",
  gaugeType = "none",
  gaugePercent = 0,
  children,
}) => {
  // Map badge level colors
  const badgeColors = {
    low: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
    mod: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    high: "bg-rose-500/10 text-rose-300 border border-rose-500/20",
    ideal: "bg-teal-500/10 text-teal-300 border border-teal-500/20",
    none: "hidden",
  };

  return (
    <div
      id={id}
      className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-2xl group hover:bg-white/10 hover:border-white/20 transition-all duration-350"
    >
      {/* Background Soft Glows */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-indigo-400/10 transition-all duration-350 pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-white/50">
            {title}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-sans font-light text-white tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-sans font-medium text-white/60">
                {unit}
              </span>
            )}
          </div>
        </div>

        {/* Custom Icon Box */}
        <div className={`p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 ${iconColorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Main Content Area (e.g. gauge or child slots) */}
      <div className="flex-grow flex items-center justify-center my-1">
        {gaugeType === "circle" && (
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Background circle track */}
            <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
              <path
                className="text-white/10"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Foreground progress track */}
              <motion.path
                id={`gauge-${id}`}
                className="text-cyan-300"
                strokeWidth="3.2"
                strokeDasharray={`${gaugePercent}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${gaugePercent}, 100` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[10px] font-mono font-semibold text-white/95">
                {gaugePercent}%
              </span>
            </div>
          </div>
        )}

        {gaugeType === "semicircle" && (
          <div className="relative w-24 h-12 overflow-hidden flex items-end justify-center">
            {/* Semicircle Gauge standard representation */}
            <svg viewBox="0 0 36 18" className="w-full h-full">
              <path
                className="text-white/10"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                d="M4 18 A 14 14 0 0 1 32 18"
              />
              <motion.path
                id={`gauge-${id}-semi`}
                className="text-amber-400"
                strokeWidth="3.5"
                strokeDasharray={`${gaugePercent / 2}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M4 18 A 14 14 0 0 1 32 18"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${gaugePercent * 0.44}, 100` }} // scale for semicircle bounds
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute bottom-0 flex flex-col items-center pb-0.5">
              <span className="text-[10px] font-mono leading-none font-semibold text-white/95">
                {gaugePercent}%
              </span>
            </div>
          </div>
        )}

        {children}
      </div>

      {/* Card Footer Details */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
        {subtitle && (
          <span className="text-[10px] font-mono text-white/50 truncate">
            {subtitle}
          </span>
        )}
        {badgeLevel !== "none" && (
          <span className={`text-[9px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 shrink-0 ${badgeColors[badgeLevel]}`}>
            {badgeLevel}
          </span>
        )}
      </div>
    </div>
  );
};
