import { formatCycle, formatInteger } from "../utils/format.js";
import { lookupSchematic, lookupSchematicName, lookupTypeName } from "./static-data.js";

const PIN_GROUP_TYPES = {
  1027: "command-center",
  1028: "advanced-industry-facility",
  1029: "storage-facility",
  1030: "launchpad",
};

function titleCase(value) {
  return String(value)
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePlanetAnchors(pins) {
  const padding = 64;
  const width = 820;
  const height = 520;
  const clusterPins = pins.filter((pin) => pin.type !== "command-center");
  const referencePins = clusterPins.length ? clusterPins : pins;
  const longitudes = referencePins.map((pin) => pin.longitude ?? 0);
  const latitudes = referencePins.map((pin) => pin.latitude ?? 0);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const lonSpan = maxLon - minLon || 1;
  const latSpan = maxLat - minLat || 1;

  return new Map(
    pins.map((pin) => {
      const rawX = padding + (((pin.longitude ?? 0) - minLon) / lonSpan) * (width - padding * 2);
      const rawY = height - padding - (((pin.latitude ?? 0) - minLat) / latSpan) * (height - padding * 2);

      return [
        pin.pin_id,
        {
          x: Math.max(padding, Math.min(width - padding, rawX)),
          y: Math.max(padding, Math.min(height - padding, rawY)),
        },
      ];
    }),
  );
}

function jitterForPin(pinId) {
  const value = Math.sin(Number(pinId) * 0.000001) * 10000;
  return value - Math.floor(value);
}

function initialLayoutPositions(pins) {
  const width = 820;
  const height = 520;
  const anchors = normalizePlanetAnchors(pins);
  return new Map(
    pins.map((pin, index) => {
      const anchor = anchors.get(pin.pin_id) ?? { x: width / 2, y: height / 2 };
      const jitter = jitterForPin(pin.pin_id);
      return [
        pin.pin_id,
        {
          x: anchor.x + (jitter - 0.5) * 6,
          y: anchor.y + (jitterForPin(pin.pin_id + index + 11) - 0.5) * 6,
          anchorX: anchor.x,
          anchorY: anchor.y,
        },
      ];
    }),
  );
}

function describeContents(contents, lookups) {
  if (!contents?.length) {
    return "Empty";
  }

  return contents
    .map((item) => `${formatInteger(item.amount)} ${lookupTypeName(item.type_id, lookups)}`)
    .join(", ");
}

function schematicOutput(schematic) {
  return schematic?.types?.find((type) => !type.isInput) ?? null;
}

function schematicInputs(schematic) {
  return schematic?.types?.filter((type) => type.isInput) ?? [];
}

function mapMaterialItems(contents, lookups) {
  return (contents ?? []).map((item) => ({
    typeId: item.type_id,
    name: lookupTypeName(item.type_id, lookups),
    amount: item.amount,
    volume: lookups?.typeVolumes?.[item.type_id] ?? 0,
    totalVolume: item.amount * (lookups?.typeVolumes?.[item.type_id] ?? 0),
  }));
}

function classifyPin(rawPin, lookups) {
  const groupId = lookups?.typeGroups?.[rawPin.type_id];
  return PIN_GROUP_TYPES[groupId] ?? "pin";
}

function isStoragePinType(pinType) {
  return pinType === "launchpad" || pinType === "storage-facility";
}

function labelPrefix(pin) {
  if (pin.type === "launchpad") {
    return "LP";
  }
  if (pin.type === "storage-facility") {
    return "ST";
  }
  if (pin.type === "command-center") {
    return "CC";
  }
  if (pin.schematicName) {
    return pin.schematicName
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }

  return "PIN";
}

export function mapEsiColonyToViewModel({ planet, detail, names = {}, lookups = null }) {
  const rawPinsWithType = (detail.pins ?? []).map((pin) => ({
    ...pin,
    type: classifyPin(pin, lookups),
  }));
  const positions = initialLayoutPositions(rawPinsWithType);
  const routeCountsByPin = new Map();

  for (const route of detail.routes ?? []) {
    routeCountsByPin.set(route.source_pin_id, (routeCountsByPin.get(route.source_pin_id) ?? 0) + 1);
    routeCountsByPin.set(route.destination_pin_id, (routeCountsByPin.get(route.destination_pin_id) ?? 0) + 1);
  }

  const labelCounts = new Map();
  const pins = (detail.pins ?? []).map((rawPin) => {
    const schematic = rawPin.schematic_id ? lookupSchematic(rawPin.schematic_id, lookups) : null;
    const output = schematicOutput(schematic);
    const inputs = schematicInputs(schematic);
    const position = positions.get(rawPin.pin_id) ?? { x: 410, y: 260, anchorX: 410, anchorY: 260 };
    const typeName = lookupTypeName(rawPin.type_id, lookups);
    const product = output?.name ?? describeContents(rawPin.contents, lookups);
    const materialItems = mapMaterialItems(rawPin.contents, lookups);
    const pinType = classifyPin(rawPin, lookups);
    const storageUsedVolume = materialItems.reduce((total, item) => total + item.totalVolume, 0);
    const storageCapacity = isStoragePinType(pinType) ? lookups?.typeCapacities?.[rawPin.type_id] ?? null : null;
    const storageFillRatio = storageCapacity ? Math.min(storageUsedVolume / storageCapacity, 1) : null;
    const isFactory = pinType.includes("industry-facility");
    const hasInputsBuffered = materialItems.some((item) => item.amount > 0);
    const isWorking = Boolean(isFactory && rawPin.last_cycle_start && hasInputsBuffered);

    const pin = {
      id: String(rawPin.pin_id),
      rawPinId: rawPin.pin_id,
      name: schematic ? `${schematic.name} Factory` : typeName,
      type: pinType,
      typeId: rawPin.type_id,
      typeName,
      schematicId: rawPin.schematic_id ?? null,
      schematicName: rawPin.schematic_id ? lookupSchematicName(rawPin.schematic_id, lookups) : null,
      x: position.x,
      y: position.y,
      status: isWorking ? "Running" : "Idle",
      isWorking,
      product,
      cycleMinutes: schematic?.cycleTime ? schematic.cycleTime / 60 : null,
      details: [
        rawPin.schematic_id ? `Schematic ${rawPin.schematic_id}` : null,
        `${routeCountsByPin.get(rawPin.pin_id) ?? 0} linked routes`,
      ]
        .filter(Boolean)
        .join(" - "),
      contents: rawPin.contents ?? [],
      materialItems,
      storageUsedVolume,
      storageCapacity,
      storageFillRatio,
      contentSummary: describeContents(rawPin.contents, lookups),
      inputs,
      output,
      latitude: rawPin.latitude,
      longitude: rawPin.longitude,
      anchorX: position.anchorX,
      anchorY: position.anchorY,
      lastCycleStart: rawPin.last_cycle_start ?? null,
    };

    const prefix = labelPrefix(pin);
    const count = (labelCounts.get(prefix) ?? 0) + 1;
    labelCounts.set(prefix, count);
    pin.displayLabel = `${prefix}${count}`;
    return pin;
  });

  return {
    id: planet.planet_id,
    planetId: planet.planet_id,
    planetName: names[planet.planet_id] ?? `Planet ${planet.planet_id}`,
    planetType: titleCase(planet.planet_type),
    solarSystemName: names[planet.solar_system_id] ?? `System ${planet.solar_system_id}`,
    solarSystemId: planet.solar_system_id,
    lastUpdated: planet.last_update,
    summary: `${formatInteger(planet.num_pins)} pins - upgrade ${planet.upgrade_level}`,
    isLive: true,
    pins,
    links: (detail.links ?? []).map((link, index) => ({
      id: `link-${link.source_pin_id}-${link.destination_pin_id}-${index}`,
      sourcePinId: String(link.source_pin_id),
      targetPinId: String(link.destination_pin_id),
      linkLevel: link.link_level,
      bandwidth: link.link_level,
    })),
    routes: detail.routes ?? [],
  };
}
