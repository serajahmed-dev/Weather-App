import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Shirt, Compass, Calendar, MessageSquare, Send, RotateCw, CheckCircle, AlertCircle } from "lucide-react";
import { AIInsights, WeatherDetailsResponse } from "../types";

interface AIPredictionsProps {
  insights: AIInsights | null;
  locationName: string;
  weatherData: WeatherDetailsResponse | null;
  isLoading: boolean;
  onRefreshInsights: () => void;
}

export const AIPredictions: React.FC<AIPredictionsProps> = ({
  insights,
  locationName,
  weatherData,
  isLoading,
  onRefreshInsights,
}) => {
  const [userQuestion, setUserQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [history, setHistory] = useState<Array<{
    id: string;
    question: string;
    answer: string | null;
    error: string | null;
    isPending: boolean;
  }>>([]);

  // Clear chat if the data or location changes
  useEffect(() => {
    setHistory([]);
    setUserQuestion("");
  }, [locationName, weatherData]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const questionText = userQuestion.trim();
    if (!questionText || !weatherData) return;

    // Clear input immediately so it is pristine for the next entry
    setUserQuestion("");
    setIsAsking(true);

    const questionId = Math.random().toString(36).substring(2, 9);
    
    // Add to top of the history list (reverse-chronological to prevent scroll hunt)
    setHistory((prev) => [
      {
        id: questionId,
        question: questionText,
        answer: null,
        error: null,
        isPending: true,
      },
      ...prev,
    ]);

    try {
      const response = await fetch("/api/weather/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current: weatherData.current,
          daily: weatherData.daily,
          locationName,
          customQuestion: questionText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to consult the AI weather guru.");
      }

      const data = await response.json();
      const resolvedAnswer = data.answer || data.advice || "Dress warmly and stay comfortable!";

      setHistory((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? { ...item, answer: resolvedAnswer, isPending: false }
            : item
        )
      );
    } catch (err: any) {
      const errMsg = err.message || "Could not retrieve answer. Check configuration.";
      setHistory((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? { ...item, error: errMsg, isPending: false }
            : item
        )
      );
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div id="ai-predictions-card" className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10 text-cyan-300">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-lg text-white">AI Atmospheric Advisor</h3>
            <p className="font-mono text-[10px] text-white/50">Powered by Gemini 3.5 Flash</p>
          </div>
        </div>

        {insights && (
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
              ✨ {insights.vibe}
            </span>
            <button
              onClick={onRefreshInsights}
              disabled={isLoading}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 hover:text-white transition-all border border-white/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              title="Refresh AI Forecast"
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {/* Main Insights Boxes */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="py-12 flex flex-col items-center justify-center text-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute h-12 w-12 rounded-full border-2 border-white/10 animate-ping" />
              <div className="h-10 w-10 rounded-full border-t-2 border-r-2 border-white/40 animate-spin" />
            </div>
            <div>
              <p className="font-sans font-medium text-white/90">Consulting cloud nodes...</p>
              <p className="font-mono text-xs text-white/50 mt-1">Analyzing moisture indices & wind friction</p>
            </div>
          </motion.div>
        ) : insights ? (
          <motion.div
            key="insights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {/* Atmosphere Summary */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-white/80 font-medium text-sm">
                <Compass className="h-4 w-4 text-emerald-300" />
                <span>Atmospheric Summary</span>
              </div>
              <p className="text-white/90 text-sm leading-relaxed bg-white/5 border border-white/5 rounded-2xl p-4">
                {insights.summary}
              </p>
            </div>

            {/* Clothing & Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-white/80 font-medium text-sm">
                  <Shirt className="h-4 w-4 text-rose-300" />
                  <span>Wardrobe Advice</span>
                </div>
                <p className="text-white/80 text-xs leading-relaxed">
                  {insights.advice}
                </p>
              </div>

              <div className="space-y-1.5 bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-white/80 font-medium text-sm">
                  <Calendar className="h-4 w-4 text-cyan-300" />
                  <span>Weather Prediction</span>
                </div>
                <p className="text-white/80 text-xs leading-relaxed">
                  {insights.prediction}
                </p>
              </div>
            </div>

            {/* Custom AI Weather Assistant Section */}
            <div className="border-t border-white/10 pt-5 mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="h-4 w-4 text-cyan-300" />
                <h4 className="text-xs font-semibold text-white/70 uppercase tracking-widest font-sans">
                  Ask the Atmospheric AI
                </h4>
              </div>

              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="e.g. Can I wash my car today? Is this weather good for runs?"
                  className="w-full text-xs text-white placeholder-white/40 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-white/20"
                  disabled={isAsking}
                />
                <button
                  type="submit"
                  disabled={isAsking || !userQuestion.trim()}
                  className="flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl px-4 text-xs font-medium transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  {isAsking ? (
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>

              {/* Interactive Q&A Display Thread */}
              {history.length > 0 && (
                <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/15">
                  <AnimatePresence initial={false}>
                    {history.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs leading-relaxed text-white/95 overflow-hidden"
                      >
                        {/* User Question Row */}
                        <div className="flex items-start gap-2 pb-2 mb-2 border-b border-white/5">
                          <span className="font-mono text-cyan-300 font-bold shrink-0 mt-0.5">Q:</span>
                          <span className="text-white/90 font-medium">{item.question}</span>
                        </div>

                        {/* AI Answer Row */}
                        <div className="flex items-start gap-2">
                          {item.isPending ? (
                            <div className="flex items-center gap-2 text-white/60 animate-pulse">
                              <RotateCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Consulting atmospheric models...</span>
                            </div>
                          ) : item.error ? (
                            <div className="flex items-center gap-1.5 text-rose-300">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{item.error}</span>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 text-white/85">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-white">AI Report:</span>{" "}
                                {item.answer}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="py-8 text-center text-white/40 max-w-sm mx-auto">
            <Compass className="h-8 w-8 mx-auto text-white/30 mb-2 animate-bounce" />
            <p className="text-xs">Select or synchronize a location to populate customized forecasting recommendations.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
