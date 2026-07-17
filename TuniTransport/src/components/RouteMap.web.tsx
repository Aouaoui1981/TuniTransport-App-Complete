// @ts-nocheck
// ──────────────────────────────────────────────────────────────────────────
// THL — Carte interactive (web) : itinéraire France → Tunisie via Leaflet.
// Rendue dans une iframe autonome (Leaflet + tuiles CARTO sombres) pour rester
// interactive (zoom / déplacement) sans dépendance native.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';

const ROUTE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; background: #0A1420; }
  .leaflet-container { background: #0A1420; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  .leaflet-popup-content { margin: 8px 12px; font-weight: 600; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true, scrollWheelZoom: true, attributionControl: true });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19, subdomains: 'abcd'
  }).addTo(map);

  var paris = [48.8566, 2.3522];
  var marseille = [43.2965, 5.3698];
  var tunis = [36.8065, 10.1815];

  // Trajet terrestre (teal) : Paris -> Marseille
  L.polyline([paris, marseille], { color: '#2DD4BF', weight: 4, opacity: 0.95 }).addTo(map);
  // Traversée en ferry (orange, pointillés) : Marseille -> Tunis
  L.polyline([marseille, tunis], { color: '#F5B342', weight: 4, opacity: 0.95, dashArray: '7,10' }).addTo(map);

  function pin(coord, label, color) {
    L.circleMarker(coord, {
      radius: 8, color: '#FFFFFF', weight: 2, fillColor: color, fillOpacity: 1
    }).addTo(map).bindPopup(label);
  }
  pin(paris, 'Paris — France', '#2DD4BF');
  pin(marseille, 'Marseille — port de départ', '#2DD4BF');
  pin(tunis, 'Tunis — Tunisie', '#F5B342');

  map.fitBounds([paris, tunis], { padding: [45, 45] });
</script>
</body>
</html>`;

export default function RouteMap() {
  return React.createElement('iframe', {
    title: 'Itinéraire France → Tunisie',
    srcDoc: ROUTE_HTML,
    loading: 'lazy',
    style: { border: 0, width: '100%', height: '100%', display: 'block' },
  });
}
