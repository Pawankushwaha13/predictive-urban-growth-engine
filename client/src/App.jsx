import { useEffect, useMemo, useState } from "react";

import {
  fetchConnectorTemplates,
  fetchSummary,
  fetchZones,
  runMarketHarvest,
  runMunicipalHarvest,
  runPredictivePipeline,
  seedZones,
  uploadZoneDataset,
} from "./api/dashboardApi.js";
import DashboardHeader from "./components/DashboardHeader.jsx";
import FilterBar from "./components/FilterBar.jsx";
import HarvesterPanel from "./components/HarvesterPanel.jsx";
import IngestionPanel from "./components/IngestionPanel.jsx";
import IntelligenceMap from "./components/IntelligenceMap.jsx";
import IntelFeed from "./components/IntelFeed.jsx";
import SummaryStrip from "./components/SummaryStrip.jsx";

const getRecordKey = (record) =>
  record?._id || `${record?.sourceDataset || "dataset"}:${record?.externalId || record?.title}`;

const matchesSearch = (record, search) => {
  if (!search) {
    return true;
  }

  const haystack = [
    record.title,
    record.city,
    record.state,
    record.corridor,
    record.description,
    ...(record.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search.toLowerCase());
};

const App = () => {
  const [filters, setFilters] = useState({
    city: "ALL",
    marketPhase: "ALL",
    search: "",
    minScore: 55,
  });
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [storageMode, setStorageMode] = useState("demo-fallback");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [connectorTemplates, setConnectorTemplates] = useState({
    municipal: [],
    market: [],
  });
  const [pipelineReport, setPipelineReport] = useState(null);

  const visibleRecords = useMemo(
    () =>
      records
        .filter((record) => {
          if (filters.city !== "ALL" && record.city !== filters.city) {
            return false;
          }

          if (filters.marketPhase !== "ALL" && record.marketPhase !== filters.marketPhase) {
            return false;
          }

          if (record.growthVelocityScore < filters.minScore) {
            return false;
          }

          return matchesSearch(record, filters.search);
        })
        .sort((left, right) => {
          return (
            right.growthVelocityScore - left.growthVelocityScore ||
            right.projectedAppreciationPct - left.projectedAppreciationPct
          );
        }),
    [filters, records],
  );

  const cities = useMemo(
    () => ["ALL", ...new Set(records.map((record) => record.city).filter(Boolean))],
    [records],
  );

  const marketPhases = useMemo(
    () => ["ALL", ...new Set(records.map((record) => record.marketPhase).filter(Boolean))],
    [records],
  );

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [recordsResponse, summaryResponse, templatesResponse] = await Promise.all([
        fetchZones(),
        fetchSummary(),
        fetchConnectorTemplates(),
      ]);

      setRecords(recordsResponse.data || []);
      setSummary(summaryResponse.data || {});
      setStorageMode(summaryResponse.meta?.storageMode || "demo-fallback");
      setConnectorTemplates(templatesResponse.data || { municipal: [], market: [] });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    setSelectedRecord((current) => {
      if (!visibleRecords.length) {
        return null;
      }

      const currentKey = getRecordKey(current);
      const matchingRecord = visibleRecords.find(
        (record) => getRecordKey(record) === currentKey,
      );

      return matchingRecord || visibleRecords[0];
    });
  }, [visibleRecords]);

  const runAction = async (task, successMessage, onSuccess) => {
    setActionBusy(true);
    setMessage("");

    try {
      const response = await task();
      onSuccess?.(response);
      setMessage(response.message || successMessage);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <DashboardHeader
        storageMode={storageMode}
        summary={summary}
        onSeed={() => runAction(() => seedZones(), "Demo zones refreshed.")}
        actionBusy={actionBusy}
      />

      <SummaryStrip summary={summary} />

      <FilterBar
        filters={filters}
        cities={cities}
        marketPhases={marketPhases}
        onChange={setFilters}
      />

      {message ? <div className="message-banner">{message}</div> : null}

      <HarvesterPanel
        actionBusy={actionBusy}
        connectorTemplates={connectorTemplates}
        pipelineReport={pipelineReport}
        onRunPipeline={() =>
          runAction(
            () => runPredictivePipeline({ mode: "demo" }),
            "Predictive pipeline completed.",
            (response) =>
              setPipelineReport({
                type: "pipeline",
                ...response.summary,
              }),
          )
        }
        onMunicipalHarvest={(formData) =>
          runAction(
            () => runMunicipalHarvest(formData),
            "Municipal sources harvested.",
            (response) =>
              setPipelineReport({
                type: "municipal",
                ...response.summary,
              }),
          )
        }
        onMarketHarvest={(payload) =>
          runAction(
            () => runMarketHarvest(payload),
            "Market feed harvested.",
            (response) =>
              setPipelineReport({
                type: "market",
                ...response.summary,
              }),
          )
        }
      />

      <section className="content-grid">
        <div className="map-column">
          <IntelligenceMap
            records={visibleRecords}
            activeRecord={selectedRecord}
            onHover={setSelectedRecord}
            onSelect={setSelectedRecord}
          />
        </div>

        <div className="side-column">
          <IntelFeed
            records={visibleRecords}
            activeRecord={selectedRecord}
            onSelect={setSelectedRecord}
          />
        </div>
      </section>

      <IngestionPanel
        actionBusy={actionBusy}
        onStructuredUpload={(formData) =>
          runAction(
            () => uploadZoneDataset(formData),
            "Urban growth dataset uploaded successfully.",
          )
        }
      />

      {loading ? <div className="loading-overlay">Refreshing growth forecasts...</div> : null}
    </main>
  );
};

export default App;
