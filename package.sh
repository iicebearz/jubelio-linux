#!/usr/bin/env bash
# Package the built Electron app into .deb, AppImage, .pkg.tar.zst and .tar.gz.
# Output directory can be overridden with BUILD_OUT.
set -euo pipefail
cd "$(dirname "$0")"

version="$(node -p "require('./package.json').version")"
out="${BUILD_OUT:-/home/justbay/Git-repo/JUBELIO_BUILD}"
src="dist/Jubelio Chat-linux-x64"
tmp="$(mktemp -d /tmp/opencode/jubelio-package.XXXXXX)"
trap 'rm -rf "$tmp"' EXIT

[ -d "$src" ] || ./build.sh
mkdir -p "$out"

desktop() {
  local exec="$1" file="$2"
  cat > "$file" <<EOF
[Desktop Entry]
Type=Application
Name=Jubelio Chat
Comment=Jubelio Chat desktop client for Linux
Exec=$exec
Icon=jubelio-chat
Terminal=false
Categories=Network;InstantMessaging;
StartupWMClass=jubelio-chat
EOF
}

echo "==> .deb"
deb="$tmp/deb"
mkdir -p "$deb/DEBIAN" "$deb/opt/jubelio-chat" "$deb/usr/bin" \
  "$deb/usr/share/applications" "$deb/usr/share/icons/hicolor/512x512/apps"
cp -a "$src/." "$deb/opt/jubelio-chat/"
cp build/icon.png "$deb/usr/share/icons/hicolor/512x512/apps/jubelio-chat.png"
desktop 'jubelio-chat %U' "$deb/usr/share/applications/jubelio-chat.desktop"
ln -s '/opt/jubelio-chat/Jubelio Chat' "$deb/usr/bin/jubelio-chat"
cat > "$deb/DEBIAN/control" <<EOF
Package: jubelio-chat
Version: $version
Section: net
Priority: optional
Architecture: amd64
Maintainer: Jubelio <support@jubelio.com>
Description: Jubelio Chat desktop client for Linux
 Electron shell around the official Jubelio Chat web application.
EOF
debian_file="$out/jubelio-chat_${version}_amd64.deb"
rm -f "$debian_file"
dpkg-deb -b --root-owner-group "$deb" "$debian_file"

echo "==> AppImage"
appdir="$tmp/AppDir"
mkdir -p "$appdir/opt/jubelio-chat" "$appdir/usr/share/applications" \
  "$appdir/usr/share/icons/hicolor/512x512/apps"
cp -a "$src/." "$appdir/opt/jubelio-chat/"
cp build/icon.png "$appdir/usr/share/icons/hicolor/512x512/apps/jubelio-chat.png"
cp build/icon.png "$appdir/jubelio-chat.png"
desktop 'AppRun %U' "$appdir/usr/share/applications/jubelio-chat.desktop"
desktop 'AppRun %U' "$appdir/jubelio-chat.desktop"
mkdir -p "$appdir/usr/share/metainfo"
cat > "$appdir/usr/share/metainfo/jubelio-chat.appdata.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>jubelio-chat.desktop</id>
  <name>Jubelio Chat</name>
  <summary>Jubelio Chat desktop client for Linux</summary>
  <metadata_license>CC0-1.0</metadata_license>
  <project_license>GPL-3.0-only</project_license>
  <description>
    <p>Electron shell around the official Jubelio Chat web application.</p>
  </description>
  <launchable type="desktop-id">jubelio-chat.desktop</launchable>
</component>
EOF
cat > "$appdir/AppRun" <<'EOF'
#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/opt/jubelio-chat/Jubelio Chat" "$@"
EOF
chmod +x "$appdir/AppRun"

tool_cache="$HOME/.cache/jubelio-build"
tool="$tool_cache/appimagetool-x86_64.AppImage"
if [ ! -x "$tool" ]; then
  mkdir -p "$tool_cache"
  curl -fsSL -o "$tool" \
    https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
  chmod +x "$tool"
fi
appimage_file="$out/Jubelio-Chat-${version}-x86_64.AppImage"
rm -f "$appimage_file"
ARCH=x86_64 "$tool" --appimage-extract-and-run -n "$appdir" "$appimage_file"

echo "==> .pkg.tar.zst"
archroot="$tmp/arch"
mkdir -p "$archroot/opt/jubelio-chat" "$archroot/usr/bin" \
  "$archroot/usr/share/applications" "$archroot/usr/share/icons/hicolor/512x512/apps"
cp -a "$src/." "$archroot/opt/jubelio-chat/"
cp build/icon.png "$archroot/usr/share/icons/hicolor/512x512/apps/jubelio-chat.png"
desktop 'jubelio-chat %U' "$archroot/usr/share/applications/jubelio-chat.desktop"
ln -s '/opt/jubelio-chat/Jubelio Chat' "$archroot/usr/bin/jubelio-chat"
cat > "$archroot/.PKGINFO" <<EOF
pkgname = jubelio-chat
pkgver = ${version}-1
pkgdesc = Jubelio Chat desktop client for Linux
url = https://github.com/iicebearz/jubelio-linux
license = GPL-3.0-only
arch = x86_64
EOF
cat > "$archroot/.BUILDINFO" <<EOF
format = 2
pkgname = jubelio-chat
pkgver = ${version}-1
pkgarch = x86_64
pkgbuild_sha256sum = local
packager = Jubelio <support@jubelio.com>
builddate = $(date -u +%s)
builddir = /home/justbay/Git-repo/jubelio-chat-linux
EOF
arch_file="$out/jubelio-chat-${version}-1-x86_64.pkg.tar.zst"
rm -f "$arch_file"
tar --zstd -cf "$arch_file" -C "$archroot" .BUILDINFO .PKGINFO opt usr

echo "==> .tar.gz"
tarroot="$tmp/tar"
name="Jubelio-Chat-${version}-linux-x64"
mkdir -p "$tarroot/$name"
cp -a "$src/." "$tarroot/$name/"
desktop 'Jubelio\ Chat %U' "$tarroot/$name/jubelio-chat.desktop"
tar_file="$out/${name}.tar.gz"
rm -f "$tar_file"
tar -czf "$tar_file" -C "$tarroot" "$name"

echo "==> Done:"
ls -lh "$out"/jubelio-chat_"${version}"_amd64.deb \
  "$out"/Jubelio-Chat-"${version}"-x86_64.AppImage \
  "$out"/jubelio-chat-"${version}"-1-x86_64.pkg.tar.zst \
  "$tar_file"
