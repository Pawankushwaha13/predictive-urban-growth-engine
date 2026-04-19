import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

const MunicipalDropzone = ({ file, onDrop }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "text/html": [".html", ".htm"],
      "text/plain": [".txt", ".md"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => onDrop(acceptedFiles[0] || null),
  });

  const label = useMemo(() => file?.name || "Optional PDF, HTML, or TXT municipal bulletin", [file]);

  return (
    <div {...getRootProps()} className={`dropzone compact ${isDragActive ? "active" : ""}`}>
      <input {...getInputProps()} />
      <strong>Drop municipal document</strong>
      <span>{label}</span>
    </div>
  );
};

const HarvesterPanel = ({
  actionBusy,
  connectorTemplates,
  pipelineReport,
  onRunPipeline,
  onMunicipalHarvest,
  onMarketHarvest,
}) => {
  const municipalConnectorOptions = useMemo(
    () => (connectorTemplates.municipal || []).filter((template) => template.kind === "live-connector"),
    [connectorTemplates.municipal],
  );
  const marketConnectorOptions = useMemo(
    () => (connectorTemplates.market || []).filter((template) => template.kind === "live-connector"),
    [connectorTemplates.market],
  );
  const [municipalFile, setMunicipalFile] = useState(null);
  const [municipalForm, setMunicipalForm] = useState({
    profileId: "",
    label: "",
    sourceUrl: "",
    rawText: "",
    defaultsJson: "",
    crawlLinkedDocuments: true,
    maxLinkedDocuments: 3,
  });
  const [marketForm, setMarketForm] = useState({
    connectorId: "",
    label: "",
    provider: "99acres",
    url: "",
    rawText: "",
    defaultsJson: "",
  });

  const submitMunicipal = async (event) => {
    event.preventDefault();

    const formData = new FormData();

    if (municipalFile) {
      formData.append("file", municipalFile);
    }

    formData.append("profileId", municipalForm.profileId);
    formData.append("label", municipalForm.label);
    formData.append("sourceUrl", municipalForm.sourceUrl);
    formData.append("rawText", municipalForm.rawText);
    formData.append("crawlLinkedDocuments", String(municipalForm.crawlLinkedDocuments));
    formData.append("maxLinkedDocuments", String(municipalForm.maxLinkedDocuments || 3));

    if (municipalForm.defaultsJson.trim()) {
      formData.append("defaults", municipalForm.defaultsJson);
    }

    await onMunicipalHarvest(formData);
    setMunicipalFile(null);
  };

  const submitMarket = async (event) => {
    event.preventDefault();

    await onMarketHarvest({
      connectorId: marketForm.connectorId,
      label: marketForm.label,
      provider: marketForm.provider,
      url: marketForm.url,
      rawText: marketForm.rawText,
      defaults: marketForm.defaultsJson,
      useDemoPack: !marketForm.url && !marketForm.rawText && !marketForm.connectorId,
    });
  };

  return (
    <section className="ingestion-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Harvest Layer</span>
          <h2>Municipal + Portal Pipeline</h2>
        </div>
      </div>

      <div className="pipeline-banner">
        <div>
          <strong>Run the exact project flow</strong>
          <p>
            Harvest municipal declarations, aggregate market sentiment snapshots, then fuse both
            into refreshed hotspot scores.
          </p>
        </div>
        <button type="button" className="primary-button" disabled={actionBusy} onClick={onRunPipeline}>
          Run demo pipeline
        </button>
      </div>

      {pipelineReport ? (
        <div className="pipeline-report">
          <span>Last job: {pipelineReport.type}</span>
          <strong>
            {pipelineReport.zoneCount || pipelineReport.rowCount || pipelineReport.sourceCount || 0}{" "}
            zones or sources processed
          </strong>
          <small>
            Municipal sources {pipelineReport.municipalSourceCount ?? pipelineReport.sourceCount ?? 0}
            {" · "}Market sources {pipelineReport.marketSourceCount ?? 0}
          </small>
        </div>
      ) : null}

      <div className="ingestion-grid triple">
        <article className="ingest-section">
          <h3>Municipal scraping</h3>
          <p>
            Parse tenders, CLU notes, and infrastructure updates from PDF, HTML, or raw copied
            text.
          </p>

          <form onSubmit={submitMunicipal} className="ingest-form">
            <MunicipalDropzone file={municipalFile} onDrop={setMunicipalFile} />
            <select
              value={municipalForm.profileId}
              onChange={(event) =>
                setMunicipalForm((current) => ({ ...current, profileId: event.target.value }))
              }
            >
              <option value="">Select live connector profile</option>
              {municipalConnectorOptions.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Source label"
              value={municipalForm.label}
              onChange={(event) =>
                setMunicipalForm((current) => ({ ...current, label: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Municipal source URL"
              value={municipalForm.sourceUrl}
              onChange={(event) =>
                setMunicipalForm((current) => ({ ...current, sourceUrl: event.target.value }))
              }
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={municipalForm.crawlLinkedDocuments}
                onChange={(event) =>
                  setMunicipalForm((current) => ({
                    ...current,
                    crawlLinkedDocuments: event.target.checked,
                  }))
                }
              />
              Follow linked tender documents
            </label>
            <input
              type="number"
              min="1"
              max="6"
              placeholder="Max linked docs"
              value={municipalForm.maxLinkedDocuments}
              onChange={(event) =>
                setMunicipalForm((current) => ({
                  ...current,
                  maxLinkedDocuments: event.target.value,
                }))
              }
            />
            <textarea
              rows="4"
              placeholder="Paste tender / zoning / infra text here"
              value={municipalForm.rawText}
              onChange={(event) =>
                setMunicipalForm((current) => ({ ...current, rawText: event.target.value }))
              }
            />
            <textarea
              rows="3"
              placeholder='Fallback defaults JSON, e.g. {"city":"Gurugram","corridor":"Dwarka Expressway"}'
              value={municipalForm.defaultsJson}
              onChange={(event) =>
                setMunicipalForm((current) => ({ ...current, defaultsJson: event.target.value }))
              }
            />
            <button type="submit" className="primary-button" disabled={actionBusy}>
              Harvest municipal source
            </button>
          </form>
        </article>

        <article className="ingest-section">
          <h3>Market intelligence</h3>
          <p>
            Aggregate portal snapshots for listing density, pricing velocity, and search demand.
          </p>

          <form onSubmit={submitMarket} className="ingest-form">
            <select
              value={marketForm.connectorId}
              onChange={(event) => {
                const selectedConnector = marketConnectorOptions.find(
                  (template) => template.id === event.target.value,
                );
                setMarketForm((current) => ({
                  ...current,
                  connectorId: event.target.value,
                  provider: selectedConnector?.provider || current.provider,
                }));
              }}
            >
              <option value="">Select portal connector</option>
              {marketConnectorOptions.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Feed label"
              value={marketForm.label}
              onChange={(event) =>
                setMarketForm((current) => ({ ...current, label: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Provider, e.g. 99acres or MagicBricks"
              value={marketForm.provider}
              onChange={(event) =>
                setMarketForm((current) => ({ ...current, provider: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Listing/locality page URL or JSON/CSV feed URL"
              value={marketForm.url}
              onChange={(event) =>
                setMarketForm((current) => ({ ...current, url: event.target.value }))
              }
            />
            <textarea
              rows="6"
              placeholder='Optional raw HTML or JSON rows, e.g. [{"title":"Dwarka Expressway East","city":"Gurugram","pricePerSqft":12000}]'
              value={marketForm.rawText}
              onChange={(event) =>
                setMarketForm((current) => ({ ...current, rawText: event.target.value }))
              }
            />
            <textarea
              rows="3"
              placeholder='Defaults JSON for geolocation, e.g. {"city":"Gurugram","corridor":"Dwarka Expressway","latitude":28.4474,"longitude":77.0409}'
              value={marketForm.defaultsJson}
              onChange={(event) =>
                setMarketForm((current) => ({ ...current, defaultsJson: event.target.value }))
              }
            />
            <button type="submit" className="primary-button" disabled={actionBusy}>
              Harvest market feed
            </button>
          </form>
        </article>

        <article className="ingest-section">
          <h3>Built-in templates</h3>
          <p>These demo packs mirror the exact multi-source workflow from your problem brief.</p>

          <div className="template-list">
            <div>
              <strong>Municipal templates</strong>
              {(connectorTemplates.municipal || []).map((template) => (
                <small key={template.id}>
                  {template.label} · {template.sourceType}
                  {template.kind ? ` · ${template.kind}` : ""}
                </small>
              ))}
            </div>

            <div>
              <strong>Market templates</strong>
              {(connectorTemplates.market || []).map((template) => (
                <small key={template.id}>
                  {template.label} · {template.provider}
                  {template.kind ? ` · ${template.kind}` : ""}
                </small>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default HarvesterPanel;
