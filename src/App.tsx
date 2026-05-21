import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  MapPin,
  Compass,
  Wind,
  Droplets,
  Sunset,
  Sunrise,
  Sun,
  Flame,
  Gauge,
  CloudLightning,
  CloudRain,
  Snowflake,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Thermometer,
  RotateCw,
  ExternalLink,
  Github
} from "lucide-react";

import { WeatherDetailsResponse, GeocodingResult, AIInsights } from "./types";
import { WeatherAmbientEffect } from "./components/WeatherAnimations";
import { ForecastGrid, getWeatherIcon, getWeatherLabel } from "./components/ForecastGrid";
import { MetricCard } from "./components/MetricCard";
import { AIPredictions } from "./components/AIPredictions";

export default function App() {
  // Search parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Core coordinates (Default to Tokyo, JP)
  const [lat, setLat] = useState<number>(35.6762);
  const [lon, setLon] = useState<number>(139.6503);
  const [locationName, setLocationName] = useState("Tokyo, JP");
  const [locationSyncStatus, setLocationSyncStatus] = useState<"syncing" | "synced" | "default" | "error">("syncing");

  // Weather parameters
  const [weatherData, setWeatherData] = useState<WeatherDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMetric, setIsMetric] = useState(true); // Celsius vs Fahrenheit

  // AI-Insights parameters
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Sticky header scroll detection
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const weatherEl = document.getElementById("current-instant-weather");
      if (weatherEl) {
        const rect = weatherEl.getBoundingClientRect();
        // Trigger the floating window only when the main city/temperature display card starts scrolling above the viewport top.
        // Once the card top is fully back in view (top > 10px), immediately hide the floating window.
        if (rect.top <= 10) {
          setIsScrolled(true);
        } else {
          setIsScrolled(false);
        }
      } else {
        // Fallback for loading states or if the element is not on the screen yet
        if (window.scrollY > 220) {
          setIsScrolled(true);
        } else {
          setIsScrolled(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Trigger initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [weatherData, isLoading]);

  // 1. Initial Launch: Try Geolocation Synchronisation automatically
  useEffect(() => {
    syncUserLocation();
  }, []);

  const syncUserLocation = () => {
    setLocationSyncStatus("syncing");
    
    if (!navigator.geolocation) {
      setLocationSyncStatus("default");
      fetchWeatherData(35.6762, 139.6503, "Tokyo, JP");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude);
        setLon(longitude);
        
        let cleanName = `My Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;
        try {
          const revRes = await fetch(`/api/weather/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          if (revRes.ok) {
            const revData = await revRes.json();
            if (revData.name) {
              cleanName = revData.name;
            }
          }
        } catch (revErr) {
          console.warn("Could not reverse-geocode client coordinates:", revErr);
        }

        setLocationSyncStatus("synced");
        fetchWeatherData(latitude, longitude, cleanName);
      },
      (geoError) => {
        console.warn("Geolocation denied or failed:", geoError.message);
        setLocationSyncStatus("default");
        // Fallback to Tokyo
        fetchWeatherData(35.6762, 139.6503, "Tokyo, JP");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 2. Fetch Detailed Weather parameters from backend (proxied through Express to safeguard integrity)
  const fetchWeatherData = async (latitude: number, longitude: number, locName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/weather/details?lat=${latitude}&lon=${longitude}`);
      if (!response.ok) {
        throw new Error("Could not retrieve weather facts from server.");
      }
      const data: WeatherDetailsResponse = await response.json();
      setWeatherData(data);
      setLocationName(locName);

      // Successfully retrieved weather data, now summon localized AI insights
      fetchAIInsights(data, locName);
    } catch (err: any) {
      setError(err.message || "Failed to load weather report.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Summon Server-side Gemini AI insights
  const fetchAIInsights = async (weather: WeatherDetailsResponse, locName: string) => {
    setIsLoadingAI(true);
    try {
      const response = await fetch("/api/weather/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current: weather.current,
          daily: weather.daily,
          locationName: locName,
        }),
      });

      if (!response.ok) {
        throw new Error("AI Advisor failed to compile details.");
      }
      const insightsData: AIInsights = await response.json();
      setAiInsights(insightsData);
    } catch (err: any) {
      console.error("AI Insights Error:", err);
      // Fallback details if Gemini is not set or network fails
      setAiInsights({
        summary: `It's currently ${weather.current.temperature_2m}°C with winds up to ${weather.current.wind_speed_10m} km/h. Skies are currently experiencing standard atmospheric variations.`,
        advice: "Dress in comfortable layers. Keeping an eye on wind gauges is advised.",
        prediction: "Variable patterns expected throughout the upcoming shifts.",
        vibe: "Fresh Outdoor Atmosphere",
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  // 4. Handle Search Form Geocoding
  const handleQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/weather/search?query=${encodeURIComponent(val)}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("Geocoding lookup failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (result: GeocodingResult) => {
    const displayName = `${result.name}, ${result.country_code ? result.country_code.toUpperCase() : result.country}`;
    setLat(result.latitude);
    setLon(result.longitude);
    setLocationSyncStatus("synced");
    setShowDropdown(false);
    setSearchQuery("");
    fetchWeatherData(result.latitude, result.longitude, displayName);
  };

  // Conversion helpers (Celsius to Fahrenheit)
  const formatTemp = (celsius: number) => {
    if (isMetric) return `${Math.round(celsius)}°C`;
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${Math.round(fahrenheit)}°F`;
  };

  const formatWindSpeed = (kmh: number) => {
    if (isMetric) return `${Math.round(kmh)} km/h`;
    const mph = kmh * 0.621371;
    return `${Math.round(mph)} mph`;
  };

  // Human Readable Hours for sunrise / sunset (HH:MM)
  const formatSunTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  return (
    <div id="weather-dashboard-root" className="min-h-screen w-full relative bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900 font-sans text-white flex flex-col justify-between overflow-x-hidden pt-4 pb-8">
      
      {/* Background Atmosphere Elements (Visual Representations of Weather Icons/Air Flow) */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-50px] right-[-50px] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* 1. Immersive Animated Weather Layer in background */}
      {weatherData && (
        <WeatherAmbientEffect
          weatherCode={weatherData.current.weather_code}
          isDay={weatherData.current.is_day === 1}
          windSpeed={weatherData.current.wind_speed_10m}
          temperature={weatherData.current.temperature_2m}
        />
      )}

      {/* Main Dashboard wrapper */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 z-10 space-y-6 flex-grow">
        
        {/* TOP BAR / NAVIGATION / SEARCH INDEX */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="relative z-40 mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-4 shadow-2xl"
        >
          {/* Branded Label */}
          <div className="flex items-center gap-3 select-none">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-white">
              <Compass className="h-6 w-6 animate-spin-slow text-indigo-100" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg tracking-tight text-white leading-none">Weather</h1>
              <span className="font-mono text-[10px] text-white/60 tracking-wider">
                Seraj Ahmed
              </span>
            </div>
          </div>

          {/* Location Synchronisation Box & Metric Selector */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sync status button */}
            <button
              onClick={syncUserLocation}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all active:scale-95 disabled:pointer-events-none ${
                locationSyncStatus === "synced"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                  : locationSyncStatus === "syncing"
                  ? "bg-sky-500/20 border-sky-500/40 text-sky-200 animate-pulse"
                  : "bg-white/10 border-white/20 hover:bg-white/15 text-white/95"
              }`}
            >
              <MapPin className={`h-3.5 w-3.5 ${locationSyncStatus === "syncing" ? "animate-spin" : ""}`} />
              <span>
                {locationSyncStatus === "syncing"
                  ? "Syncing Coordinates..."
                  : locationSyncStatus === "synced"
                  ? "GPS Synced"
                  : "Lock GPS Location"}
              </span>
            </button>

            {/* Celsius vs Fahrenheit Toggle */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setIsMetric(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  isMetric ? "bg-white text-indigo-950 shadow-md" : "text-white/60 hover:text-white"
                }`}
              >
                °C
              </button>
              <button
                onClick={() => setIsMetric(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  !isMetric ? "bg-white text-indigo-950 shadow-md" : "text-white/60 hover:text-white"
                }`}
              >
                °F
              </button>
            </div>
          </div>

          {/* Interactive Geocoding Search Input */}
          <div className="relative w-full md:w-80">
            <div className="flex items-center bg-white/5 rounded-xl border border-white/10 focus-within:border-white/30 p-1 transition-all">
              <div className="pl-2 text-white/50">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={handleQueryChange}
                placeholder="Search city..."
                className="w-full text-xs text-white placeholder-white/40 bg-transparent py-2 px-2.5 focus:outline-none"
              />
              {isSearching && (
                <div className="pr-3 text-white/50">
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                </div>
              )}
            </div>

            {/* Geocoding Dropdown results */}
            <AnimatePresence>
              {showDropdown && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute z-50 top-full right-0 left-0 mt-2 rounded-2xl bg-indigo-950/90 backdrop-blur-xl border border-white/15 p-2 shadow-2xl space-y-1"
                >
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => handleSelectLocation(res)}
                      className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 transition-all group"
                    >
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {res.name}
                        </p>
                        <p className="text-[10px] text-white/50">
                          {res.admin1 ? `${res.admin1}, ` : ""}{res.country}
                        </p>
                      </div>
                      {res.current_temp_c != null ? (
                        <span className="text-xs font-sans font-semibold rounded bg-white/10 px-2 py-1 border border-white/15 text-cyan-200">
                          {formatTemp(res.current_temp_c)}
                        </span>
                      ) : (
                        <span className="text-xs font-sans text-white/40">
                          --
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Click-out blocker mask for dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            )}
          </div>
        </motion.header>


        {/* ERROR SUMMARY */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-3 backdrop-blur-md">
            <Info className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* MAIN WEATHER FORECAST INTERACTION PANEL */}
        {isLoading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <div className="absolute w-20 h-20 rounded-full border-4 border-white/10 animate-ping" />
              <div className="w-16 h-16 rounded-full border-t-4 border-r-4 border-white/50 animate-spin" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-lg text-white">Extracting Weather Matrix</h2>
              <p className="font-mono text-xs text-white/60 mt-1">Calibrating precision indicators for {locationName}</p>
            </div>
          </div>
        ) : weatherData ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          >
            
            {/* COLUMN 1: CURRENT INSTANT WEATHER STATS CARD */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* PRIMARY INSTANT ATMOSPHERE STATUS */}
              <div id="current-instant-weather" className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-2xl flex flex-col justify-between transition-all duration-300 hover:shadow-cyan-500/5 hover:border-white/20">
                {/* Visual Glass Reflection Accent */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                {/* Big City & Temp Layout (Merged as requested) */}
                <div className="pb-4 mb-4 border-b border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-center gap-2 flex-wrap max-w-full">
                      <MapPin className="h-5 w-5 text-cyan-300 shrink-0" />
                      <h2 className="font-sans font-bold text-3xl md:text-4xl text-white tracking-tight break-words">
                        {locationName}
                      </h2>
                    </div>
                    <span className="font-sans font-semibold text-3xl md:text-4xl text-cyan-200 tracking-tight shrink-0">
                      {formatTemp(weatherData.current.temperature_2m)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white shadow-inner shrink-0">
                        {getWeatherIcon(weatherData.current.weather_code, weatherData.current.is_day === 1)}
                      </div>
                      <span className="text-sm font-sans font-medium text-white/90">
                        {getWeatherLabel(weatherData.current.weather_code)}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase bg-white/10 rounded-md border border-white/10 px-2.5 py-1 text-white/70 tracking-wider">
                      {weatherData.current.is_day ? "Day" : "Night"}
                    </span>
                  </div>
                </div>

                {/* Basic Metrics List */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center gap-2.5 p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-300">
                    <Thermometer className="h-4.5 w-4.5 text-amber-300 shrink-0" />
                    <div>
                      <p className="text-[9px] text-white/50 uppercase tracking-widest font-mono leading-tight">Feels Like</p>
                      <p className="text-xs font-semibold text-white mt-0.5">
                        {formatTemp(weatherData.current.apparent_temperature)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-300">
                    <Wind className="h-4.5 w-4.5 text-cyan-300 shrink-0" />
                    <div>
                      <p className="text-[9px] text-white/50 uppercase tracking-widest font-mono leading-tight">Wind Flow</p>
                      <p className="text-xs font-semibold text-white mt-0.5">
                        {formatWindSpeed(weatherData.current.wind_speed_10m)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECONDARY ATMOSPHERIC METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Humidity Widget */}
                <MetricCard
                  id="humidity-card"
                  title="Relative Humidity"
                  value={weatherData.current.relative_humidity_2m}
                  unit="%"
                  subtitle="Moisture indices in atmosphere"
                  icon={Droplets}
                  iconColorClass="text-sky-400"
                  gaugeType="circle"
                  gaugePercent={weatherData.current.relative_humidity_2m}
                  badgeLevel={
                    weatherData.current.relative_humidity_2m < 40
                      ? "low"
                      : weatherData.current.relative_humidity_2m <= 60
                      ? "ideal"
                      : "high"
                  }
                />

                {/* Wind Dynamic Widget */}
                <MetricCard
                  id="wind-dynamics-card"
                  title="Wind Speed"
                  value={Math.round(weatherData.current.wind_speed_10m)}
                  unit=" km/h"
                  subtitle={`${formatWindSpeed(weatherData.current.wind_speed_10m)} dynamics`}
                  icon={Wind}
                  iconColorClass="text-teal-400"
                  gaugeType="semicircle"
                  gaugePercent={Math.min(
                    100,
                    Math.round((weatherData.current.wind_speed_10m / 50) * 100)
                  )}
                  badgeLevel={
                    weatherData.current.wind_speed_10m <= 10
                      ? "low"
                      : weatherData.current.wind_speed_10m <= 25
                      ? "mod"
                      : "high"
                  }
                />
              </div>

              {/* SOLAR CYCLES WIDGET */}
              <div id="solar-cycles-card" className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-2xl">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-white/50 block mb-4">
                  Solar Cycle Transitions
                </span>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 border border-white/10 text-amber-300 rounded-xl">
                      <Sunrise className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest">Sunrise</p>
                      <p className="text-xs font-semibold text-white">
                        {formatSunTime(weatherData.daily.sunrise[0])}
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Connector Dot-Line representing transition */}
                  <div className="flex-grow flex items-center justify-center px-2 relative min-w-10">
                    <div className="h-[1px] w-full border-t border-dashed border-white/20" />
                    <div className="absolute h-1.5 w-1.5 rounded-full bg-amber-400/60 animate-ping" />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 border border-white/10 text-cyan-300 rounded-xl">
                      <Sunset className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest text-right">Sunset</p>
                      <p className="text-xs font-semibold text-white text-right">
                        {formatSunTime(weatherData.daily.sunset[0])}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2 & 3: DETAILED FORECASTS GRID & AI PREDICTIONS CONTAINER */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* COMPREHENSIVE AI FORECAST ADVISOR */}
              <AIPredictions
                insights={aiInsights}
                locationName={locationName}
                weatherData={weatherData}
                isLoading={isLoadingAI}
                onRefreshInsights={() => fetchAIInsights(weatherData, locationName)}
              />

              {/* DYNAMIC METEOROLOGY GRID CHRONOLOGY */}
              <ForecastGrid weatherData={weatherData} />

            </div>

          </motion.div>
        ) : (
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-white/10 text-center backdrop-blur-xl">
            <Compass className="h-12 w-12 text-white/40 mb-4 animate-bounce" />
            <h3 className="text-base font-semibold text-white">No Atmosphere Registered</h3>
            <p className="text-xs text-white/50 mt-2">Connect a browser GPS node or lookup a city above to synchronize forecasts.</p>
          </div>
        )}

      </div>

      {/* FLOATING WINDOW (REFINED FIXED TRANSITION AND TEXT DESIGN ACCENTS) */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ y: -80, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: -80, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 28 }}
            className="fixed top-0 left-1/2 z-[100] w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] md:w-[calc(100%-4rem)] max-w-7xl flex items-center justify-between gap-3 p-3 rounded-b-2xl rounded-t-none bg-slate-950/95 backdrop-blur-xl border border-cyan-500/20 border-t-0 shadow-[0_15px_30px_rgba(0,0,0,0.5)]"
          >
            {/* Left Side: Weather Info & Tiny Branded Identifier */}
            <div className="flex items-center gap-2.5 overflow-hidden select-none">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 shadow-inner">
                {weatherData ? (
                  getWeatherIcon(weatherData.current.weather_code, weatherData.current.is_day === 1)
                ) : (
                  <Compass className="h-5 w-5 animate-spin-slow text-indigo-100" />
                )}
              </div>
              <div className="flex items-center gap-2 overflow-hidden py-1">
                {/* Lowered city label text size to draw highlight to temperature */}
                <h2 className="font-sans font-bold text-xs sm:text-sm text-white/80 tracking-tight leading-none truncate max-w-[90px] sm:max-w-[140px] md:max-w-xs">
                  {locationName}
                </h2>
                {weatherData && (
                  <span className="font-sans font-extrabold text-xs sm:text-base text-cyan-300 tracking-tight leading-none shrink-0 border-l border-white/20 pl-2">
                    {formatTemp(weatherData.current.temperature_2m)}
                  </span>
                )}
              </div>
            </div>

            {/* Right Side: Shared Search Field Inside Floating Window */}
            <div className="relative w-[45%] max-w-[280px]">
              <div className="flex items-center bg-white/5 rounded-xl border border-white/10 focus-within:border-cyan-500/40 p-1 transition-all">
                <div className="pl-2 text-white/50">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowDropdown(true)}
                  onChange={handleQueryChange}
                  placeholder="Search city..."
                  className="w-full text-xs text-white placeholder-white/40 bg-transparent py-1.5 px-2.5 focus:outline-none"
                />
                {isSearching && (
                  <div className="pr-3 text-white/50">
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  </div>
                )}
              </div>

              {/* Dropdown for Floating Window Input */}
              <AnimatePresence>
                {showDropdown && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute z-[110] top-full right-0 left-0 mt-2 rounded-2xl bg-indigo-950/95 backdrop-blur-xl border border-cyan-500/20 p-2 shadow-2xl space-y-1 max-h-60 overflow-y-auto"
                  >
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => handleSelectLocation(res)}
                        className="w-full text-left flex items-center justify-between p-2 rounded-xl h-11 hover:bg-white/10 transition-all group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {res.name}
                          </p>
                          <p className="text-[10px] text-white/50 truncate">
                            {res.admin1 ? `${res.admin1}, ` : ""}{res.country}
                          </p>
                        </div>
                        {res.current_temp_c != null ? (
                          <span className="text-xs font-sans font-semibold rounded bg-white/10 px-2 py-1 border border-white/15 text-cyan-200">
                            {formatTemp(res.current_temp_c)}
                          </span>
                        ) : (
                          <span className="text-xs font-sans text-white/40">
                            --
                          </span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dropdown Dismiss Backdrop */}
              {showDropdown && searchResults.length > 0 && (
                <div className="fixed inset-0 z-[105]" onClick={() => setShowDropdown(false)} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER METADATA CONTROLS */}
      <footer className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-12 border-t border-white/10 pt-6 text-center shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-white/50">
          <p>© 2026 Aeris Geospatial Weather Suite. Designed for high fidelity meteorological immersion.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 min-w-[120px] justify-center bg-white/5 border border-white/10 rounded px-2.5 py-1 text-[9px] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Atmos Sync</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
