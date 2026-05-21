import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy load Gemini AI Client to avoid crashing on start if GEMINI_API_KEY is not defined
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY is not configured in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. API: Search for location coordinates by city name (using Open-Meteo Geocoding)
app.get("/api/weather/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query parameters 'query' is required." });
    }

    // Fetch up to 20 raw results to allow rich deduplication below the hood
    const searchUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=20&language=en&format=json`;
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Geocoding api failed with status ${response.status}`);
    }
    const data = await response.json();
    const rawResults = data.results || [];

    // Filter duplicates by comparing combined names and geographic proximity
    const seenKeys = new Set<string>();
    const uniqueResults: any[] = [];

    for (const resItem of rawResults) {
      const name = (resItem.name || "").trim().toLowerCase();
      const country = (resItem.country || "").trim().toLowerCase();
      const admin1 = (resItem.admin1 || "").trim().toLowerCase();

      // Label-based identifier
      const labelKey = `${name}|${admin1}|${country}`;

      // Geographic proximity check to identify overlapping coordinate markers of the exact same city region
      let isGeoDuplicate = false;
      for (const existing of uniqueResults) {
        if (
          existing.name.toLowerCase() === name &&
          existing.country.toLowerCase() === country
        ) {
          const latDiff = Math.abs(existing.latitude - resItem.latitude);
          const lonDiff = Math.abs(existing.longitude - resItem.longitude);
          // 0.2 degrees is approx 22 km. If they are located this close, it represents the same city location.
          if (latDiff < 0.2 && lonDiff < 0.2) {
            isGeoDuplicate = true;
            break;
          }
        }
      }

      if (!seenKeys.has(labelKey) && !isGeoDuplicate) {
        seenKeys.add(labelKey);
        uniqueResults.push(resItem);
      }
    }

    // Limit final high-fidelity results to 5
    res.json(uniqueResults.slice(0, 5));
  } catch (error: any) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: error.message || "Failed to search location." });
  }
});

// 2. API: Fetch detailed real-time and forecast weather
app.get("/api/weather/details", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude (lat) and Longitude (lon) are required." });
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,visibility,surface_pressure&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,wind_speed_10m_max&timezone=auto`;
    const response = await fetch(weatherUrl);
    if (!response.ok) {
      throw new Error(`Weather api failed with status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Weather data fetch error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve weather details." });
  }
});

// 3. API: Generate Gemini AI Weather Insights
interface CacheEntry {
  timestamp: number;
  data: any;
}

const aiInsightsCache = new Map<string, CacheEntry>();

// Local cardinal directory helper
function getWindDirectionCardinalLocal(deg: number | undefined) {
  if (deg === undefined) return "WSW";
  const index = Math.floor(((deg + 11.25) % 360) / 22.5);
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];
  return directions[index];
}

