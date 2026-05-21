import React from "react";
import { motion } from "motion/react";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudDrizzle,
  Wind,
  Droplets,
  TrendingUp,
  Flame,
  CalendarDays,
  Clock3,
  Eye,
  Gauge
} from "lucide-react";
import { WeatherDetailsResponse } from "../types";

interface ForecastGridProps {
  weatherData: WeatherDetailsResponse;
}

// Helper to map WMO weather codes to appropriate Lucide Icons & Colors
export const getWeatherIcon = (code: number, isDay: boolean = true) => {
  const sizeClass = "h-6 w-6";
  if (code === 0) {
    return isDay ? (
      <Sun className={`${sizeClass} text-amber-400`} />
    ) : (
      <Moon className={`${sizeClass} text-slate-300`} />
    );
  }
  if (code >= 1 && code <= 3) {
    return isDay ? (
      <CloudSun className={`${sizeClass} text-sky-300`} />
    ) : (
      <Cloud className={`${sizeClass} text-slate-400`} />
    );
  }
  if (code === 45 || code === 48) {
    return <Cloud className={`${sizeClass} text-slate-500 opacity-60`} />;
  }
  if (code >= 51 && code <= 57) {
    return <CloudDrizzle className={`${sizeClass} text-teal-400`} />;
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain className={`${sizeClass} text-sky-400`} />;
  }
  if (code >= 71 && code <= 77) {
    return <Snowflake className={`${sizeClass} text-sky-200 animate-spin-slow`} />;
  }
  if (code >= 95 && code <= 99) {
    return <CloudLightning className={`${sizeClass} text-violet-400`} />;
  }
  return <Cloud className={`${sizeClass} text-slate-400`} />;
};

// Helper to get general string status label from WMO code
export const getWeatherLabel = (code: number) => {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Partly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy Mist";
  if (code >= 51 && code <= 55) return "Light Drizzle";
  if (code >= 61 && code <= 65) return "Moderate Rain";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 77) return "Heavy Snowfall";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Heavy Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Variable Clouds";
};

// Formatter for day index text
const getDayName = (dateStr: string) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const date = new Date(dateStr);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  return days[date.getDay()];
};

// Helper to convert degrees to cardinal wind direction
export const getWindDirectionCardinal = (deg: number | undefined) => {
  if (deg === undefined) return "WSW";
  const index = Math.floor(((deg + 11.25) % 360) / 22.5);
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];
  return directions[index];
};

