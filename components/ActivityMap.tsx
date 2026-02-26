import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";

interface ActivityMapProps {
  polyline: string;
  color: string;
}

export default function ActivityMap({ polyline, color }: ActivityMapProps) {
  if (!polyline) return null;

  const htmlSnippet = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-16">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #0a0a0f; }
        .leaflet-container { background: #0a0a0f !important; }
        .leaflet-control-attribution { 
          background: rgba(0,0,0,0.5) !important; 
          color: #666 !important;
          font-size: 8px !important;
        }
        .leaflet-control-attribution a { color: #888 !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        function decode(encoded) {
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
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: true
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OSM &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
        
        // Escape backslashes for JS string
        const encodedPolyline = "${polyline.replace(/\\/g, "\\\\")}";
        const coords = decode(encodedPolyline);
        const line = L.polyline(coords, { 
          color: '${color}', 
          weight: 4, 
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(map);
        
        if (coords.length > 0) {
          map.fitBounds(line.getBounds(), { padding: [10, 10] });
        }
      </script>
    </body>
    </html>
  `;

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <iframe
          srcDoc={htmlSnippet}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#0a0a0f",
          }}
          title="Activity Map"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlSnippet }}
        style={styles.webview}
        scrollEnabled={false}
        backgroundColor="#0a0a0f"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: "100%",
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    backgroundColor: Colors.bgCard,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  webview: {
    backgroundColor: "#0a0a0f",
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: "center",
  },
});
