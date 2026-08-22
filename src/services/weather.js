// Open-Meteo Weather Service (Free, No API Key Required)

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

export async function fetchCurrentWeather(cityName = 'Budapest') {
  try {
    const coords = CITY_COORDINATES[cityName] || CITY_COORDINATES['Budapest'];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Időjárás adatlekérés sikertelen');
    
    const data = await response.json();
    const current = data.current;
    
    const weatherInfo = interpretWeatherCode(current.weather_code);
    
    return {
      city: cityName,
      temperature: Math.round(current.temperature_2m),
      apparentTemperature: Math.round(current.apparent_temperature),
      precipitation: current.precipitation,
      windSpeed: Math.round(current.wind_speed_10m),
      condition: weatherInfo.condition,
      icon: weatherInfo.icon,
      isRainy: current.precipitation > 0 || [51,53,55,61,63,65,80,81,82].includes(current.weather_code),
      isCold: current.temperature_2m < 12,
      isWarm: current.temperature_2m >= 22,
      recommendation: getClothingWeatherAdvice(current.temperature_2m, current.precipitation)
    };
  } catch (error) {
    console.warn('Időjárás hiba (offline fallback használata):', error);
    return {
      city: cityName,
      temperature: 21,
      apparentTemperature: 21,
      precipitation: 0,
      windSpeed: 8,
      condition: 'Kellemes, napos idő',
      icon: '☀️',
      isRainy: false,
      isCold: false,
      isWarm: false,
      recommendation: 'Kellemes hőmérséklet: ideális egy vékony zakóhoz, inghez és chino nadrághoz.'
    };
  }
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
