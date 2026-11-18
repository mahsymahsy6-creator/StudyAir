import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = "/Users/mahsyaris/StudyFly";

/**
 * Generates the minimalist StudyAir Brand SVG across all variants:
 * - Clean deep navy background (#090D16)
 * - Simple rounded calendar tile in electric indigo/blue
 * - Bold 3-facet geometric paper plane soaring upward to the top-right
 * - Zero visual clutter (no dashed rings, sparkles, text bars, or tiny elements)
 */
function buildIconSvg({
  variant = "full",
  width = 1024,
  height = 1024,
}) {
  let contentTransform = "";
  if (variant === "adaptive-foreground") {
    // Keep within Android's 66% safe zone
    contentTransform = `transform="translate(512, 512) scale(0.66) translate(-512, -512)"`;
  } else if (variant === "rounded") {
    contentTransform = `transform="scale(0.5)"`;
  } else if (variant === "splash") {
    const cx = width / 2;
    const cy = height / 2 - 30;
    contentTransform = `transform="translate(${cx}, ${cy}) scale(0.46) translate(-512, -512)"`;
  } else if (variant === "splash-square") {
    const cx = width / 2;
    const cy = height / 2;
    contentTransform = `transform="translate(${cx}, ${cy}) scale(0.50) translate(-512, -512)"`;
  }

  const showBackground = variant !== "adaptive-foreground";
  const isRounded = variant === "rounded";
  const rx = isRounded ? Math.round(width * 0.225) : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="none">
  <defs>
    <!-- Clean Deep Navy Background -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111A2E" />
      <stop offset="100%" stop-color="#090D16" />
    </linearGradient>

    <!-- Minimal Calendar Tile Gradient -->
    <linearGradient id="calTile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>

    <!-- Paper Plane Upper Wing (Bright Sky -> Cyan) -->
    <linearGradient id="wingTop" x1="15%" y1="80%" x2="95%" y2="15%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#A5F3FC" />
    </linearGradient>

    <!-- Paper Plane Lower Wing (Electric Sky -> Royal Blue) -->
    <linearGradient id="wingBottom" x1="85%" y1="15%" x2="20%" y2="90%">
      <stop offset="0%" stop-color="#7DD3FC" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>

    <!-- Paper Plane Center Fold (Deep Indigo Contrast) -->
    <linearGradient id="wingFold" x1="20%" y1="80%" x2="90%" y2="20%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>

    <!-- Subtle Soft Elevation Shadow -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#030712" flood-opacity="0.55" />
    </filter>
  </defs>

  ${
    showBackground
      ? `<rect width="${width}" height="${height}" rx="${rx}" fill="url(#bg)" />`
      : ""
  }

  <g ${contentTransform}>
    <!-- Minimalist Rounded Calendar Base Tile -->
    <g filter="url(#softShadow)">
      <rect x="216" y="332" width="440" height="440" rx="108" fill="url(#calTile)" />
      <!-- 2 Minimal Calendar Top Tabs -->
      <rect x="328" y="290" width="44" height="84" rx="22" fill="#60A5FA" />
      <rect x="500" y="290" width="44" height="84" rx="22" fill="#60A5FA" />
      <!-- Dark Inner Cutout to Frame the Plane -->
      <rect x="256" y="408" width="360" height="324" rx="76" fill="#0D1628" />
      <!-- Two Simple Study Block Pills -->
      <rect x="304" y="468" width="148" height="44" rx="22" fill="#38BDF8" />
      <rect x="304" y="544" width="104" height="44" rx="22" fill="#1E293B" />
    </g>

    <!-- Bold 3-Facet Geometric Paper Plane -->
    <g filter="url(#softShadow)">
      <!-- Center Fold -->
      <polygon points="828,212 436,484 500,664 564,544" fill="url(#wingFold)" />
      <!-- Upper Left Wing -->
      <polygon points="828,212 244,424 436,484" fill="url(#wingTop)" />
      <!-- Lower Right Wing -->
      <polygon points="828,212 564,544 668,724" fill="url(#wingBottom)" />
    </g>
  </g>
</svg>`;
}

/**
 * Creates a valid multi-resolution ICO file from PNG buffers (16x16, 32x32, 48x48)
 */
function createIcoFromPngBuffers(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  let offset = dirSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  for (const { size, buffer } of pngBuffersWithSizes) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffersWithSizes.map((p) => p.buffer),
  ]);
}

async function run() {
  console.log("Generating simplified StudyAir icons...");

  const webRoundedSvg = buildIconSvg({ variant: "rounded", width: 512, height: 512 });
  fs.writeFileSync(path.join(ROOT, "public/studyair-icon.svg"), webRoundedSvg, "utf8");

  const fullMasterSvg = buildIconSvg({ variant: "full", width: 1024, height: 1024 });
  const adaptiveFgSvg = buildIconSvg({ variant: "adaptive-foreground", width: 1024, height: 1024 });
  const splashSvg = buildIconSvg({ variant: "splash", width: 1080, height: 1920 });
  const splashSquareSvg = buildIconSvg({ variant: "splash-square", width: 1242, height: 1242 });

  // Mobile Expo Assets
  await sharp(Buffer.from(fullMasterSvg))
    .resize(1024, 1024)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(ROOT, "mobile/assets/icon.png"));

  await sharp(Buffer.from(adaptiveFgSvg))
    .resize(1024, 1024)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(ROOT, "mobile/assets/adaptive-icon.png"));

  await sharp(Buffer.from(splashSvg))
    .resize(1080, 1920)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(ROOT, "mobile/assets/splash.png"));

  await sharp(Buffer.from(webRoundedSvg))
    .resize(48, 48)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(ROOT, "mobile/assets/favicon.png"));

  // Web PWA PNGs & Apple Touch Icon
  await sharp(Buffer.from(webRoundedSvg))
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(ROOT, "public/icon-192.png"));

  await sharp(Buffer.from(webRoundedSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(ROOT, "public/icon-512.png"));

  await sharp(Buffer.from(fullMasterSvg))
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(ROOT, "public/apple-touch-icon.png"));

  // Multi-Resolution favicon.ico (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const icoBuffers = [];
  for (const sz of icoSizes) {
    const buf = await sharp(Buffer.from(webRoundedSvg))
      .resize(sz, sz)
      .png()
      .toBuffer();
    icoBuffers.push({ size: sz, buffer: buf });
  }
  const icoFile = createIcoFromPngBuffers(icoBuffers);
  fs.writeFileSync(path.join(ROOT, "src/app/favicon.ico"), icoFile);

  // Android Native Mipmap Launcher Icons & Drawable Splash
  const androidDensities = [
    { folder: "mipmap-mdpi", launcher: 48, foreground: 108 },
    { folder: "mipmap-hdpi", launcher: 72, foreground: 162 },
    { folder: "mipmap-xhdpi", launcher: 96, foreground: 216 },
    { folder: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
    { folder: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
  ];

  const makeCircleMask = (size) =>
    Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );

  const makeSquircleMask = (size) =>
    Buffer.from(
      `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.225)}" fill="#fff"/></svg>`
    );

  for (const { folder, launcher, foreground } of androidDensities) {
    const dir = path.join(ROOT, "mobile/android/app/src/main/res", folder);
    if (!fs.existsSync(dir)) continue;

    const rawLauncher = await sharp(Buffer.from(fullMasterSvg))
      .resize(launcher, launcher)
      .png()
      .toBuffer();

    const squircleLauncher = await sharp(rawLauncher)
      .composite([{ input: makeSquircleMask(launcher), blend: "dest-in" }])
      .png()
      .toBuffer();

    await sharp(squircleLauncher)
      .png()
      .toFile(path.join(dir, "ic_launcher.png"));
    await sharp(squircleLauncher)
      .webp({ quality: 95 })
      .toFile(path.join(dir, "ic_launcher.webp"));

    const roundLauncher = await sharp(rawLauncher)
      .composite([{ input: makeCircleMask(launcher), blend: "dest-in" }])
      .png()
      .toBuffer();

    await sharp(roundLauncher)
      .png()
      .toFile(path.join(dir, "ic_launcher_round.png"));
    await sharp(roundLauncher)
      .webp({ quality: 95 })
      .toFile(path.join(dir, "ic_launcher_round.webp"));

    await sharp(Buffer.from(adaptiveFgSvg))
      .resize(foreground, foreground)
      .webp({ quality: 95 })
      .toFile(path.join(dir, "ic_launcher_foreground.webp"));
  }

  const androidSplashPath = path.join(
    ROOT,
    "mobile/android/app/src/main/res/drawable/splashscreen_image.png"
  );
  if (fs.existsSync(path.dirname(androidSplashPath))) {
    await sharp(Buffer.from(splashSquareSvg))
      .resize(1242, 1242)
      .png({ quality: 100 })
      .toFile(androidSplashPath);
  }

  console.log("All simplified icons generated successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
