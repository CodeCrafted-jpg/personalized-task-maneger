// lib/integrations/dailyDigest.ts
// Fetches today's weather for the morning digest.
//
// ENV VARS REQUIRED:
//   OPENWEATHER_API_KEY   – free key from https://openweathermap.org/api
//   OPENWEATHER_CITY      – e.g. "Kolkata" or "Mumbai"

export interface WeatherReport {
  city:        string;
  description: string;
  tempC:       number;
  feelsLikeC:  number;
  humidity:    number;
  windKph:     number;
  icon:        string;
}

// ─── Weather emoji map ────────────────────────────────────────────────────────

const WEATHER_EMOJI: Record<string, string> = {
  '01': '☀️',
  '02': '⛅',
  '03': '☁️',
  '04': '☁️',
  '09': '🌧️',
  '10': '🌦️',
  '11': '⛈️',
  '13': '❄️',
  '50': '🌫️',
};

function weatherEmoji(iconCode: string): string {
  return WEATHER_EMOJI[iconCode.slice(0, 2)] ?? '🌡️';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchWeather(): Promise<WeatherReport | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const city   = process.env.OPENWEATHER_CITY ?? 'Kolkata';

  if (!apiKey) {
    console.warn('[dailyDigest] OPENWEATHER_API_KEY not set – skipping weather.');
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const res  = await fetch(url);

    if (!res.ok) {
      console.warn('[dailyDigest] OpenWeather fetch failed:', res.status, await res.text());
      return null;
    }

    const data = await res.json();

    return {
      city:        data.name ?? city,
      description: data.weather?.[0]?.description ?? 'unknown',
      tempC:       Math.round(data.main?.temp ?? 0),
      feelsLikeC:  Math.round(data.main?.feels_like ?? 0),
      humidity:    data.main?.humidity ?? 0,
      windKph:     Math.round((data.wind?.speed ?? 0) * 3.6),
      icon:        weatherEmoji(data.weather?.[0]?.icon ?? '01d'),
    };
  } catch (err) {
    console.error('[dailyDigest] fetchWeather error:', err);
    return null;
  }
}