#!/usr/bin/env bash
# Downloads NASA Blue Marble earth textures into public/textures/
# Run once: bash scripts/download-textures.sh
set -e

DEST="public/textures"
mkdir -p "$DEST"

echo "Downloading Earth textures..."

# 2K day texture (NASA Blue Marble)
curl -L -o "$DEST/earth-day.jpg" \
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74167/world.200408.3x5400x2700.jpg" \
  --progress-bar

# 2K night lights (NASA Black Marble)
curl -L -o "$DEST/earth-night.jpg" \
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg" \
  --progress-bar

# Cloud layer
curl -L -o "$DEST/earth-clouds.jpg" \
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg" \
  --progress-bar

# Normal map (reuse a free one from three.js examples)
curl -L -o "$DEST/earth-normal.jpg" \
  "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg" \
  --progress-bar

echo "Done! Textures saved to $DEST/"
