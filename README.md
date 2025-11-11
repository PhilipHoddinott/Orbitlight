# Orbit's Light

A real-time satellite skyplot visualization using SGP4 orbital propagation.

## View the Site

Visit **[Orbit's Light](https://philiphoddinott.github.io/Orbitlight/)** to see satellites passing overhead from your location.

## About

Orbit's Light displays satellites visible from your location in real-time using:
- **SGP4 Propagation** ([satellite.js](https://github.com/shashwatak/satellite-js)) for accurate orbital mechanics
- **Polar Sky Plot** with elevation rings and cardinal directions
- **Real-time Filtering** by elevation, altitude, distance, and name
- **Color Visualization** by altitude, speed, distance, or satellite name
- **Light Pollution Context** showing nearest major cities from your observer location
- **Local Timezone Display** and TLE update age indicator

## Features

- **Elevation Cutoff**: Hide satellites below a minimum angle (default 15°)
- **Altitude Filters**: Set max orbital altitude to focus on specific satellite classes
- **Sort Options**: By name, altitude, distance (closest first), or angular speed (fastest first)
- **Colorize Mode**: Visualize metrics across the sky plot and satellite list
- **Night Mode**: Red overlay for dark-adaptation preservation while observing
- **Responsive Design**: Works on desktop and mobile devices with device-pixel-ratio aware rendering
- **Geolocation**: Automatic location detection (or fallback to Boston, MA)

## Project Structure

```
index.html          # Main HTML entry point
css/
  styles.css        # Extracted stylesheet
js/
  app.js            # Main application logic
data/
  tle_latest.txt    # TLE (Two-Line Element) orbital data
```

## Development

The app uses vanilla JavaScript with no build step required. Just open `index.html` in a modern web browser.

### Local Testing

For local development with a static file server (to avoid CORS issues):

**PowerShell:**
```powershell
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Technical Details

- **SGP4 Orbital Mechanics**: Predictions accurate for ~1 week from TLE date
- **Vector-Based Speed**: Angular speed computed from observer→satellite vectors using dot product
- **Haversine Distance**: Nearest city calculations use great-circle distance
- **Canvas Rendering**: DPR-aware 2D canvas for crisp rendering on high-density displays
- **Real-time Updates**: 60 FPS animation loop with requestAnimationFrame

## Data Source

TLE data from [CelesTrak](https://celestrak.org/) via periodic updates.

## Author

Built by Philip Hoddinott — written while sitting next to my beautiful (sleeping) wife. ❤️
