import React from "react";
import { View, StyleSheet, Platform, Text } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";

interface ActivityMapProps {
  polyline: string;
  color: string;
}

export default function ActivityMap({ polyline, color }: ActivityMapProps) {
  if (!polyline) return null;

  if (Platform.OS === "web") {
    const htmlSnippet = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-16">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #0a0a0f; }
          .leaflet-container { background: #0a0a0f !important; }
          .leaflet-control-attribution { 
            background: rgba(0,0,0,0.5) !important; 
            color: #666 !important;
            font-size: 10px !important;
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
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
          }).addTo(map);
          
          const coords = decode("${polyline.replace(/\\/g, "\\\\")}");
          const line = L.polyline(coords, { 
            color: '${color}', 
            weight: 3, 
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map);
          
          if (coords.length > 0) {
            map.fitBounds(line.getBounds(), { padding: [20, 20] });
          }
        </script>
      </body>
      </html>
    `;

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

  // Native fallback (simplified placeholder)
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Mapa disponible en la versión web
        </Text>
      </View>
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
