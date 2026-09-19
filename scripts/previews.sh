#!/bin/sh
# Maintainer script: render every example and compose the README preview
# image for each (needs ImageMagick 7). Users never need this.
set -e
cd "$(dirname "$0")/.."
for dir in examples/*/; do
  name=$(basename "$dir")
  node bin/brandshot.mjs --config "$dir/brand.json" --out "$dir/out" > /dev/null
  o="$dir/out"
  # Left: the Instagram post. Right: X header over the OG image, with the profile picture.
  magick "$o/x-header.png" -resize 1000x "$o/og-image.png" -resize 1000x -background none -splice 0x24 -append -gravity north -chop 0x24 /tmp/brandshot-right.png
  magick "$o/instagram-post.png" -resize x$(magick identify -format '%h' /tmp/brandshot-right.png) /tmp/brandshot-left.png
  magick /tmp/brandshot-left.png /tmp/brandshot-right.png -background none -splice 24x0 +append -gravity west -chop 24x0 "$dir/preview.png"
  echo "wrote $dir/preview.png"
done
