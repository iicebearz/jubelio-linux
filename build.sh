#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

out="dist/Jubelio Chat-linux-x64"
version="$(node -p "require('./package.json').version")"

rm -rf "$out"
mkdir -p "$out"
cp -a node_modules/electron/dist/. "$out"/
rm -f "$out/resources/default_app.asar"
mkdir -p "$out/resources/app/build"
cp main.js "$out/resources/app/"
cp build/icon.png "$out/resources/app/build/"
printf '{"name":"jubelio-chat","productName":"Jubelio Chat","version":"%s","main":"main.js"}\n' "$version" \
  > "$out/resources/app/package.json"
mv "$out/electron" "$out/Jubelio Chat"
chmod +x "$out/Jubelio Chat"

cat > "dist/jubelio-chat.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Jubelio Chat
Comment=Jubelio Chat desktop client
Exec="$PWD/$out/Jubelio Chat" %U
Icon=$PWD/build/icon.png
Terminal=false
Categories=Network;InstantMessaging;
StartupWMClass=jubelio-chat
EOF

sandbox="$out/chrome-sandbox"
userns_ok=1
[ "$(cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null || echo 1)" = "1" ] || userns_ok=0
[ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null || echo 0)" = "0" ] || userns_ok=0
if [ "$userns_ok" = "0" ] && [ "$(stat -c '%u' "$sandbox")" != "0" ]; then
  echo "Warning: user namespaces are restricted and chrome-sandbox is not root-owned."
  echo "  sudo chown root:root \"$sandbox\" && sudo chmod 4755 \"$sandbox\""
fi

echo "Built: $out/Jubelio Chat"
