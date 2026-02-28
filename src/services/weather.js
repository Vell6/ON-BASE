const axios = require('axios');

const WEATHER_CODE_MAP = {
  0: 'Cerah',
  1: 'Sebagian cerah',
  2: 'Berawan',
  3: 'Mendung',
  45: 'Kabut',
  48: 'Kabut beku',
  51: 'Gerimis ringan',
  53: 'Gerimis sedang',
  55: 'Gerimis lebat',
  56: 'Gerimis beku ringan',
  57: 'Gerimis beku lebat',
  61: 'Hujan ringan',
  63: 'Hujan sedang',
  65: 'Hujan lebat',
  66: 'Hujan beku ringan',
  67: 'Hujan beku lebat',
  71: 'Salju ringan',
  73: 'Salju sedang',
  75: 'Salju lebat',
  77: 'Butiran salju',
  80: 'Hujan deras lokal ringan',
  81: 'Hujan deras lokal sedang',
  82: 'Hujan deras lokal sangat lebat',
  85: 'Salju lokal ringan',
  86: 'Salju lokal lebat',
  95: 'Badai petir',
  96: 'Badai petir + hujan es ringan',
  99: 'Badai petir + hujan es lebat'
};

async function geocodeLocation(locationName) {
  const url = 'https://geocoding-api.open-meteo.com/v1/search';
  const { data } = await axios.get(url, {
    params: {
      name: locationName,
      count: 1,
      language: 'id',
      format: 'json'
    },
    timeout: 10_000
  });

  if (!data?.results?.length) {
    return null;
  }

  return data.results[0];
}

async function getCurrentWeather(latitude, longitude) {
  const url = 'https://api.open-meteo.com/v1/forecast';
  const { data } = await axios.get(url, {
    params: {
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m',
      timezone: 'Asia/Jakarta'
    },
    timeout: 10_000
  });

  return data?.current ?? null;
}

function weatherCodeToText(code) {
  return WEATHER_CODE_MAP[code] || `Kode cuaca ${code}`;
}

async function getWeatherByLocation(locationName) {
  const geo = await geocodeLocation(locationName);

  if (!geo) {
    return {
      found: false,
      message: `Lokasi "${locationName}" tidak ditemukan.`
    };
  }

  const weather = await getCurrentWeather(geo.latitude, geo.longitude);

  if (!weather) {
    return {
      found: false,
      message: 'Data cuaca tidak tersedia saat ini.'
    };
  }

  return {
    found: true,
    location: {
      name: geo.name,
      admin1: geo.admin1,
      country: geo.country,
      latitude: geo.latitude,
      longitude: geo.longitude
    },
    weather: {
      time: weather.time,
      temperature: weather.temperature_2m,
      apparentTemperature: weather.apparent_temperature,
      humidity: weather.relative_humidity_2m,
      windSpeed: weather.wind_speed_10m,
      precipitation: weather.precipitation,
      rain: weather.rain,
      showers: weather.showers,
      snowfall: weather.snowfall,
      weatherCode: weather.weather_code,
      weatherText: weatherCodeToText(weather.weather_code)
    }
  };
}

module.exports = {
  getWeatherByLocation
};
