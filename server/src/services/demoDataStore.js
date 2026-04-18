import seedRecords from "../data/seedRecords.js";

const records = seedRecords.map((record, index) => ({
  ...record,
  _id: `demo-${index + 1}`,
  createdAt: new Date(record.eventTime),
  updatedAt: new Date(record.eventTime),
}));

const textMatch = (record, search) => {
  if (!search) {
    return true;
  }

  const haystack = [
    record.title,
    record.description,
    record.locationName,
    ...(record.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search.toLowerCase());
};

const applyFilters = (filter = {}) =>
  records.filter((record) => {
    if (filter.sourceType && record.sourceType !== filter.sourceType) {
      return false;
    }

    if (filter.hasMedia === true && !record.mediaUrl) {
      return false;
    }

    if (!textMatch(record, filter.search)) {
      return false;
    }

    return true;
  });

export const demoDataStore = {
  list(filter = {}) {
    return applyFilters(filter)
      .slice()
      .sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
  },

  insertMany(items = []) {
    const inserted = items.map((item, index) => {
      const entry = {
        ...item,
        _id: `demo-${records.length + index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return entry;
    });

    records.push(...inserted);
    return inserted;
  },

  upsertMany(items = []) {
    const upserted = [];

    items.forEach((item) => {
      const existingIndex = records.findIndex(
        (record) =>
          item.externalId &&
          item.sourceDataset &&
          record.externalId === item.externalId &&
          record.sourceDataset === item.sourceDataset,
      );

      if (existingIndex >= 0) {
        records[existingIndex] = {
          ...records[existingIndex],
          ...item,
          updatedAt: new Date(),
        };
        upserted.push(records[existingIndex]);
        return;
      }

      const created = {
        ...item,
        _id: `demo-${records.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.push(created);
      upserted.push(created);
    });

    return upserted;
  },

  summary(filter = {}) {
    const selected = applyFilters(filter);

    return {
      total: selected.length,
      OSINT: selected.filter((record) => record.sourceType === "OSINT").length,
      HUMINT: selected.filter((record) => record.sourceType === "HUMINT").length,
      IMINT: selected.filter((record) => record.sourceType === "IMINT").length,
      withMedia: selected.filter((record) => Boolean(record.mediaUrl)).length,
      latestEventTime:
        selected.length > 0
          ? selected
              .map((record) => new Date(record.eventTime))
              .sort((a, b) => b - a)[0]
              .toISOString()
          : null,
    };
  },
};

