import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

const FileDrop = ({ files, onDrop }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
    onDrop,
  });

  const label = useMemo(() => {
    if (!files.length) {
      return "Drop a CSV, Excel, or JSON dataset with municipal and market metrics.";
    }

    return files[0].name;
  }, [files]);

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
      <input {...getInputProps()} />
      <strong>Drop dataset here</strong>
      <span>{label}</span>
    </div>
  );
};

const IngestionPanel = ({ actionBusy, onStructuredUpload }) => {
  const [structuredFiles, setStructuredFiles] = useState([]);
  const [form, setForm] = useState({
    sourceDataset: "",
    defaultsJson: "",
    fieldMapJson: "",
  });

  const submitStructured = async (event) => {
    event.preventDefault();

    if (!structuredFiles[0]) {
      return;
    }

    const formData = new FormData();
    formData.append("file", structuredFiles[0]);
    formData.append("sourceDataset", form.sourceDataset);

    if (form.defaultsJson.trim()) {
      formData.append("defaults", form.defaultsJson);
    }

    if (form.fieldMapJson.trim()) {
      formData.append("fieldMap", form.fieldMapJson);
    }

    await onStructuredUpload(formData);
    setStructuredFiles([]);
  };

  return (
    <section className="ingestion-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Dataset Intake</span>
          <h2>Upload Municipal + Market Inputs</h2>
        </div>
      </div>

      <div className="ingestion-grid single">
        <article className="ingest-section">
          <form onSubmit={submitStructured} className="ingest-form">
            <FileDrop files={structuredFiles} onDrop={setStructuredFiles} />

            <input
              type="text"
              placeholder="Dataset label"
              value={form.sourceDataset}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sourceDataset: event.target.value,
                }))
              }
            />

            <textarea
              rows="3"
              placeholder='Defaults JSON, e.g. {"city":"Pune","state":"Maharashtra"}'
              value={form.defaultsJson}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultsJson: event.target.value,
                }))
              }
            />

            <textarea
              rows="3"
              placeholder='Field map JSON, e.g. {"pricePerSqft":"avg_psf","municipalSignals":"signals_json"}'
              value={form.fieldMapJson}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fieldMapJson: event.target.value,
                }))
              }
            />

            <button type="submit" className="primary-button" disabled={actionBusy}>
              Score uploaded dataset
            </button>
          </form>
        </article>

        <article className="ingest-section">
          <h3>Expected columns</h3>
          <div className="schema-grid">
            <code>title</code>
            <code>city</code>
            <code>latitude</code>
            <code>longitude</code>
            <code>pricePerSqft</code>
            <code>priceGrowthPct</code>
            <code>rentalYieldPct</code>
            <code>rentalAbsorptionPct</code>
            <code>listingDensityScore</code>
            <code>searchMomentumScore</code>
            <code>permitMomentumScore</code>
            <code>cluMomentumScore</code>
            <code>infrastructureBoostScore</code>
            <code>supplyRiskScore</code>
            <code>monthsToCatalyst</code>
            <code>municipalSignals</code>
          </div>

          <div className="ingestion-tips">
            <p>
              <strong>Tip:</strong> Provide <code>municipalSignals</code> as a JSON array for
              the highest-quality scoring.
            </p>
            <p>
              <strong>Example:</strong>{" "}
              <code>
                [{`{"title":"Metro line","category":"metro","status":"tendered","monthsToExecution":18,"confidence":84}`}]
              </code>
            </p>
          </div>
        </article>
      </div>
    </section>
  );
};

export default IngestionPanel;