// Highly descriptive, responsive heuristic generator for standard stats and user Q&As when API is limited (429) or offline
function generateHeuristicInsights(current: any, daily: any, locationName: string, customQuestion?: string): any {
  const temp = current.temperature_2m;
  const feelsLike = current.apparent_temperature;
  const humidity = current.relative_humidity_2m;
  const windSpeed = current.wind_speed_10m;
  const windDir = current.wind_direction_10m;
  const weatherCode = current.weather_code;
  const precip = current.precipitation || 0;
  const visibility = current.visibility || 10000;
  const uv = (daily && daily.uv_index_max && daily.uv_index_max[0] !== undefined) ? daily.uv_index_max[0] : 3;

  if (customQuestion) {
    const q = customQuestion.toLowerCase();
    
    // Scenario 1: Running, jogging, exercise, walk etc.
    if (q.includes("run") || q.includes("jog") || q.includes("walk") || q.includes("exercise") || q.includes("sport") || q.includes("outdoor") || q.includes("outside") || q.includes("stroll")) {
      if (weatherCode >= 51 || precip > 0) {
        return {
          answer: `With active precipitation (${precip} mm, weather code ${weatherCode}) falling in ${locationName || "your area"}, outdoor running or exercising will be rather wet and slippery. I highly recommend opting for an indoor workout or gym session today instead!`
        };
      }
      if (windSpeed > 25) {
        return {
          answer: `Winds are quite active right now at ${windSpeed} km/h. If you head out for a run or jog, prepare for some strong wind resistance on your route and layer with a snug windbreaker!`
        };
      }
      if (temp < 5) {
        return {
          answer: `It is currently a chilly ${temp}°C (feeling like ${feelsLike}°C). A brisk walk or run is perfectly viable, but definitely make sure to layer with warm thermal wear, keep your extremities covered, and perform a thorough warm-up.`
        };
      }
      if (temp > 28) {
        return {
          answer: `The heat is high at ${temp}°C. If you plan to run or walk outside, try to stick to shaded paths, bring plenty of hydration, and target the cooler morning or late evening hours to stay safe.`
        };
      }
      return {
        answer: `The conditions are absolutely fantastic for a stroll, jog, or outdoor run! With a comfortable temperature of ${temp}°C, gentle air movement, and comfortable humidity, you will have a beautiful exercise climate.`
      };
    }

    // Scenario 2: Umbrella, Rain, Raincoat, Wet, Drizzle, Shower
    if (q.includes("umbrella") || q.includes("rain") || q.includes("coat") || q.includes("wet") || q.includes("shower") || q.includes("drizzle") || q.includes("raincoat")) {
      if (weatherCode >= 51 || precip > 0) {
        return {
          answer: `Yes, you will definitely want to bring an umbrella or wear a waterproof raincoat! The metrics indicate active precipitation (${precip} mm) and a very damp atmosphere in ${locationName || "the region"} right now.`
        };
      }
      return {
        answer: `No active rain is currently detected (${precip} mm) in ${locationName || "the area"}, so you should be perfectly fine without carrying an umbrella. Enjoy the dry skies!`
      };
    }

    // Scenario 3: Wear, Clothes, Shorts, Jacket, Sweater, Outfit, Dress
    if (q.includes("wear") || q.includes("cloth") || q.includes("outfit") || q.includes("jacket") || q.includes("shorts") || q.includes("sweater") || q.includes("coat") || q.includes("dress")) {
      if (temp < 10) {
        return {
          answer: `Since it is quite cold at ${temp}°C (feels like ${feelsLike}°C), warm, layered clothing is essential today. I highly recommend a heavy winter coat, cozy sweater layers, long pants, and a warm hat or gloves.`
        };
      }
      if (temp >= 10 && temp < 20) {
        return {
          answer: `With temperatures hovering around ${temp}°C, a classic transitional outfit is ideal. Wear a light jacket, denim layers, or a comfortable cardigan paired with long trousers to stay perfectly balanced.`
        };
      }
      if (temp >= 20 && temp < 27) {
        return {
          answer: `It's wonderfully pleasant and warm at ${temp}°C! Lightweight linen shirts, shorts, skirts, or a casual t-shirt are perfect options. No need for heavy jackets or sweaters today.`
        };
      }
      return {
        answer: `It's hot outside today at ${temp}°C! Opt for highly breathable, thin fabrics, lightweight shorts or sundresses, sandals, sunglasses, and a wide-brimmed sun hat.`
      };
    }

    // Scenario 4: Sun, UV, Sunscreen, Protect, Burn
    if (q.includes("sun") || q.includes("uv") || q.includes("screen") || q.includes("burn") || q.includes("tan")) {
      if (uv >= 5) {
        return {
          answer: `Yes! The UV Index peaks around a strong level of ${uv} today. Applying sunscreen (SPF 30+), wearing sunglasses, and taking standard sun precautions are highly recommended to protect your skin.`
        };
      }
      return {
        answer: `The UV index is relatively low (${uv}) today, meaning sunburn risk is minimal. Basic moisturizing or light sunscreen is completely sufficient for casual strolls.`
      };
    }

    // Scenario 5: Wind, Breeze, Windy, Storm
    if (q.includes("wind") || q.includes("breeze") || q.includes("gust") || q.includes("storm") || q.includes("hurricane")) {
      const cardinal = getWindDirectionCardinalLocal(windDir);
      if (windSpeed > 30) {
        return {
          answer: `Expect some strong, gusty winds! The wind is active at ${windSpeed} km/h blowing from the ${cardinal}. Secure any loose outdoor belongings and grab a windbreaker to stay comfortable.`
        };
      }
      return {
        answer: `The wind is blowing at a gentle ${windSpeed} km/h from the ${cardinal}, providing a refreshing breeze without any disruptive gusts.`
      };
    }

    // Scenario 6: Cold, Hot, Warm, Temperature, Feels
    if (q.includes("cold") || q.includes("hot") || q.includes("warm") || q.includes("temperature") || q.includes("feels") || q.includes("temp")) {
      return {
        answer: `The current temperature is ${temp}°C and is feeling like ${feelsLike}°C. The air is holding relative humidity levels around ${humidity}% with some winds at ${windSpeed} km/h. It feels ${temp < 12 ? 'bracingly cool' : temp > 25 ? 'decidedly warm' : 'perfectly balanced and mild'}!`
      };
    }

    // General fallback Q&A answer
    const thermalDescription = temp < 12 ? 'cool and brisk' : temp > 24 ? 'quite warm and active' : 'refreshingly mild and pleasant';
    return {
      answer: `At ${temp}°C in ${locationName || "your area"}, the current atmospheric air feels ${thermalDescription}. With relative humidity showing ${humidity}%, wind of ${windSpeed} km/h, and active conditions, standard outdoor hobbies are highly enjoyable with appropriate matching clothes!`
    };
  }

  // Fallback for standard report (no custom question requested)
  let summary = "";
  let advice = "";
  let vibe = "";
  let prediction = "";

  if (weatherCode === 0) {
    vibe = "Radiant Golden Sky Adventure";
    summary = `A stunningly clear day in ${locationName || "your area"} is underway. Temperatures sit around ${temp}°C (feeling like ${feelsLike}°C) with beautiful clean views.`;
  } else if (weatherCode >= 1 && weatherCode <= 3) {
    vibe = "Mellow Silver Cloud Drift";
    summary = `We have gorgeous high-altitude clouds drifting peacefully across ${locationName || "your area"} today. The temperature of ${temp}°C combined with a relative humidity of ${humidity}% makes for super relaxing conditions.`;
  } else if ((weatherCode >= 51 && weatherCode <= 65) || (weatherCode >= 80 && weatherCode <= 82)) {
    vibe = "Pitter-Patter Cozy Sanctuary";
    summary = `Cozy rain clouds have settled over ${locationName || "your area"}, bringing precipitation levels of ${precip} mm. The damp atmosphere at ${humidity}% makes it the perfect day to enjoy the elements from inside.`;
  } else if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
    vibe = "Whispering Frosty Winter Dream";
    summary = `Crisp winter snow crystals are forming today! Temperatures are sitting at a cool ${temp}°C, making for a truly spectacular winter landscape in ${locationName || "the region"}.`;
  } else if (weatherCode >= 95) {
    vibe = "Electric Tumultuous Sky Symphony";
    summary = `An active storm front is passing through ${locationName || "the region"}, creating a high-energy, dynamic electrical atmosphere with active wind gusts up to ${windSpeed} km/h.`;
  } else {
    vibe = "Fresh Organic Outdoor Vibe";
    summary = `We are seeing interesting atmospheric shifts in ${locationName || "the area"} with WMO condition code ${weatherCode}. Temperatures are currently resting at a fresh ${temp}°C.`;
  }

  if (precip > 0 || weatherCode >= 51) {
    advice = "Carry an umbrella or a cozy waterproof jacket if you step outside today. Perfect opportunity for browsing books, enjoying a hot cup of coffee, or starting indoor projects.";
  } else if (feelsLike < 8) {
    advice = "Make sure to wrap up in warm layered items—an insulated coat, long trousers, scarf, and maybe boots. Perfect for brisk woodland hikes followed by warm comfort food.";
  } else if (feelsLike > 25) {
    advice = "Wear light, breathable fabrics like cotton or linen. Be sure to stay hydrated, wear sun protection (SPF 30+), and find shade during peak afternoon sunshine.";
  } else {
    advice = "A standard long-sleeve, linen layer, or a casual light sweater is perfect. Weather is highly pleasant and ideal for cafe terraces, long bike rides, or neighborhood walks.";
  }

  if (weatherCode >= 51 || weatherCode >= 95) {
    prediction = "Damp atmospheric elements are expected to stabilize slowly over the coming hours, easing into a cool, calm tonight sky.";
  } else {
    prediction = "Skies are expected to remain stable, bringing beautifully calm, temperate conditions for the rest of the day and a peaceful stargazing night.";
  }

  return {
    summary,
    advice,
    prediction,
    vibe,
    isFallback: true
  };
}

