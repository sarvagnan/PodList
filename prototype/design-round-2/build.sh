#!/bin/sh
# Bundles src/ into one self-contained page: index.html (PROTOTYPE, throwaway).
set -e
cd "$(dirname "$0")"
{
  cat src/head.html
  echo '<script>'
  cat src/core.js src/area-views.js src/area-playlists.js src/area-library.js
  echo '</script>'
  cat src/tail.html
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
