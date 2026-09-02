// Resilient Multi-Source Weather Service with Local Caching & Fallback

const CACHE_PREFIX = 'sartorial_weather_cache_v2_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const CITY_COORDINATES = {
  'Budapest': { lat: 47.4979, lon: 19.0402 },
  'Debrecen': { lat: 47.5316, lon: 21.6273 },
  'Szeged': { lat: 46.2530, lon: 20.1414 },
  'Győr': { lat: 47.6875, lon: 17.6504 },
  'Pécs': { lat: 46.0727, lon: 18.2323 },
  'Bécs': { lat: 48.2082, lon: 16.3738 },
  'Milánó': { lat: 45.4642, lon: 9.1900 },
  'Róma': { lat: 41.9028, lon: 12.4964 },
  'Párizs': { lat: 48.8566, lon: 2.3522 },
  'London': { lat: 51.5074, lon: -0.1278 }
};

export const CITIES = Object.keys(CITY_COORDINATES);

/**
 * Gets cached weather if still fresh (under 30 mins)
 */
function getCachedWeather(cityName, allowStale = false) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${cityName}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !cached.timestamp || !cached.data) return null;

    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL_MS || allowStale) {
      return cached.data;
    }
  } catch (e) {
    // Ignore localStorage parse errors
  }
  return null;
}

/**
 * Saves weather to local storage with timestamp
 */
function setCachedWeather(cityName, data) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${cityName}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    // Ignore quota errors
  }
}

/**
 * Fetches current weather with 3-tier resilience:
 * 1. Fresh LocalStorage cache (< 30 min)
 * 2. Open-Meteo API
 * 3. wttr.in Backup API
 * 4. Stale cache or intelligent seasonal fallback
 */
export async function fetchCurrentWeather(cityName = 'Budapest', forceRefresh = false) {
  // 1. Check fresh cache
  if (!forceRefresh) {
    const fresh = getCachedWeather(cityName, false);
    if (fresh) return fresh;
  }

  const coords = CITY_COORDINATES[cityName] || CITY_COORDINATES['Budapest'];

  // 2. Try Open-Meteo with 4s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.current) {
        const current = data.current;
        const weatherInfo = interpretWeatherCode(current.weather_code);
        const result = {
          city: cityName,
          temperature: Math.round(current.temperature_2m),
          apparentTemperature: Math.round(current.apparent_temperature ?? current.temperature_2m),
          precipitation: current.precipitation ?? 0,
          windSpeed: Math.round(current.wind_speed_10m ?? 8),
          condition: weatherInfo.condition,
          icon: weatherInfo.icon,
          isRainy: (current.precipitation > 0) || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(current.weather_code),
          isCold: current.temperature_2m < 12,
          isWarm: current.temperature_2m >= 22,
          recommendation: getClothingWeatherAdvice(current.temperature_2m, current.precipitation ?? 0)
        };
        setCachedWeather(cityName, result);
        return result;
      }
    }
  } catch (err) {
    // Continue to backup source
  }

  // 3. Try Backup API (wttr.in JSON) with 3.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const wttrUrl = `https://wttr.in/${encodeURIComponent(cityName)}?format=j1`;
    const response = await fetch(wttrUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const current = data.current_condition?.[0];
      if (current) {
        const temp = parseInt(current.temp_C, 10) || 20;
        const feelsLike = parseInt(current.FeelsLikeC, 10) || temp;
        const precip = parseFloat(current.precipMM) || 0;
        const wind = parseInt(current.windspeedKmph, 10) || 10;
        const desc = current.lang_hu?.[0]?.value || current.weatherDesc?.[0]?.value || 'Változékony idő';
        const weatherCode = parseInt(current.weatherCode, 10) || 116;

        const weatherInfo = interpretWeatherCode(mapWttrCodeToMeteo(weatherCode, desc));
        const result = {
          city: cityName,
          temperature: temp,
          apparentTemperature: feelsLike,
          precipitation: precip,
          windSpeed: wind,
          condition: weatherInfo.condition || desc,
          icon: weatherInfo.icon,
          isRainy: precip > 0 || desc.toLowerCase().includes('rain') || desc.toLowerCase().includes('eső'),
          isCold: temp < 12,
          isWarm: temp >= 22,
          recommendation: getClothingWeatherAdvice(temp, precip)
        };
        setCachedWeather(cityName, result);
        return result;
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // 4. Try stale cache
  const stale = getCachedWeather(cityName, true);
  if (stale) return stale;

  // 5. Intelligent seasonal fallback
  return getSeasonalFallback(cityName);
}

function mapWttrCodeToMeteo(wttrCode, desc) {
  const d = (desc || '').toLowerCase();
  if (d.includes('clear') || d.includes('sunny') || d.includes('napos')) return 0;
  if (d.includes('cloud') || d.includes('felhő')) return 2;
  if (d.includes('rain') || d.includes('shower') || d.includes('eső')) return 61;
  if (d.includes('snow') || d.includes('hó')) return 71;
  if (d.includes('thunder') || d.includes('vihar') || d.includes('zivatar')) return 95;
  if (d.includes('fog') || d.includes('köd')) return 45;
  return 1;
}

function interpretWeatherCode(code) {
  if (code === 0) return { condition: 'Tiszta, derült égbolt', icon: '☀️' };
  if ([1, 2, 3].includes(code)) return { condition: 'Enyhén felhős', icon: '⛅' };
  if ([45, 48].includes(code)) return { condition: 'Ködös idő', icon: '🌫️' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { condition: 'Esős időjárás', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Hószállingózás / Hó', icon: '❄️' };
  if ([95, 96, 99].includes(code)) return { condition: 'Zivatar', icon: '⛈️' };
  return { condition: 'Változékony idő', icon: '🌤️' };
}

function getClothingWeatherAdvice(temp, precip) {
  if (temp >= 26) {
    return 'Meleg nyári idő: válassz szellős len- vagy könnyű pamutdarabokat, világos színeket!';
  } else if (temp >= 18) {
    return 'Tökéletes smart-casual időjárás: könnyed ing, len/pamut nadrág és egy strukturálatlan zakó.';
  } else if (temp >= 10) {
    return 'Hűvös idő: rétegezz! Kasmír pulóver az ing fölé, vagy egy minőségi gyapjú zakó kötelező.';
  } else {
    return 'Hideg idő: vedd elő a szövetkabátot, sálat, flanel nadrágot és kényelmes bőrcipőt!';
  }
}

function getSeasonalFallback(cityName) {
  const month = new Date().getMonth(); // 0 = Jan, 8 = Sep
  // Monthly average temps in Central Europe
  const monthlyAvg = [2, 4, 9, 14, 19, 23, 26, 25, 20, 14, 8, 3];
  const temp = monthlyAvg[month] ?? 20;

  return {
    city: cityName,
    temperature: temp,
    apparentTemperature: temp,
    precipitation: 0,
    windSpeed: 10,
    condition: temp >= 20 ? 'Kellemes időjárás' : (temp >= 10 ? 'Mérsékelten hűvös idő' : 'Hideg téli idő'),
    icon: temp >= 20 ? '☀️' : (temp >= 10 ? '⛅' : '🧥'),
    isRainy: false,
    isCold: temp < 12,
    isWarm: temp >= 22,
    recommendation: getClothingWeatherAdvice(temp, 0)
  };
}
