import { useEffect, useMemo, useState } from "react";

import {
  fetchRecords,
  fetchSummary,
  seedRecords,
  syncMongo,
  syncS3,
  uploadImages,
  uploadStructuredFile,
} from "./api/dashboardApi.js";
import DashboardHeader from "./components/DashboardHeader.jsx";
import FilterBar from "./components/FilterBar.jsx";
import IngestionPanel from "./components/IngestionPanel.jsx";
import IntelligenceMap from "./components/IntelligenceMap.jsx";
import IntelFeed from "./components/IntelFeed.jsx";
import SummaryStrip from "./components/SummaryStrip.jsx";

const getRecordKey = (record) =>
  record?._id || `${record?.sourceDataset || "dataset"}:${record?.externalId || record?.title}`;

const App = () => {
  const [filters, setFilters] = useState({
    sourceType: "ALL",
    search: "",
    hasMedia: false,
  });
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [storageMode, setStorageMode] = useState("demo-fallback");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState("");

  const visibleRecords = useMemo(() => records, [records]);

  const loadDashboard = async (activeFilters = filters) => {
    setLoading(true);

    try {
      const [recordsResponse, summaryResponse] = await Promise.all([
        fetchRecords(activeFilters),
        fetchSummary(),
      ]);

      setRecords(recordsResponse.data);
      setSummary(summaryResponse.data);
      setStorageMode(summaryResponse.meta.storageMode);
      setSelectedRecord((current) => {
        if (!recordsResponse.data.length) {
          return null;
        }

        const currentKey = getRecordKey(current);
        const stillVisible = recordsResponse.data.find(
          (record) => getRecordKey(record) === currentKey,
        );
        return stillVisible || recordsResponse.data[0];
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDashboard(filters);
    }, filters.search ? 220 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  const runAction = async (task, successMessage) => {
    setActionBusy(true);
    setMessage("");

    try {
      const response = await task();
      setMessage(response.message || successMessage);
      await loadDashboard(filters);
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
        onSeed={() => runAction(() => seedRecords(), "Sample nodes loaded.")}
        actionBusy={actionBusy}
      />

      <SummaryStrip summary={summary} />

      <FilterBar filters={filters} onChange={setFilters} />

      {message ? <div className="message-banner">{message}</div> : null}

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
            () => uploadStructuredFile(formData),
            "Structured intelligence file ingested.",
          )
        }
        onImageUpload={(formData) =>
          runAction(() => uploadImages(formData), "Imagery indexed.")
        }
        onMongoSync={(payload) =>
          runAction(() => syncMongo(payload), "MongoDB sync completed.")
        }
        onS3Sync={(payload) => runAction(() => syncS3(payload), "S3 sync completed.")}
      />

      {loading ? <div className="loading-overlay">Refreshing intelligence picture...</div> : null}
    </main>
  );
};

export default App;
