import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AnimationProps {
  weatherCode: number;
  isDay: boolean;
  windSpeed: number; // km/h
  temperature: number; // °C
}

// 1. SUNNY / CLEAR DAY ANIMATION
export const SunAnimation: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Sky Warm Diffused Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse" />
      
      {/* Sun Body & Rays Group */}
      <div className="absolute top-16 right-16 flex items-center justify-center">
        {/* Outer Radiant Rings */}
        <motion.div
          className="absolute w-32 h-32 rounded-full border border-amber-300/30 bg-amber-200/5"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-44 h-44 rounded-full border border-amber-400/10 bg-amber-200/2"
          animate={{ scale: [1.1, 1.3, 1.1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Rotating Sun Core & Rays */}
        <motion.div
          className="relative w-20 h-20 bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-300 rounded-full shadow-[0_0_50px_rgba(245,158,11,0.5)] flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          {/* Decorative Sun Ray notches */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-6 bg-gradient-to-t from-transparent to-amber-300 rounded-full"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-28px)`,
              }}
            />
          ))}
        </motion.div>
        
        {/* Floating Lens Flare effect */}
        <motion.div
          className="absolute w-4 h-4 rounded-full bg-white/40 blur-[2px]"
          animate={{
            x: [-60, 60, -60],
            y: [40, -40, 40],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

// 2. RAIN / DRIZZLE ANIMATION
// Realistic water beads/condensation sitting or slowly sliding on the lens "screen"
export const ScreenDroplets: React.FC = () => {
  const dropletCount = 28;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {[...Array(dropletCount)].map((_, i) => {
        // Deterministic positioning based on index to avoid hydration discrepancies
        const xPos = ((i * 17) % 95) + 2.5; // 2.5% to 97.5%
        const yPos = ((i * 23) % 90) + 5;   // 5% to 95%
        const size = 3 + (i % 5); // 3px to 7px
        const isDripping = i % 7 === 0;

        if (isDripping) {
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/20 backdrop-blur-[0.5px] border border-white/30 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.5),0_1.5px_2px_rgba(0,0,0,0.15)]"
              style={{
                left: `${xPos}%`,
                top: `${yPos}%`,
                width: `${size}px`,
                height: `${size * 1.6}px`,
              }}
              animate={{
                y: [0, 80, 0],
                opacity: [0.75, 0.9, 0.2, 0.75],
              }}
              transition={{
                duration: 10 + (i % 3) * 4,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 1.5,
              }}
            />
          );
        }

        return (
          <div
            key={i}
            className="absolute rounded-full bg-white/15 backdrop-blur-[0.2px] border border-white/30 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.5),0_1px_1.5px_rgba(0,0,0,0.15)]"
            style={{
              left: `${xPos}%`,
              top: `${yPos}%`,
              width: `${size}px`,
              height: `${size}px`,
              transform: `scale(${1 + (i % 3) * 0.1})`,
            }}
          />
        );
      })}
    </div>
  );
};

// Procedural SVG Lightning strike bolt component
export const LightningStrike: React.FC<{ active: boolean }> = ({ active }) => {
  const [strikePath, setStrikePath] = useState("");
  const [strikeX, setStrikeX] = useState(50);

  useEffect(() => {
    if (!active) return;

    // Generate a jagged lightning path from top down
    const startX = 20 + Math.random() * 60; // 20% to 80%
    setStrikeX(startX);
    
    let path = `M ${startX} 0`;
    let curX = startX;
    const segmentCount = 6 + Math.floor(Math.random() * 5);
    const segmentHeight = 100 / segmentCount;

    for (let i = 1; i <= segmentCount; i++) {
      const targetY = i * segmentHeight;
      const deviation = (Math.random() - 0.5) * 16;
      curX = Math.max(5, Math.min(95, curX + deviation));
      path += ` L ${curX} ${targetY}`;

      // Branches
      if (Math.random() > 0.65 && i < segmentCount - 1) {
        const branchX = curX + (Math.random() - 0.5) * 12;
        const branchY = targetY + segmentHeight * 0.5;
        path += ` M ${curX} ${targetY} L ${branchX} ${branchY} M ${curX} ${targetY}`;
      }
    }
    setStrikePath(path);
  }, [active]);

  if (!active || !strikePath) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Glow */}
        <motion.path
          d={strikePath}
          fill="none"
          stroke="#cffafe"
          strokeWidth="4"
          filter="blur(5px)"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: [0.9, 0.1, 1, 0] }}
          transition={{ duration: 0.35, ease: "linear" }}
        />
        {/* Highlight Core */}
        <motion.path
          d={strikePath}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0, 1, 0] }}
          transition={{ duration: 0.35, ease: "linear" }}
        />
      </svg>
      {/* Light flash spot glow */}
      <div
        className="absolute top-0 w-96 h-96 bg-cyan-200/20 rounded-full blur-[100px]"
        style={{ left: `calc(${strikeX}% - 192px)` }}
      />
    </div>
  );
};

export const RainAnimation: React.FC<{ isThunder?: boolean }> = ({ isThunder = false }) => {
  const [lightning, setLightning] = useState(false);

  // Trigger lightning flashes if it is a thunderstorm
  useEffect(() => {
    if (!isThunder) return;
    const interval = setInterval(() => {
      setLightning(true);
      setTimeout(() => setLightning(false), 140);
      
      // Secondary shock/double-strike flash sequence
      if (Math.random() > 0.55) {
        setTimeout(() => {
          setLightning(true);
          setTimeout(() => setLightning(false), 70);
        }, 220);
      }
    }, Math.floor(Math.random() * 6000) + 3500); // Every 3.5s to 9.5s

    return () => clearInterval(interval);
  }, [isThunder]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-200 ${lightning ? "bg-white/25" : "bg-transparent"}`}>
      {/* Sky Ambient Tint overlay */}
      <div className="absolute inset-0 bg-blue-950/15" />
      
      {/* Clouds Layer Top */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-900/50 via-slate-800/25 to-transparent" />

      {/* Lightning strikes (SVGs) */}
      {isThunder && <LightningStrike active={lightning} />}

      {/* Standard falling raindrops */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => {
          const leftVal = `${Math.random() * 100}%`;
          const duration = Math.random() * 0.7 + 0.5; // faster, 0.5s to 1.2s
          const delay = Math.random() * 2;
          const sizeHeight = Math.random() * 20 + 20; // droplets elongated
          const opacity = Math.random() * 0.4 + 0.3;

          return (
            <motion.div
              key={i}
              className="absolute w-[1px] bg-gradient-to-b from-blue-200/60 via-sky-300/40 to-transparent"
              style={{
                left: leftVal,
                height: `${sizeHeight}px`,
                top: `-40px`,
                transform: "rotate(10deg)",
                opacity: opacity,
              }}
              animate={{
                y: ["0vh", "110vh"],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "linear",
                delay: delay,
              }}
            />
          );
        })}
      </div>

      {/* Drops "condensation" sitting static on the lens screen */}
      <ScreenDroplets />

      {/* Ripple/puddle splash drops at the base */}
      <div className="absolute bottom-4 inset-x-0 h-10 flex justify-around opacity-30">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="w-4 h-1 border border-sky-300/30 rounded-full"
            animate={{
              scale: [0.5, 2.2, 0.5],
              opacity: [0, 0.75, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 3. WINDY ANIMATION
export const WindAnimation: React.FC<{ speedClass?: "light" | "strong" }> = ({ speedClass = "light" }) => {
  const lineCount = speedClass === "strong" ? 8 : 4;
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Moving Airflow Curved Trails */}
      {[...Array(lineCount)].map((_, i) => {
        const topVal = `${15 + (i * 80) / lineCount}%`;
        const duration = speedClass === "strong" ? Math.random() * 2 + 1.5 : Math.random() * 3 + 3; // faster if strong
        const delay = Math.random() * 3;
        
        return (
          <motion.div
            key={i}
            className="absolute h-[1.5px] bg-gradient-to-r from-transparent via-slate-300/30 to-transparent rounded-full"
            style={{
              top: topVal,
              width: "180px",
              left: "-200px",
            }}
            animate={{
              x: ["0vw", "115vw"],
              y: [0, Math.sin(i) * 30, 0], // wavy flow
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: delay,
            }}
          />
        );
      })}

      {/* Floating Rustling Wind Leaves */}
      {[...Array(4)].map((_, i) => {
        const topVal = `${20 + Math.random() * 60}%`;
        const duration = speedClass === "strong" ? Math.random() * 2 + 2 : Math.random() * 4 + 4;
        const delay = Math.random() * 4;

        return (
          <motion.svg
            key={i}
            viewBox="0 0 24 24"
            className="absolute w-5 h-5 fill-emerald-500/15 text-emerald-600/20"
            style={{
              top: topVal,
              left: "-40px",
            }}
            animate={{
              x: ["0vw", "110vw"],
              y: [0, Math.sin(i) * 80, -20],
              rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              ease: "linear",
              delay: delay,
            }}
          >
            <path d="M2 22C10 22 17 17 21 11C21 11 17 11 14 11C10 11 4 15 2 22Z" />
          </motion.svg>
        );
      })}
    </div>
  );
};

// 4. COLD / BLIZZARD SNOW ANIMATION
export const ColdAnimation: React.FC<{ isBlizzard?: boolean }> = ({ isBlizzard = false }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Shivering Cyan Cold Vignette Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/5 to-sky-950/5 ring-1 ring-cyan-500/10 inset-px" />
      
      {/* Snowflakes Flurry */}
      <div className="absolute inset-0">
        {[...Array(35)].map((_, i) => {
          const leftVal = `${Math.random() * 100}%`;
          const size = Math.random() * 4 + 2; // 2px to 6px
          const duration = isBlizzard ? Math.random() * 2 + 1.5 : Math.random() * 4 + 3; // Faster and more angled if blizzard
          const delay = Math.random() * 5;
          const opacity = Math.random() * 0.5 + 0.3;

          return (
            <motion.div
              key={i}
              className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{
                left: leftVal,
                width: `${size}px`,
                height: `${size}px`,
                top: "-20px",
                opacity: opacity,
              }}
              animate={{
                y: ["0vh", "105vh"],
                x: isBlizzard ? ["0px", "-120px"] : ["-15px", "15px", "-15px"],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "linear",
                delay: delay,
              }}
            />
          );
        })}
      </div>

      {/* Frosted Shimmer elements in card corners */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-cyan-400/20 rounded-tl-xl opacity-40 animate-pulse" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-cyan-400/20 rounded-br-xl opacity-40 animate-pulse" />
    </div>
  );
};

