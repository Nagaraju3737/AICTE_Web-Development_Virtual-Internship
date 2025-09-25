// API Key - Replace with your OpenWeatherMap API key
const API_KEY = '668eb124dcb71ee6409f94ee913e0a5d';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const UNITS = 'metric'; // Use 'imperial' for Fahrenheit

// DOM Elements
const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const cityName = document.getElementById('city-name');
const currentTemp = document.getElementById('current-temp');
const weatherDesc = document.getElementById('weather-desc');
const weatherIcon = document.getElementById('weather-icon');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const pressure = document.getElementById('pressure');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const forecastContainer = document.getElementById('forecast');
const loading = document.createElement('div');
loading.className = 'loading';
loading.innerHTML = '<div class="spinner"></div><p>Loading weather data...</p>';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Try to get weather for user's current location on page load
    getLocation();
    
    // Add event listeners
    searchBtn.addEventListener('click', () => {
        const location = locationInput.value.trim();
        if (location) {
            getWeatherByCity(location);
        }
    });
    
    locationBtn.addEventListener('click', getLocation);
    
    // Allow searching by pressing Enter
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const location = locationInput.value.trim();
            if (location) {
                getWeatherByCity(location);
            }
        }
    });
});

// Get user's current location
function getLocation() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.error('Error getting location:', error);
                showError('Unable to retrieve your location. Please enable location services or search for a city.');
                showLoading(false);
                // Default to a popular city if location access is denied
                getWeatherByCity();
            }
        );
    } else {
        showError('Geolocation is not supported by your browser. Please search for a city.');
        getWeatherByCity();
    }
}

// Get weather by city name
async function getWeatherByCity(city) {
    showLoading(true);
    try {
        // First, get coordinates for the city
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData || geoData.length === 0) {
            throw new Error('City not found');
        }
        
        const { lat, lon, name, country } = geoData[0];
        
        // Update the input field with the correct city name from the API
        locationInput.value = name;
        
        // Get weather data using coordinates
        await getWeatherByCoords(lat, lon);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError('City not found. Please try another location.');
        showLoading(false);
    }
}

// Get weather by coordinates
async function getWeatherByCoords(lat, lon) {
    try {
        // Get current weather
        const currentWeatherUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${UNITS}&appid=${API_KEY}`;
        const forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${UNITS}&appid=${API_KEY}`;
        
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Failed to fetch weather data');
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        // Update the UI with weather data
        updateCurrentWeather(currentData);
        updateForecast(forecastData);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError('Failed to fetch weather data. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Update current weather UI
function updateCurrentWeather(data) {
    const { name, sys, main, weather, wind, dt, timezone } = data;
    
    // Update city name and country
    cityName.textContent = `${name}, ${sys.country}`;
    
    // Update temperature and weather description
    currentTemp.textContent = `${Math.round(main.temp)}°C`;
    weatherDesc.textContent = weather[0].description;
    
    // Update weather icon
    updateWeatherIcon(weather[0].id, weatherIcon);
    
    // Update weather details
    humidity.textContent = `${main.humidity}%`;
    windSpeed.textContent = `${Math.round(wind.speed * 3.6)} km/h`; // Convert m/s to km/h
    pressure.textContent = `${main.pressure} hPa`;
    
    // Convert Unix timestamps to local time
    const sunriseTime = new Date((sys.sunrise + timezone - (new Date().getTimezoneOffset() * 60)) * 1000);
    const sunsetTime = new Date((sys.sunset + timezone - (new Date().getTimezoneOffset() * 60)) * 1000);
    
    sunrise.textContent = sunriseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sunset.textContent = sunsetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Hide any previous error messages
    hideError();
}

// Update forecast UI
function updateForecast(data) {
    // Clear previous forecast
    forecastContainer.innerHTML = '';
    
    // Group forecast by day
    const dailyForecast = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = days[date.getDay()];
        
        if (!dailyForecast[dayName]) {
            dailyForecast[dayName] = {
                temp: item.main.temp,
                description: item.weather[0].description,
                icon: item.weather[0].id,
                date: date
            };
        }
    });
    
    // Convert to array and get next 5 days
    const forecastArray = Object.entries(dailyForecast).slice(0, 5);
    
    // Create forecast cards
    forecastArray.forEach(([day, forecast], index) => {
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        
        const dayName = index === 0 ? 'Tomorrow' : day;
        const dateStr = forecast.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const icon = document.createElement('i');
        updateWeatherIcon(forecast.icon, icon);
        icon.className += ' forecast-icon';
        
        forecastCard.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-date">${dateStr}</div>
        `;
        
        forecastCard.appendChild(icon);
        forecastCard.innerHTML += `
            <div class="forecast-temp">${Math.round(forecast.temp)}°C</div>
            <div class="forecast-desc">${forecast.description}</div>
        `;
        
        forecastContainer.appendChild(forecastCard);
    });
}

// Update weather icon based on weather condition code
function updateWeatherIcon(weatherCode, element) {
    // Clear existing classes
    element.className = 'wi';
    
    // Weather code mapping to Weather Icons
    if (weatherCode >= 200 && weatherCode < 300) {
        element.classList.add('wi-thunderstorm');
    } else if (weatherCode >= 300 && weatherCode < 500) {
        element.classList.add('wi-sprinkle');
    } else if (weatherCode >= 500 && weatherCode < 600) {
        element.classList.add('wi-rain');
    } else if (weatherCode >= 600 && weatherCode < 700) {
        element.classList.add('wi-snow');
    } else if (weatherCode >= 700 && weatherCode < 800) {
        element.classList.add('wi-fog');
    } else if (weatherCode === 800) {
        element.classList.add('wi-day-sunny');
    } else if (weatherCode === 801) {
        element.classList.add('wi-day-cloudy');
    } else if (weatherCode > 801 && weatherCode < 805) {
        element.classList.add('wi-cloudy');
    } else {
        element.classList.add('wi-day-sunny');
    }
}

// Show loading spinner
function showLoading(show) {
    const container = document.querySelector('.container');
    const existingLoading = document.querySelector('.loading');
    
    if (show) {
        if (!existingLoading) {
            container.insertBefore(loading, container.firstChild);
        }
    } else if (existingLoading) {
        container.removeChild(existingLoading);
    }
}

// Show error message
function showError(message) {
    let errorDiv = document.querySelector('.error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(hideError, 5000);
}

// Hide error message
function hideError() {
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}