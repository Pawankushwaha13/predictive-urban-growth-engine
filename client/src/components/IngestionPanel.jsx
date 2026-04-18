import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

const SectionShell = ({ title, subtitle, children }) => (
  <article className="ingest-section">
    <div className="section-head compact">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
    {children}
  </article>
);

const FileDrop = ({ accept, files, onDrop, helperText, multiple = false }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple,
    onDrop,
  });

  const label = useMemo(() => {
    if (!files.length) {
      return helperText;
    }

    return files.map((file) => file.name).join(", ");
  }, [files, helperText]);

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
      <input {...getInputProps()} />
      <strong>{multiple ? "Drop files here" : "Drop file here"}</strong>
      <span>{label}</span>
    </div>
  );
};

const IngestionPanel = ({
  actionBusy,
  onStructuredUpload,
  onImageUpload,
  onMongoSync,
  onS3Sync,
}) => {
  const [structuredFiles, setStructuredFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);

  const [structuredForm, setStructuredForm] = useState({
    sourceDataset: "",
    defaultSourceType: "HUMINT",
    defaultsJson: "",
    fieldMapJson: "",
  });

  const [imageForm, setImageForm] = useState({
    titlePrefix: "",
    sourceDataset: "",
    locationName: "",
    latitude: "",
    longitude: "",
    description: "",
    confidence: "70",
    tags: "",
    metadataJson: "",
  });

  const [mongoForm, setMongoForm] = useState({
    uri: "",
    database: "",
    collection: "",
    limit: "100",
  });

  const [s3Form, setS3Form] = useState({
    region: "",
    bucket: "",
    prefix: "",
    limit: "50",
    defaultsJson: "",
  });

  const submitStructured = async (event) => {
    event.preventDefault();
    if (!structuredFiles[0]) {
      return;
    }

    const formData = new FormData();
    formData.append("file", structuredFiles[0]);
    formData.append("sourceDataset", structuredForm.sourceDataset);
    formData.append("defaultSourceType", structuredForm.defaultSourceType);

    if (structuredForm.defaultsJson.trim()) {
      formData.append("defaults", structuredForm.defaultsJson);
    }

    if (structuredForm.fieldMapJson.trim()) {
      formData.append("fieldMap", structuredForm.fieldMapJson);
    }

    await onStructuredUpload(formData);
    setStructuredFiles([]);
  };

  const submitImages = async (event) => {
    event.preventDefault();
    if (!imageFiles.length) {
      return;
    }

    const formData = new FormData();
    imageFiles.forEach((file) => formData.append("images", file));

    Object.entries({
      titlePrefix: imageForm.titlePrefix,
      sourceDataset: imageForm.sourceDataset,
      locationName: imageForm.locationName,
      latitude: imageForm.latitude,
      longitude: imageForm.longitude,
      description: imageForm.description,
      confidence: imageForm.confidence,
      tags: imageForm.tags,
    }).forEach(([key, value]) => formData.append(key, value));

    if (imageForm.metadataJson.trim()) {
      formData.append("metadata", imageForm.metadataJson);
    }

    await onImageUpload(formData);
    setImageFiles([]);
  };

  const submitMongo = async (event) => {
    event.preventDefault();
    await onMongoSync({
      uri: mongoForm.uri || undefined,
      database: mongoForm.database,
      collection: mongoForm.collection,
      limit: Number(mongoForm.limit) || 100,
    });
  };

  const submitS3 = async (event) => {
    event.preventDefault();
    await onS3Sync({
      region: s3Form.region || undefined,
      bucket: s3Form.bucket,
      prefix: s3Form.prefix,
      limit: Number(s3Form.limit) || 50,
      defaults: s3Form.defaultsJson.trim() ? JSON.parse(s3Form.defaultsJson) : {},
    });
  };

  return (
    <section className="ingestion-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Fusion Intake</span>
          <h2>Connect, Drag, and Ingest</h2>
        </div>
      </div>

      <div className="ingestion-grid">
        <SectionShell
          title="Manual HUMINT / OSINT"
          subtitle="CSV, XLSX, or JSON with latitude/longitude columns."
        >
          <form onSubmit={submitStructured} className="ingest-form">
            <FileDrop
              accept={{
                "text/csv": [".csv"],
                "application/json": [".json"],
                "application/vnd.ms-excel": [".xls"],
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
              }}
              files={structuredFiles}
              onDrop={setStructuredFiles}
              helperText="Drop a CSV, Excel, or JSON intelligence file"
            />
            <input
              type="text"
              placeholder="Dataset label"
              value={structuredForm.sourceDataset}
              onChange={(event) =>
                setStructuredForm((current) => ({
                  ...current,
                  sourceDataset: event.target.value,
                }))
              }
            />
            <select
              value={structuredForm.defaultSourceType}
              onChange={(event) =>
                setStructuredForm((current) => ({
                  ...current,
                  defaultSourceType: event.target.value,
                }))
              }
            >
              <option value="HUMINT">Default HUMINT</option>
              <option value="OSINT">Default OSINT</option>
              <option value="IMINT">Default IMINT</option>
            </select>
            <textarea
              rows="3"
              placeholder='Defaults JSON, e.g. {"latitude":28.6,"longitude":77.2}'
              value={structuredForm.defaultsJson}
              onChange={(event) =>
                setStructuredForm((current) => ({
                  ...current,
                  defaultsJson: event.target.value,
                }))
              }
            />
            <textarea
              rows="3"
              placeholder='Field map JSON, e.g. {"latitude":"lat","longitude":"lon"}'
              value={structuredForm.fieldMapJson}
              onChange={(event) =>
                setStructuredForm((current) => ({
                  ...current,
                  fieldMapJson: event.target.value,
                }))
              }
            />
            <button type="submit" className="primary-button" disabled={actionBusy}>
              Ingest structured file
            </button>
          </form>
        </SectionShell>

        <SectionShell
          title="IMINT Upload"
          subtitle="Upload JPG, JPEG, or PNG imagery and stamp coordinates onto the map."
        >
          <form onSubmit={submitImages} className="ingest-form">
            <FileDrop
              accept={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
              }}
              files={imageFiles}
              onDrop={setImageFiles}
              helperText="Drop imagery files for direct indexing"
              multiple
            />
            <input
              type="text"
              placeholder="Title prefix"
              value={imageForm.titlePrefix}
              onChange={(event) =>
                setImageForm((current) => ({ ...current, titlePrefix: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Dataset label"
              value={imageForm.sourceDataset}
              onChange={(event) =>
                setImageForm((current) => ({ ...current, sourceDataset: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Location name"
              value={imageForm.locationName}
              onChange={(event) =>
                setImageForm((current) => ({ ...current, locationName: event.target.value }))
              }
            />
            <div className="two-up">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={imageForm.latitude}
                onChange={(event) =>
                  setImageForm((current) => ({ ...current, latitude: event.target.value }))
                }
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={imageForm.longitude}
                onChange={(event) =>
                  setImageForm((current) => ({ ...current, longitude: event.target.value }))
                }
              />
            </div>
            <textarea
              rows="3"
              placeholder="Description"
              value={imageForm.description}
              onChange={(event) =>
                setImageForm((current) => ({ ...current, description: event.target.value }))
              }
            />
            <div className="two-up">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Confidence"
                value={imageForm.confidence}
                onChange={(event) =>
                  setImageForm((current) => ({ ...current, confidence: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Tags, comma separated"
                value={imageForm.tags}
                onChange={(event) =>
                  setImageForm((current) => ({ ...current, tags: event.target.value }))
                }
              />
            </div>
            <textarea
              rows="3"
              placeholder='Optional per-file metadata JSON keyed by filename, e.g. {"image1.jpg":{"latitude":28.6,"longitude":77.2}}'
              value={imageForm.metadataJson}
              onChange={(event) =>
                setImageForm((current) => ({ ...current, metadataJson: event.target.value }))
              }
            />
            <button type="submit" className="primary-button" disabled={actionBusy}>
              Upload imagery
            </button>
          </form>
        </SectionShell>

        <SectionShell
          title="MongoDB OSINT Sync"
          subtitle="Pull documents from a cloud or local MongoDB collection."
        >
          <form onSubmit={submitMongo} className="ingest-form">
            <input
              type="text"
              placeholder="Mongo URI (optional if set in .env)"
              value={mongoForm.uri}
              onChange={(event) =>
                setMongoForm((current) => ({ ...current, uri: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Database"
              value={mongoForm.database}
              onChange={(event) =>
                setMongoForm((current) => ({ ...current, database: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Collection"
              value={mongoForm.collection}
              onChange={(event) =>
                setMongoForm((current) => ({ ...current, collection: event.target.value }))
              }
            />
            <input
              type="number"
              min="1"
              placeholder="Limit"
              value={mongoForm.limit}
              onChange={(event) =>
                setMongoForm((current) => ({ ...current, limit: event.target.value }))
              }
            />
            <button type="submit" className="secondary-button" disabled={actionBusy}>
              Sync MongoDB source
            </button>
          </form>
        </SectionShell>

        <SectionShell
          title="AWS S3 Sync"
          subtitle="Index JSON, CSV, Excel, or imagery objects directly from S3."
        >
          <form onSubmit={submitS3} className="ingest-form">
            <input
              type="text"
              placeholder="AWS region"
              value={s3Form.region}
              onChange={(event) =>
                setS3Form((current) => ({ ...current, region: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Bucket"
              value={s3Form.bucket}
              onChange={(event) =>
                setS3Form((current) => ({ ...current, bucket: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Prefix"
              value={s3Form.prefix}
              onChange={(event) =>
                setS3Form((current) => ({ ...current, prefix: event.target.value }))
              }
            />
            <input
              type="number"
              min="1"
              placeholder="Limit"
              value={s3Form.limit}
              onChange={(event) =>
                setS3Form((current) => ({ ...current, limit: event.target.value }))
              }
            />
            <textarea
              rows="3"
              placeholder='Defaults JSON for S3 imagery metadata, e.g. {"latitude":26.9,"longitude":75.78}'
              value={s3Form.defaultsJson}
              onChange={(event) =>
                setS3Form((current) => ({ ...current, defaultsJson: event.target.value }))
              }
            />
            <button type="submit" className="secondary-button" disabled={actionBusy}>
              Sync S3 source
            </button>
          </form>
        </SectionShell>
      </div>
    </section>
  );
};

export default IngestionPanel;