// 5. CLOUDY / OVERCAST ANIMATION
export const CloudyAnimation: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Dynamic atmospheric ambient tint */}
      <div className="absolute inset-0 bg-blue-900/5 backdrop-blur-[0.5px]" />
      
      {/* Subtle background wind/stream lines to indicate air pressure */}
      {[...Array(3)].map((_, idx) => (
        <motion.div
          key={`stream-${idx}`}
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{
            top: `${25 + idx * 25}%`,
            width: "300px",
            left: "-320px",
          }}
          animate={{
            x: ["0vw", "135vw"],
          }}
          transition={{
            duration: 18 + idx * 6,
            repeat: Infinity,
            ease: "easeOut",
            delay: idx * 3,
          }}
        />
      ))}

      {/* Layered puffy drifting clouds */}
      {[...Array(6)].map((_, i) => {
        const topVal = `${10 + (i * 14) % 65}%`;
        const sizeWidth = 180 + (i * 90) % 240;
        const duration = 35 + i * 12;
        const opacity = 0.12 + (i % 3) * 0.04;
        const delay = i * -7; // stagger start points so clouds don't clump at start

        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-slate-100/30 filter blur-[20px] shadow-[inset_10px_-10px_30px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.1)]"
            style={{
              top: topVal,
              width: `${sizeWidth}px`,
              height: `${sizeWidth * 0.5}px`,
              left: "-350px",
              opacity: opacity,
            }}
            animate={{
              x: ["0vw", "130vw"],
              y: [0, Math.sin(i) * 15, 0], // gentle up-and-down waving float
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              ease: "linear",
              delay: delay,
            }}
          />
        );
      })}
    </div>
  );
};