app.post("/api/weather/ai-insights", async (req, res) => {
  try {
    const { current, daily, locationName, customQuestion } = req.body;
    if (!current) {
      return res.status(400).json({ error: "Current weather data is required to generate AI insights." });
    }

    const temp = current.temperature_2m;
    const feelsLike = current.apparent_temperature;
    const humidity = current.relative_humidity_2m;
    const windSpeed = current.wind_speed_10m;
    const weatherCode = current.weather_code;

    // Define cache key for redundancy check and rate-limiting prevention
    const queryHash = customQuestion ? `q_${customQuestion.toLowerCase().trim()}` : "report";
    const cacheKey = `${locationName || "current"}_t${temp}_w${weatherCode}_h${humidity}_${queryHash}`;

    // Return cached insight if less than 30 minutes old
    const cached = aiInsightsCache.get(cacheKey);
    const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`[Cache Hit] Serving cached weather insights for cacheKey: ${cacheKey}`);
      return res.json(cached.data);
    }

    // Format prompt based on incoming weather facts
    let weatherPrompt = "";
    if (customQuestion) {
      weatherPrompt = `
        You are an expert Weather Advisor and Atmospheric Vibe Analyst.
        Answer the following specific user question: "${customQuestion}" in context of this weather data.
        Contextual Weather facts for ${locationName || "Current Location"}:
        - Temperature: ${temp}°C (feels like ${feelsLike}°C)
        - Humidity: ${humidity}%
        - Wind Speed: ${windSpeed} km/h
        - Weather Code (WMO): ${weatherCode}

        Keep your response friendly, energetic, concise (2-3 sentences), and deeply grounded in these actual parameters.
        Deliver the response in valid, pure JSON without any markdown code block wrap.
        The output should be a JSON object with exactly the "answer" key:
        {
          "answer": "Your detailed practical answer here."
        }
      `;
    } else {
      weatherPrompt = `
        You are an expert Weather Advisor and Atmospheric Vibe Analyst.
        Analyze this real-time weather data for location: "${locationName || "Current Location"}".
        - Temperature: ${temp}°C (feels like ${feelsLike}°C)
        - Humidity: ${humidity}%
        - Wind Speed: ${windSpeed} km/h
        - Weather Condition Code (WMO): ${weatherCode} (WMO 0 means Clear sky, 1-3 partly cloudy, 51-65 rain or drizzle, 71-77 snow, 80-82 showers, 95+ thunderstorm)
        
        Generate an engaging, highly personable, and cozy regional-style report. Deliver the response in valid, pure JSON without any markdown code block wrap. The output should be a JSON object with exactly the following keys:
        {
          "summary": "A delightful 1-2 sentence description of the current mood, temperature feel, and physical atmosphere.",
          "advice": "Practical recommendations on what to wear (e.g., layered jacket, sunglasses, umbrella) and suggested activities tailored precisely to these exact numbers.",
          "prediction": "A playful 1-2 sentence forecast/prediction of what's to come, keeping in mind the temperature and condition.",
          "vibe": "A fun short atmospheric phrase (3-5 words) that acts as a tagline (e.g., 'Crisp Autumn Cozy Vibes', 'Sun-Kissed Golden Adventure')."
        }
      `;
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      console.warn("AI insights offline fallback due to registry check:", err.message);
      const offlineFallback = generateHeuristicInsights(current, daily, locationName, customQuestion);
      aiInsightsCache.set(cacheKey, { timestamp: Date.now(), data: offlineFallback });
      return res.json(offlineFallback);
    }

    let insights;
    try {
      const aiRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: weatherPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = aiRes.text?.trim() || "{}";
      insights = JSON.parse(text);
    } catch (apiErr: any) {
      console.warn("Gemini generation failed or quota exceeded (429/limits). Triggering high fidelity programmatic generator: ", apiErr.message || apiErr);
      // Generate highly high fidelity, precise local data response
      insights = generateHeuristicInsights(current, daily, locationName, customQuestion);
    }

    // Cache computed response
    aiInsightsCache.set(cacheKey, { timestamp: Date.now(), data: insights });
    res.json(insights);
  } catch (error: any) {
    console.error("Gemini AI Weather Insights outer container error:", error);
    // Ultimate local programmatic fallback to prevent any breakdown
    try {
      const fallbackData = generateHeuristicInsights(req.body?.current, req.body?.daily, req.body?.locationName, req.body?.customQuestion);
      res.json(fallbackData);
    } catch (nestedErr: any) {
      console.error("Critical double-fault fallback triggered:", nestedErr);
      if (req.body?.customQuestion) {
        res.json({
          answer: "The local airspace elements are currently shifting. Keep clothing layers flexible!"
        });
      } else {
        res.json({
          summary: "Atmospheric factors are fluctuating. Enjoy the elements as they emerge!",
          advice: "Keep an eye on the sky and stay comfortable. Dressing in flexible, breathable layers is recommended.",
          prediction: "The environment is transitioning. More details will solidify shortly.",
          vibe: "Dynamic Atmospheric Vibes",
          isFallback: true
        });
      }
    }
  }
});

// Serve Frontend using Vite or static dist
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Weather Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
