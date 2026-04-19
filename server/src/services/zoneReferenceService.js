import { zoneReferenceCatalog } from "../data/sourceTemplates.js";

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const buildZoneKey = (record = {}) =>
  [normalizeText(record.city), normalizeText(record.title || record.corridor || record.externalId)]
    .filter(Boolean)
    .join("::");

export const resolveZoneReference = ({ title = "", city = "", corridor = "", externalId = "" }) => {
  const normalizedTitle = normalizeText(title);
  const normalizedCity = normalizeText(city);
  const normalizedCorridor = normalizeText(corridor);
  const normalizedExternalId = normalizeText(externalId);

  return (
    zoneReferenceCatalog.find((reference) => {
      const aliases = [
        reference.title,
        reference.corridor,
        reference.externalId,
        ...(reference.aliases || []),
      ].map(normalizeText);

      return (
        (normalizedExternalId && aliases.includes(normalizedExternalId)) ||
        ((normalizedTitle || normalizedCorridor) &&
          aliases.some(
            (alias) =>
              alias &&
              (alias.includes(normalizedTitle || normalizedCorridor) ||
                (normalizedTitle || normalizedCorridor).includes(alias)),
          ) &&
          (!normalizedCity || normalizeText(reference.city) === normalizedCity))
      );
    }) || null
  );
};

export const findZoneReferencesInText = (text = "", fallbackCity = "") => {
  const normalizedText = normalizeText(text);
  const normalizedFallbackCity = normalizeText(fallbackCity);

  return zoneReferenceCatalog.filter((reference) => {
    const aliases = [reference.title, reference.corridor, ...(reference.aliases || [])];
    const matchesAlias = aliases.some((alias) => normalizedText.includes(normalizeText(alias)));
    if (matchesAlias) {
      return true;
    }

    return (
      normalizedFallbackCity &&
      normalizeText(reference.city) === normalizedFallbackCity &&
      aliases.some((alias) => normalizeText(alias).includes(normalizedFallbackCity))
    );
  });
};

export const getZoneReferenceByExternalId = (externalId = "") =>
  zoneReferenceCatalog.find((reference) => reference.externalId === externalId) || null;

export const getZoneReferenceCatalog = () => zoneReferenceCatalog.slice();
