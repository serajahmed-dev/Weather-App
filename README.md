Weather Assistant — High-Fidelity Meteorological Web App
A full-stack, visually rich weather intelligence cockpit featuring server-side Gemini AI integrations, high-fidelity local programmatic fallbacks, interactive Q&A history, real-time geocoding deduplication, and a premium fluid modern layout.
🌟 Core Features
Multi-Model Atmospheric AI Insights & Custom Q&A Thread
Custom AI Q&A Form: Allows users to input highly specific questions (e.g., "Should I wear a jacket?" or "Is it safe to run outdoors today?").
Chronological History Thread: Submitted questions instantly clear the input bar and render in a reverse-chronological interactive thread. Each issue displays a loading state during server generation.
High-Fidelity Programmatic Fallbacks: Built-in rules dynamically answer a wide variety of questions about clothing (wear), outdoor exercise (run), rain protection (umbrella), UV protection (sunscreen), winds, and temperatures if the AI service hits quota limits.
30-Minute Cache Routing: Employs backend caching on geographical reports and identical queries to optimize response times and protect against API rate limits.
Precision Meteorological Metrics ("Details" Dashboard)
Displays granular, live physical observations sourced from open geospatial APIs:
Precipitation (in millimeters expected today).
Wind Velocity & Direction (dynamic numeric-to-cardinal WSW string conversion).
Relative Humidity (rendered as clean atmospheric percentages).
Visibility Range (in kilometers, measuring surface clarity).
Ultraviolet Peaks (maximum UV Index).
Barometric Pressure (precisely calculated and displayed in inches of mercury (inHg)).
High-Fidelity Chronological Forecast Charts
24H Forecast Grid: An interactive, hourly scrolling card layout highlighting thermal movements, moisture levels, and precipitation coefficients.
Horizontal 7-Day Extended Outlook: Replaced the long vertical list with side-by-side, responsive daily forecast grids that feature minimal/maximal temperature bars, dynamic gradient tracks, and live condition badges.
Intelligent Geocoding Deduplication
Implements proximity-based cleaning. When retrieving autocomplete regions from the search interface, queries are vetted within a 0.2° coordinate range (~22km) to filter out duplicate names representing the exact same city and deliver high-fidelity target listings.