export const ForecastGrid: React.FC<ForecastGridProps> = ({ weatherData }) => {
  const { hourly, daily, current } = weatherData;

  // Filter hourly to the next 24 elements starting from current hour
  const currentHourDate = new Date();
  currentHourDate.setMinutes(0, 0, 0);
  const currentHourISO = currentHourDate.toISOString().slice(0, 13);

  let startIdx = hourly.time.findIndex((t) => t.startsWith(currentHourISO));
  if (startIdx === -1) startIdx = 0;
  
  const next24Hours = {
    time: hourly.time.slice(startIdx, startIdx + 24),
    temp: hourly.temperature_2m.slice(startIdx, startIdx + 24),
    code: hourly.weather_code.slice(startIdx, startIdx + 24),
    humidity: hourly.relative_humidity_2m.slice(startIdx, startIdx + 24),
    wind: hourly.wind_speed_10m.slice(startIdx, startIdx + 24),
    precip: hourly.precipitation_probability.slice(startIdx, startIdx + 24),
  };

  // Generate responsive mini SVGs to trace the 24h temp trend
  const minTemp = Math.min(...next24Hours.temp);
  const maxTemp = Math.max(...next24Hours.temp);
  const tempRange = maxTemp - minTemp || 1;

  // Calculate coordinates for the SVG path
  const points = next24Hours.temp.map((temp, index) => {
    const x = (index / 23) * 100; // percent based width
    // scale y value where max is closer to top (e.g. 10%) and min close to bottom (e.g. 90%)
    const y = 90 - ((temp - minTemp) / tempRange) * 80;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L 100,100 L 0,100 Z`;

  return (
    <div className="space-y-6">
      {/* 24-HOUR INTERACTIVE TIMELINE CARD */}
      <div id="hourly-forecast-card" className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/10 text-cyan-300">
            <Clock3 className="h-4 w-4" />
          </div>
          <h3 className="font-sans font-semibold text-white text-base">24H forecast</h3>
        </div>

        {/* Diagonal Temperature Trend Line Chart in background */}
        <div className="absolute bottom-20 left-6 right-6 h-14 opacity-30 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#chartGradient)" />
            <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Scrollable Hourly Container */}
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-2 px-2 snap-x touch-pan-x">
          {next24Hours.time.map((timeStr, idx) => {
            const date = new Date(timeStr);
            const hour = date.getHours();
            const displayTime = hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
            const isCurrentHour = idx === 0;

            return (
              <div
                key={timeStr}
                className={`flex-shrink-0 w-20 flex flex-col items-center py-4 rounded-2xl snap-align-start border transform-gpu transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg active:scale-95 ${
                  isCurrentHour
                    ? "bg-white/15 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)] ring-1 ring-white/15"
                    : "bg-white/5 border-white/5 hover:bg-white/10"
                }`}
              >
                {/* Time */}
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                  {isCurrentHour ? "Now" : displayTime}
                </span>

                {/* Status Icon */}
                <div className="my-3 flex items-center justify-center h-8 w-8 relative">
                  {getWeatherIcon(next24Hours.code[idx], current.is_day === 1)}
                  {next24Hours.precip[idx] > 20 && (
                    <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-cyan-300 bg-black/40 rounded px-1 scale-90 backdrop-blur-md">
                      {next24Hours.precip[idx]}%
                    </span>
                  )}
                </div>

                {/* Temperature */}
                <span className="text-sm font-sans font-semibold text-white">
                  {Math.round(next24Hours.temp[idx])}°
                </span>

                {/* Secondary metric metrics */}
                <div className="mt-3 flex flex-col items-center gap-1 opacity-70">
                  <div className="flex items-center gap-0.5 text-[9px] font-mono text-white/60">
                    <Droplets className="h-2.5 w-2.5 text-cyan-300/80" />
                    <span>{next24Hours.humidity[idx]}%</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[9px] font-mono text-white/60">
                    <Wind className="h-2.5 w-2.5 text-sky-300/80" />
                    <span>{Math.round(next24Hours.wind[idx])}k</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* METEOROLOGY DETAILS CARD */}
      <div id="weather-details-card" className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/10 text-cyan-300">
            <Gauge className="h-4 w-4" />
          </div>
          <h3 className="font-sans font-semibold text-white text-base">Details</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Precipitation */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between text-white/50 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider">Precipitation</span>
              <CloudRain className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">
                {current.precipitation !== undefined ? `${current.precipitation} mm` : "0 mm"}
              </span>
              <p className="text-[10px] text-white/50 mt-1">Expected amount today</p>
            </div>
          </div>

          {/* WSW Wind Direction */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between text-white/50 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider">WSW Wind</span>
              <Wind className="h-4 w-4 text-teal-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">
                {getWindDirectionCardinal(current.wind_direction_10m)}
              </span>
              <p className="text-[10px] text-white/50 mt-1">
                {Math.round(current.wind_speed_10m)} km/h velocity
              </p>
            </div>
          </div>

          {/* HUM (Humidity) */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between text-white/50 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider">HUM</span>
              <Droplets className="h-4 w-4 text-sky-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">
                {current.relative_humidity_2m}%
              </span>
              <p className="text-[10px] text-white/50 mt-1">Relative humidity level</p>
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between text-white/50 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider">Visibility</span>
              <Eye className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">
                {current.visibility !== undefined ? `${(current.visibility / 1000).toFixed(1)} km` : "10.0 km"}
              </span>
              <p className="text-[10px] text-white/50 mt-1">Atmospheric clarity</p>
            </div>
          </div>

          {/* UV */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between text-white/50 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider">UV</span>
              <Flame className="h-4 w-4 text-rose-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">
                {daily.uv_index_max && daily.uv_index_max[0] !== undefined 
                  ? Math.round(daily.uv_index_max[0]) 
                  : "3"}
              </span>
              <p className="text-[10px] text-white/50 mt-1">Daily max ultraviolet</p>
            </div>
          </div>

          {/* Pressure (in Hg) */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between text-white/50 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider">Pressure</span>
              <Gauge className="h-4 w-4 text-indigo-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">
                {current.surface_pressure !== undefined 
                  ? `${(current.surface_pressure * 0.02953).toFixed(2)} inHg` 
                  : "29.92 inHg"}
              </span>
              <p className="text-[10px] text-white/50 mt-1">Barometric pressure</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7-DAY EXTENDED OUTLOOK CARD */}
      <div id="weekly-forecast-card" className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/10 text-amber-300">
            <CalendarDays className="h-4 w-4" />
          </div>
          <h3 className="font-sans font-semibold text-white text-base">Extended 7-Day Outlook</h3>
        </div>

        {/* SIDE-BY-SIDE HORIZONTALLY SCROLLING GRID */}
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-2 px-2 snap-x touch-pan-x">
          {daily.time.map((timeStr, idx) => {
            const max = Math.round(daily.temperature_2m_max[idx]);
            const min = Math.round(daily.temperature_2m_min[idx]);
            const code = daily.weather_code[idx];
            const uv = Math.round(daily.uv_index_max[idx]);
            const wind = Math.round(daily.wind_speed_10m_max[idx]);
            const dayLabel = getDayName(timeStr);
            const isToday = dayLabel === "Today";

            return (
              <div
                key={timeStr}
                className={`flex-shrink-0 w-44 md:w-48 snap-align-start flex flex-col justify-between p-4 rounded-2xl border transform-gpu transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:shadow-lg active:scale-95 ${
                  isToday
                    ? "bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] ring-1 ring-white/15 animate-none"
                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 mb-3">
                  <span className="text-sm font-semibold text-white tracking-wide">
                    {dayLabel}
                  </span>
                  {isToday && (
                    <span className="rounded bg-white/15 border border-white/20 text-[8px] font-bold text-white px-1.5 py-0.5 uppercase tracking-wider animate-pulse">
                      Live
                    </span>
                  )}
                </div>

                {/* Weather details */}
                <div className="flex flex-col items-center justify-center gap-1.5 my-3 text-center">
                  <div className="flex h-10 w-10 items-center justify-center bg-white/10 rounded-xl border border-white/10">
                    {getWeatherIcon(code, true)}
                  </div>
                  <span className="text-xs text-white/85 font-sans font-medium line-clamp-1">
                    {getWeatherLabel(code)}
                  </span>
                </div>

                {/* Supplementary dynamics */}
                <div className="flex items-center justify-between text-[10px] font-mono text-white/50 border-t border-white/5 pt-2 mb-3">
                  <span className="flex items-center gap-1">
                    <Wind className="h-3 w-3 text-white/40" />
                    {wind} km/h
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-amber-300" />
                    UV {uv}
                  </span>
                </div>

                {/* Core bounds */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-white/50">
                    {min}°
                  </span>
                  
                  {/* Spectrum element */}
                  <div className="relative w-16 h-1 bg-white/10 rounded-full overflow-hidden mx-2 flex-grow">
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-sky-300 to-amber-300"
                      style={{
                        left: "20%",
                        width: "60%",
                      }}
                    />
                  </div>

                  <span className="font-sans font-bold text-white">
                    {max}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
