import { region1Maps } from "./regions/region1.js";
import { region2Maps } from "./regions/region2.js";
import { routeMaps } from "./regions/region_routes.js";

function mergeMaps(sources) {
  const out = {};
  const duplicates = [];

  for (const src of sources) {
    const { name, maps } = src;
    for (const id of Object.keys(maps)) {
      if (out[id]) {
        duplicates.push({ id, sources: [out[id].__sourceName || "<unknown>", name] });
        // Preserve prior behavior: later sources win, but we make it loud.
      }
      const entry = maps[id];
      // Attach lightweight provenance for debugging; ignored by engine.
      if (entry && typeof entry === "object" && !entry.__sourceName) {
        entry.__sourceName = name;
      }
      out[id] = entry;
    }
  }

  if (duplicates.length) {
    out.__registryErrors = {
      duplicates,
    };
    // Intentionally loud: duplicates become non-deterministic content bugs.
    console.error(
      "[MapRegistry] Duplicate map ids detected. Fix these ids before adding more content:",
      duplicates
    );
  }

  return out;
}

// Single source of truth (with duplicate detection)
export const maps = mergeMaps([
  { name: "region1", maps: region1Maps },
  { name: "region2", maps: region2Maps },
  { name: "routes", maps: routeMaps },
]);

// Compatibility exports (engine might import MAPS or default)
export const MAPS = maps;
export default maps;
