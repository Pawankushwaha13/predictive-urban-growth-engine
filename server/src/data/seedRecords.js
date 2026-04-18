const seedRecords = [
  {
    title: "Convoy movement observed near southern transit corridor",
    description:
      "OSINT monitoring flagged repeated convoy references across shipping and transport channels over the last six hours.",
    sourceType: "OSINT",
    sourceDataset: "seed-social-feed",
    locationName: "Transit Corridor Alpha",
    latitude: 24.8607,
    longitude: 67.0011,
    eventTime: "2026-04-18T03:20:00.000Z",
    sourceLink: "https://example.com/osint/convoy-alpha",
    confidence: 72,
    tags: ["convoy", "transport", "osint"],
    mediaUrl: "",
    mediaType: "",
    metadata: {
      channel: "shipping-watch",
      analystNote: "Correlation rising across three independent posts.",
    },
    rawPayload: {
      author: "transit_observer",
      engagement: 128,
    },
    externalId: "seed-osint-1",
    ingestMethod: "seed",
  },
  {
    title: "Field source reports temporary checkpoint reinforcement",
    description:
      "HUMINT source indicated a short-notice reinforcement of checkpoint personnel and portable barriers before dawn.",
    sourceType: "HUMINT",
    sourceDataset: "seed-field-reports",
    locationName: "Checkpoint Delta",
    latitude: 28.6139,
    longitude: 77.209,
    eventTime: "2026-04-18T01:45:00.000Z",
    sourceLink: "",
    confidence: 81,
    tags: ["checkpoint", "field-report", "humint"],
    mediaUrl: "",
    mediaType: "",
    metadata: {
      reportingCell: "Sector 12",
      urgency: "medium",
    },
    rawPayload: {
      sourceReliability: "B2",
    },
    externalId: "seed-humint-1",
    ingestMethod: "seed",
  },
  {
    title: "Satellite image captures vehicle concentration at depot edge",
    description:
      "Imagery pass shows multiple heat signatures and light vehicle clustering on the western edge of the depot.",
    sourceType: "IMINT",
    sourceDataset: "seed-imagery",
    locationName: "Depot West",
    latitude: 26.9124,
    longitude: 75.7873,
    eventTime: "2026-04-17T19:10:00.000Z",
    sourceLink: "",
    confidence: 88,
    tags: ["imagery", "depot", "vehicles"],
    mediaUrl:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image/jpeg",
    metadata: {
      sensor: "EO",
      resolution: "0.5m",
    },
    rawPayload: {
      passId: "EO-118-A",
    },
    externalId: "seed-imint-1",
    ingestMethod: "seed",
  },
  {
    title: "OSINT chatter indicates fuel stockpile movement",
    description:
      "Keyword extraction from local bulletin archives suggests unusual tanker routing toward a temporary logistics point.",
    sourceType: "OSINT",
    sourceDataset: "seed-bulletin-archive",
    locationName: "Logistics Point Echo",
    latitude: 23.0225,
    longitude: 72.5714,
    eventTime: "2026-04-17T22:30:00.000Z",
    sourceLink: "https://example.com/osint/fuel-route",
    confidence: 64,
    tags: ["fuel", "logistics", "routing"],
    mediaUrl: "",
    mediaType: "",
    metadata: {
      bulletinIds: ["BLN-44", "BLN-51"],
    },
    rawPayload: {
      mentionCount: 9,
    },
    externalId: "seed-osint-2",
    ingestMethod: "seed",
  },
  {
    title: "Source reports new fencing around ridge installation",
    description:
      "Trusted field contact reported newly installed fencing and antenna support work around the ridge line compound.",
    sourceType: "HUMINT",
    sourceDataset: "seed-source-notes",
    locationName: "Ridge Installation",
    latitude: 19.076,
    longitude: 72.8777,
    eventTime: "2026-04-17T15:00:00.000Z",
    sourceLink: "",
    confidence: 76,
    tags: ["fencing", "installation", "humint"],
    mediaUrl: "",
    mediaType: "",
    metadata: {
      sourceProtectionLevel: "restricted",
    },
    rawPayload: {
      reportChain: ["handler", "sector-chief"],
    },
    externalId: "seed-humint-2",
    ingestMethod: "seed",
  },
  {
    title: "Thermal imagery highlights active generators at hilltop node",
    description:
      "Night thermal pass suggests sustained power generation activity and intermittent vehicle presence.",
    sourceType: "IMINT",
    sourceDataset: "seed-thermal-pass",
    locationName: "Hilltop Node",
    latitude: 12.9716,
    longitude: 77.5946,
    eventTime: "2026-04-17T20:40:00.000Z",
    sourceLink: "",
    confidence: 90,
    tags: ["thermal", "generators", "imagery"],
    mediaUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    mediaType: "image/jpeg",
    metadata: {
      sensor: "IR",
      duration: "14m",
    },
    rawPayload: {
      passId: "IR-77-C",
    },
    externalId: "seed-imint-2",
    ingestMethod: "seed",
  },
];

export default seedRecords;