// 6. NIGHTIME / STARLIT ANIMATION
export const NightAnimation: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep Obsidian night gradient tint */}
      <div className="absolute inset-0 bg-slate-950/50" />
      
      {/* Sparkling Stars */}
      {[...Array(25)].map((_, i) => {
        const leftVal = `${Math.random() * 100}%`;
        const topVal = `${Math.random() * 80}%`;
        const size = Math.random() * 2 + 1; // 1px to 3px
        const duration = Math.random() * 2 + 1.5;

        return (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)]"
            style={{
              left: leftVal,
              top: topVal,
              width: `${size}px`,
              height: `${size}px`,
            }}
            animate={{
              opacity: [0.1, 1, 0.1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        );
      })}

      {/* Elegantly Floating Crescent Moon */}
      <div className="absolute top-16 right-16 flex items-center justify-center filter drop-shadow-[0_0_15px_rgba(224,242,254,0.3)]">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 bg-transparent rounded-full shadow-[10px_10px_0_0_rgba(241,245,249,0.9)]"
        />
      </div>
    </div>
  );
};


// MASTER WEATHER AMBIENT CONTROLLER
export const WeatherAmbientEffect: React.FC<AnimationProps> = ({
  weatherCode,
  isDay,
  windSpeed,
  temperature,
}) => {
  // Categorize condition
  const isSunny = weatherCode === 0;
  const isCloudyRange = weatherCode >= 1 && weatherCode <= 48; // Cloudy, overcast, foggy
  const isRainRange = (weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82);
  const isSnowRange = (weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86);
  const isStorm = weatherCode >= 95 && weatherCode <= 99;

  // Modifiers
  const isWindy = windSpeed > 18;
  const isVeryCold = temperature <= 3;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl transition-colors duration-1000 select-none">
      <AnimatePresence mode="popLayout">
        {/* Render Base Night vs Day Theme Overlay */}
        {!isDay && <NightAnimation key="night" />}

        {/* Sunny Layer */}
        {isSunny && isDay && <SunAnimation key="sun" />}

        {/* Cloudy/Fog Layer */}
        {isCloudyRange && <CloudyAnimation key="cloudy" />}

        {/* Rainy/Rain-showers Layer */}
        {(isRainRange || isStorm) && (
          <RainAnimation key="rain" isThunder={isStorm} />
        )}

        {/* Cold/Snow Layer */}
        {(isSnowRange || isVeryCold) && (
          <ColdAnimation key="cold" isBlizzard={windSpeed > 25} />
        )}

        {/* Windy Gusts Layer Overlay */}
        {isWindy && (
          <WindAnimation
            key="wind"
            speedClass={windSpeed > 28 ? "strong" : "light"}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
