#!/usr/bin/env node
// Scans assets/<year>/<project>/ and builds assets/data.json
// Convention: "vignette.*" (or "cover.*") = thumbnail shown on the grid.
// Every other image/video in the folder = shown in the detail view on click.
// An optional "description.txt" (or "info.txt") in the project folder becomes its text.

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
    return { title: capitalize(name.replace(/^photomontage-/i, "")), category: "Photomontage manga" };
  }
  if (/^tissu-/i.test(name)) {
    return { title: capitalize(name.replace(/^tissu-/i, "")), category: "Tableau tissu" };
  }
  if (/th[ée][aà]tre/i.test(name)) {
    return { title: capitalize(name), category: "Théâtre" };
  }
  return { title: capitalize(name), category: "Montage photo" };
}

function readDescription(folder) {
  for (const name of ["description.txt", "info.txt"]) {
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

    const { title, category } = classify(project);

    yearProjects.push({
      slug: project,
      title,
      category,
      year,
      vignette: `assets/${nfc(year)}/${nfc(project)}/${nfc(vignetteFile)}`,
      vignetteType: mediaType(vignetteFile),
      description: readDescription(projectDir),
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
console.log(`data.json généré : ${data.length} année(s), ${total} projet(s).`);
for (const y of data) {
  console.log(`  ${y.year}: ${y.projects.map((p) => p.slug).join(", ")}`);
}
