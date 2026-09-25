import { useEffect, useMemo, useState } from "react";

function AutocompleteInput({ value, onChange, options, onRemove, showRemove, isDuplicate }) {
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => o.toLowerCase().startsWith(q) && o.toLowerCase() !== q)
      .slice(0, 8);
  }, [value, options]);

  return (
    <div className={`elevation-row${isDuplicate ? " duplicate" : ""}`}>
      <input
        type="text"
        placeholder="Elevation name (e.g. North, East Pool Side)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
      />
      {showRemove && (
        <button className="remove" onClick={onRemove} type="button">
          ✕
        </button>
      )}
      {isDuplicate && (
        <p className="duplicate-msg">✕ Already added for this building</p>
      )}
      {focused && matches.length > 0 && (
        <div className="suggestions">
          {matches.map((m) => (
            <div key={m} onMouseDown={() => onChange(m)}>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectPicker({ projects, value, onSelect }) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const selected = projects.find((p) => p.id === value);
    setQuery(selected ? selected.name : "");
  }, [value, projects]);

  const filtered =
    query.trim() === ""
      ? projects
      : projects.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );

  function handleInputChange(e) {
    const v = e.target.value;
    setQuery(v);
    setShowDropdown(true);
    if (v.trim() === "") onSelect("");
  }

  function handleSelect(p) {
    setQuery(p.name);
    setShowDropdown(false);
    onSelect(p.id);
  }

  return (
    <div className="project-picker">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder="Search projects…"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="suggestions project-suggestions">
          {filtered.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => handleSelect(p)}
              className={`project-option${p.opsLogCreated ? " done" : ""}`}
            >
              <span>{p.name}</span>
              {p.opsLogCreated && <span className="badge-done">Completed</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState("identify");
  const [error, setError] = useState("");

  const [submitterName, setSubmitterName] = useState("");

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [buildings, setBuildings] = useState([]);

  const [elevationOptions, setElevationOptions] = useState([]);

  const [expandedBuildingId, setExpandedBuildingId] = useState(null);
  const [buildingElevations, setBuildingElevations] = useState({});
  const [loadingElevationsFor, setLoadingElevationsFor] = useState(null);
  const [addingElevation, setAddingElevation] = useState(false);
  const [elevationRows, setElevationRows] = useState([""]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => setError("Could not load projects."));

    fetch("/api/elevation-options")
      .then((r) => r.json())
      .then((d) => setElevationOptions(d.options || []))
      .catch(() => {});
  }, []);

  async function loadBuildings(projectId) {
    setError("");
    try {
      const r = await fetch(`/api/buildings?projectId=${projectId}`);
      const d = await r.json();
      setBuildings(d.buildings || []);
    } catch {
      setError("Could not load buildings for that project.");
    }
  }

  async function handleProjectContinue() {
    if (!selectedProjectId) return;
    await loadBuildings(selectedProjectId);
    setStep("building");
  }

  async function loadElevationsForBuilding(buildingId) {
    setLoadingElevationsFor(buildingId);
    try {
      const r = await fetch(`/api/elevations?buildingId=${buildingId}`);
      const d = await r.json();
      setBuildingElevations((prev) => ({
        ...prev,
        [buildingId]: d.elevations || [],
      }));
    } catch {
      setError("Could not load existing elevations for that building.");
    } finally {
      setLoadingElevationsFor(null);
    }
  }

  function toggleBuilding(b) {
    setSubmitMessage("");
    setError("");
    setAddingElevation(false);
    if (expandedBuildingId === b.id) {
      setExpandedBuildingId(null);
      return;
    }
    setExpandedBuildingId(b.id);
    setElevationRows([""]);
    if (!buildingElevations[b.id]) {
      loadElevationsForBuilding(b.id);
    }
  }

  function openAddElevation() {
    setElevationRows([""]);
    setAddingElevation(true);
  }

  function cancelAddElevation() {
    setElevationRows([""]);
    setAddingElevation(false);
    setError("");
  }

  function updateRow(i, val) {
    setElevationRows((rows) => rows.map((r, idx) => (idx === i ? val : r)));
  }

  function addRow() {
    setElevationRows((rows) => [...rows, ""]);
  }

  function removeRow(i) {
    setElevationRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  function getDuplicateFlags(buildingId) {
    const existingNames = (buildingElevations[buildingId] || []).map((e) =>
      e.name.trim().toLowerCase()
    );
    const rowNamesLower = elevationRows.map((r) => r.trim().toLowerCase());

    return elevationRows.map((val) => {
      const v = val.trim().toLowerCase();
      if (!v) return false;
      const alreadyExists = existingNames.includes(v);
      const duplicatedInBatch =
        rowNamesLower.filter((x) => x === v).length > 1;
      return alreadyExists || duplicatedInBatch;
    });
  }

  async function handleSubmitElevations(building) {
    const names = elevationRows.map((r) => r.trim()).filter(Boolean);
    if (getDuplicateFlags(building.id).some(Boolean)) {
      setError("Remove or rename duplicate elevations before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSubmitMessage("");
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          buildingId: building.id,
          elevationNames: names,
          submittedBy: submitterName,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Submission failed");

      const baseMessage = names.length > 0 ? "Saved." : "Marked as reviewed.";
      setSubmitMessage(
        d.projectCompleted
          ? `${baseMessage} All buildings in this project are now complete.`
          : baseMessage
      );

      setElevationRows([""]);
      setAddingElevation(false);

      await loadElevationsForBuilding(building.id);
      await loadBuildings(selectedProjectId);
      fetch("/api/elevation-options")
        .then((res) => res.json())
        .then((dd) => setElevationOptions(dd.options || []))
        .catch(() => {});
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartOver() {
    setSelectedProjectId("");
    setExpandedBuildingId(null);
    setBuildingElevations({});
    setSubmitMessage("");
    setAddingElevation(false);
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
    setStep("identify");
  }

  const allBuildingsDone =
    buildings.length > 0 && buildings.every((b) => b.opsLogCreated);

  return (
    <div className="wrap">
      <h1>Ops Log — Elevations Intake</h1>
      <p className="sub">Capture elevations per building for a project.</p>
      {step === "building" && (
        <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
          <button className="btn-secondary" onClick={handleStartOver}>
            ← Back to project list
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {step === "identify" && (
        <>
          <label>Your name</label>
          <input
            type="text"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
          />
          <label>Project</label>
          <ProjectPicker
            projects={projects}
            value={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
          <div className="row">
            <button
              className="btn-primary"
              disabled={!selectedProjectId}
              onClick={handleProjectContinue}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === "building" && (
        <>
          <h2 className="section-heading">Buildings</h2>
          {allBuildingsDone && (
            <div className="banner">
              Every building in this project already has elevations logged.
            </div>
          )}
          <div className="building-list">
            {buildings.map((b) => {
              const isOpen = expandedBuildingId === b.id;
              const existing = buildingElevations[b.id];

              return (
                <div key={b.id} className="building-block">
                  <div
                    className="building-item"
                    onClick={() => toggleBuilding(b)}
                  >
                    <span>{b.name}</span>
                    {b.opsLogCreated && (
                      <span className="badge-done">Completed</span>
                    )}
                  </div>

                  {isOpen && (
                    <div className="building-sublist">
                      {loadingElevationsFor === b.id && (
                        <p className="muted">Loading elevations…</p>
                      )}

                      {existing && existing.length > 0 && (
                        <ul className="elevation-existing">
                          {existing.map((e) => (
                            <li key={e.id}>{e.name}</li>
                          ))}
                        </ul>
                      )}

                      {existing && existing.length === 0 && (
                        <p className="muted">No elevations logged yet.</p>
                      )}

                      {submitMessage && expandedBuildingId === b.id && (
                        <div className="banner">{submitMessage}</div>
                      )}

                      {!addingElevation ? (
                        <div className="row" style={{ marginTop: 0 }}>
                          <button
                            className="btn-secondary"
                            onClick={openAddElevation}
                            type="button"
                          >
                            + Add elevation
                          </button>
                          <button
                            className="btn-primary"
                            disabled={submitting}
                            onClick={() => handleSubmitElevations(b)}
                            type="button"
                          >
                            {submitting ? "Saving…" : "Submit"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="add-elevation-header">
                            Add new elevation(s)
                          </p>
                          {(() => {
                            const dupeFlags = getDuplicateFlags(b.id);
                            const hasDupe = dupeFlags.some(Boolean);
                            return (
                              <>
                                {elevationRows.map((val, i) => (
                                  <AutocompleteInput
                                    key={i}
                                    value={val}
                                    onChange={(v) => updateRow(i, v)}
                                    options={elevationOptions}
                                    onRemove={() => removeRow(i)}
                                    showRemove={elevationRows.length > 1}
                                    isDuplicate={dupeFlags[i]}
                                  />
                                ))}
                                <div className="row">
                                  <button
                                    className="btn-secondary"
                                    onClick={addRow}
                                    type="button"
                                  >
                                    + Another
                                  </button>
                                </div>
                                <div className="row">
                                  <button
                                    className="btn-primary"
                                    disabled={submitting || hasDupe}
                                    onClick={() => handleSubmitElevations(b)}
                                  >
                                    {submitting ? "Saving…" : "Submit"}
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    onClick={cancelAddElevation}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}