import styles from "./ActivityMap.module.css";

export default function ActivityMap({
  mapObj,
  color = "#FF6B35",
}: {
  mapObj?: any;
  color?: string;
}) {
  if (!mapObj || !mapObj.summary_polyline) {
    return null;
  }

  const polylineJson = JSON.stringify(mapObj.summary_polyline);

  const htmlSnippet = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #1a1a24; }
        .leaflet-container { background: #1a1a24 !important; }
        .leaflet-control-attribution { 
          background: rgba(0,0,0,0.5) !important; 
          color: #888 !important;
          font-size: 8px !important;
        }
      </style>
    </head>
    <body style="margin: 0;">
      <div id="map"></div>
      <script>
        function decode(encoded) {
          if (!encoded) return [];
          let points = [];
          let index = 0, len = encoded.length;
          let lat = 0, lng = 0;
          while (index < len) {
            let b, shift = 0, result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            shift = 0; result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            points.push([lat / 1e5, lng / 1e5]);
          }
          return points;
        }

        const map = L.map('map', { 
          zoomControl: false, 
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true
        });

        // Use a more reliable provider if CartoDB fails
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
           maxZoom: 19,
           opacity: 0.7
        }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);
        
        try {
          const rawPolyline = ${polylineJson};
          const coords = decode(rawPolyline);
          
          if (coords.length > 0) {
            const line = L.polyline(coords, { 
              color: '${color}', 
              weight: 5, 
              opacity: 1,
              lineJoin: 'round'
            }).addTo(map);
            
            // Aggressive re-layout to ensure iframe renders
            setTimeout(() => {
              map.invalidateSize();
              const bounds = line.getBounds();
              if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [20, 20] });
              }
            }, 250);
          } else {
            map.setView([0,0], 2);
          }
        } catch (e) {
          console.error("Map render error:", e);
        }
      </script>
    </body>
    </html>
  `;

  return (
    <div className={styles.mapContainer}>
      <iframe
        srcDoc={htmlSnippet}
        title="Activity Map"
        loading="lazy"
        className={styles.mapSvg}
        style={{ border: "none" }}
      />
    </div>
  );
}
