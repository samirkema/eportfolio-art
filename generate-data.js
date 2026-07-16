#!/usr/bin/env node
// Scans assets/<year>/<project>/ and builds assets/data.json
//
// Conventions (drop files into a project folder, no code changes needed):
//   vignette.*      -> thumbnail shown on the grid (falls back to cover.*,
//                      then to the first media file found).
//   any other image/video in the folder -> shown in the detail view on click.
//   description.txt (or info.txt) -> project description. Omit the file and
//                      no description is shown at all.
//   title.txt       -> overrides the auto-generated title.
//   category.txt    -> overrides the auto-detected category label.

const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "assets");
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const VIDEO_EXT = [".mp4", ".mov", ".webm"];
const MEDIA_EXT = [...IMAGE_EXT, ...VIDEO_EXT];

function isMedia(file) {
  return MEDIA_EXT.includes(path.extname(file).toLowerCase());
}

function mediaType(file) {
  return VIDEO_EXT.includes(path.extname(file).toLowerCase()) ? "video" : "image";
}

function capitalize(str) {
  str = str.replace(/[-_]/g, " ").trim();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function classify(name) {
  if (/^photomontage-/i.test(name)) {
    return { title: capitalize(name.replace(/^photomontage-/i, "")), category: "Manga photomontage" };
  }
  if (/^tissu-/i.test(name)) {
    return { title: capitalize(name.replace(/^tissu-/i, "")), category: "Fabric artwork" };
  }
  if (/th[ée][aà]tre/i.test(name)) {
    return { title: capitalize(name), category: "Theatre" };
  }
  return { title: capitalize(name), category: "Photo montage" };
}

function readTextFile(folder, names) {
  for (const name of names) {
    const p = path.join(folder, name);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim();
  }
  return "";
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// macOS (APFS/HFS+) hands back decomposed (NFD) unicode from readdir, but git
// (core.precomposeunicode) stores precomposed (NFC) paths — normalize here so
// the URLs in data.json actually match the filenames served by GitHub Pages.
function nfc(str) {
  return str.normalize("NFC");
}

const years = fs
  .readdirSync(ASSETS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{4}$/.test(d.name))
  .map((d) => d.name)
  .sort()
  .reverse();

const data = [];

for (const year of years) {
  const yearDir = path.join(ASSETS_DIR, year);
  const projects = fs
    .readdirSync(yearDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(naturalSort);

  const yearProjects = [];

  for (const project of projects) {
    const projectDir = path.join(yearDir, project);
    const files = fs
      .readdirSync(projectDir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter(isMedia)
      .sort(naturalSort);

    if (files.length === 0) continue; // skip empty / not-ready folders

    const vignetteFile =
      files.find((f) => /^vignette\./i.test(f)) ||
      files.find((f) => /^cover\./i.test(f)) ||
      files[0];

    const gallery = files
      .filter((f) => f !== vignetteFile)
      .map((f) => ({
        src: `assets/${nfc(year)}/${nfc(project)}/${nfc(f)}`,
        type: mediaType(f),
      }));

    const auto = classify(project);
    const title = readTextFile(projectDir, ["title.txt"]) || auto.title;
    const category = readTextFile(projectDir, ["category.txt"]) || auto.category;

    yearProjects.push({
      slug: project,
      title,
      category,
      year,
      vignette: `assets/${nfc(year)}/${nfc(project)}/${nfc(vignetteFile)}`,
      vignetteType: mediaType(vignetteFile),
      description: readTextFile(projectDir, ["description.txt", "info.txt"]),
      gallery,
    });
  }

  if (yearProjects.length > 0) {
    data.push({ year, projects: yearProjects });
  }
}

fs.writeFileSync(
  path.join(ASSETS_DIR, "data.json"),
  JSON.stringify(data, null, 2)
);

const total = data.reduce((n, y) => n + y.projects.length, 0);
console.log(`data.json generated: ${data.length} year(s), ${total} project(s).`);
for (const y of data) {
  console.log(`  ${y.year}: ${y.projects.map((p) => p.slug).join(", ")}`);
}
