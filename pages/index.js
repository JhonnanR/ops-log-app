import { useEffect, useMemo, useState } from "react";

const emptyRow = () => ({ name: "", page: "", sq: "" });
const round2 = (n) => Math.round(n * 100) / 100;
const toNumber = (v) => Number(String(v).replace(/[,%]/g, "").trim());

function AutocompleteInput({
  row,
  onChange,
  options,
  onRemove,
  showRemove,
  isDuplicate,
  remaining,
  over,
  buildingSq,
}) {
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const q = row.name.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => o.toLowerCase().startsWith(q) && o.toLowerCase() !== q)
      .slice(0, 8);
  }, [row.name, options]);

  const pctNum = toNumber(row.sq);
  const showFootage =
    buildingSq !== null &&
    buildingSq !== undefined &&
    row.sq.trim() !== "" &&
    Number.isFinite(pctNum);

  return (
    <div className={`elevation-row${isDuplicate ? " duplicate" : ""}`}>
      <div className="fields">
        <input
          className="name-input"
          type="text"
          placeholder="Elevation name (e.g. North, East Pool Side)"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
        />
        {showRemove && (
          <button className="remove" onClick={onRemove} type="button">
            ✕
          </button>
        )}
      </div>
      {focused && matches.length > 0 && (
        <div className="suggestions">
          {matches.map((m) => (
            <div key={m} onMouseDown={() => onChange({ name: m })}>
              {m}
            </div>
          ))}
        </div>
      )}
      <div className="fields sub">
        <div className="col">
          <input
            className="page-input"
            type="text"
            placeholder="Page (e.g. [A-203])"
            value={row.page}
            onChange={(e) => onChange({ page: e.target.value })}
          />
        </div>
        <div className="col">
          <input
            className="sq-input"
            type="text"
            inputMode="decimal"
            placeholder="SQ. % (e.g. 25)"
            value={row.sq}
            onChange={(e) => onChange({ sq: e.target.value })}
          />
          <p className={`remaining${over ? " over" : ""}`}>
            {over
              ? `Over by ${round2(-remaining)}%`
              : `Percent of SQ available: ${remaining}%`}
          </p>
          {showFootage && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b6b6b" }}>
              ≈ {round2((pctNum / 100) * buildingSq).toLocaleString()} SQ.
            </p>
          )}
        </div>
      </div>
      {isDuplicate && (
        <p className="duplicate-msg">✕ Already added for this building</p>
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
        placeholder="Search for project…"
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
  const [elevationRows, setElevationRows] = useState([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // Edits to percentages of already-saved elevations: { [elevationId]: "text" }
  const [editValues, setEditValues] = useState({});
  const [savingEditId, setSavingEditId] = useState(null);

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
    setEditValues({});
    if (expandedBuildingId === b.id) {
      setExpandedBuildingId(null);
      setAddingElevation(false);
      return;
    }
    setExpandedBuildingId(b.id);
    setElevationRows([emptyRow()]);
    setAddingElevation(true);
    if (!buildingElevations[b.id]) {
      loadElevationsForBuilding(b.id);
    }
  }

  function collapseAll() {
    setExpandedBuildingId(null);
    setAddingElevation(false);
    setElevationRows([emptyRow()]);
    setEditValues({});
    setSubmitMessage("");
    setError("");
  }

  function openAddElevation() {
    setElevationRows([emptyRow()]);
    setAddingElevation(true);
  }

  function cancelAddElevation() {
    setElevationRows([emptyRow()]);
    setAddingElevation(false);
    setError("");
  }

  function updateRow(i, patch) {
    setElevationRows((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    setElevationRows((rows) => [...rows, emptyRow()]);
  }

  function removeRow(i) {
    setElevationRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  function getDuplicateFlags(buildingId) {
    const existingNames = (buildingElevations[buildingId] || []).map((e) =>
      e.name.trim().toLowerCase()
    );
    const rowNamesLower = elevationRows.map((r) => r.name.trim().toLowerCase());

    return elevationRows.map((row) => {
      const v = row.name.trim().toLowerCase();
      if (!v) return false;
      const alreadyExists = existingNames.includes(v);
      const duplicatedInBatch =
        rowNamesLower.filter((x) => x === v).length > 1;
      return alreadyExists || duplicatedInBatch;
    });
  }

  // How much of the building's 100% is used (saved + typed now) and what
  // is left. Going over 100 is allowed; it is only shown.
  function getPercentInfo(buildingId) {
    const savedTotal = (buildingElevations[buildingId] || []).reduce(
      (sum, e) => sum + (Number(e.pct) || 0),
      0
    );

    const entries = elevationRows
      .map((r) => ({
        name: r.name.trim(),
        page: r.page.trim(),
        sq: r.sq.trim(),
      }))
      .filter((r) => r.name);

    const invalid = entries.find(
      (r) =>
        r.sq !== "" && (!Number.isFinite(toNumber(r.sq)) || toNumber(r.sq) <= 0)
    );

    const newTotal = elevationRows.reduce((sum, r) => {
      const raw = r.sq.trim();
      const v = toNumber(raw);
      return sum + (raw !== "" && Number.isFinite(v) ? v : 0);
    }, 0);

    const total = round2(savedTotal + newTotal);

    return {
      entries,
      invalid,
      total,
      remaining: round2(100 - total),
      over: total > 100,
    };
  }

  async function handleSubmitElevations(building) {
    const info = getPercentInfo(building.id);
    const entries = info.entries;

    if (getDuplicateFlags(building.id).some(Boolean)) {
      setError("Remove or rename duplicate elevations before submitting.");
      return;
    }

    if (entries.length > 0 && info.invalid) {
      setError(
        `The percentage for "${info.invalid.name}" must be a number greater than 0.`
      );
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
          elevations: entries.map((x) => ({
            name: x.name,
            page: x.page,
            sq: x.sq === "" ? null : toNumber(x.sq),
          })),
          submittedBy: submitterName,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Submission failed");

      const baseMessage = entries.length > 0 ? "Saved." : "Marked as reviewed.";
      setSubmitMessage(
        d.projectCompleted
          ? `${baseMessage} All buildings in this project are now complete.`
          : baseMessage
      );

      setElevationRows([emptyRow()]);
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

  function savedEditText(e) {
    return e.pct === null || e.pct === undefined ? "" : String(e.pct);
  }

  function isEdited(e) {
    return (
      editValues[e.id] !== undefined &&
      editValues[e.id].trim() !== savedEditText(e)
    );
  }

  async function saveElevationPercent(buildingId, e) {
    const raw = (editValues[e.id] ?? "").trim();
    if (raw !== "") {
      const n = toNumber(raw);
      if (!Number.isFinite(n) || n < 0) {
        setError(`The percentage for "${e.name}" must be a number.`);
        return;
      }
    }

    setSavingEditId(e.id);
    setError("");
    setSubmitMessage("");
    try {
      const r = await fetch("/api/update-elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elevationId: e.id,
          buildingId,
          sq: raw === "" ? null : toNumber(raw),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");

      setEditValues((prev) => {
        const next = { ...prev };
        delete next[e.id];
        return next;
      });
      await loadElevationsForBuilding(buildingId);
      setSubmitMessage("Percentage updated.");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSavingEditId(null);
    }
  }

  function handleStartOver() {
    setSelectedProjectId("");
    setExpandedBuildingId(null);
    setBuildingElevations({});
    setEditValues({});
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
          {!selectedProjectId && (
            <p className="hint">
              Click the Project box above and choose a project from the list to
              continue.
            </p>
          )}
        </>
      )}

      {step === "building" && (
        <>
          <div className="section-header">
            <h2 className="section-heading">Buildings</h2>
            <button
              className="btn-secondary btn-small"
              onClick={collapseAll}
              disabled={!expandedBuildingId}
              type="button"
            >
              Collapse all
            </button>
          </div>
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
                    <span className="building-right">
                      {b.opsLogCreated && (
                        <span className="badge-done">Completed</span>
                      )}
                      <span className={`chevron${isOpen ? " open" : ""}`}>▾</span>
                    </span>
                  </div>

                  {isOpen && (
                    <div className="building-sublist">
                      {loadingElevationsFor === b.id && (
                        <p className="muted">Loading elevations…</p>
                      )}

                      {existing && existing.length > 0 && (
                        <ul className="elevation-existing">
                          {existing.map((e) => (
                            <li key={e.id}>
                              <span>{e.name}</span>
                              <span className="tags">
                                {e.page && (
                                  <span className="page-tag">Page {e.page}</span>
                                )}
                                {e.sq !== null && e.sq !== undefined && (
                                  <span className="page-tag">
                                    {Number(e.sq).toLocaleString()} SQ.
                                  </span>
                                )}
                                <span className="pct-edit">
                                  <input
                                    className="pct-input"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="%"
                                    value={
                                      editValues[e.id] !== undefined
                                        ? editValues[e.id]
                                        : savedEditText(e)
                                    }
                                    onChange={(ev) =>
                                      setEditValues((prev) => ({
                                        ...prev,
                                        [e.id]: ev.target.value,
                                      }))
                                    }
                                  />
                                  <span className="pct-sign">%</span>
                                  {isEdited(e) && (
                                    <button
                                      className="btn-primary btn-tiny"
                                      type="button"
                                      disabled={savingEditId === e.id}
                                      onClick={() =>
                                        saveElevationPercent(b.id, e)
                                      }
                                    >
                                      {savingEditId === e.id ? "…" : "Save"}
                                    </button>
                                  )}
                                </span>
                              </span>
                            </li>
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
                            const info = getPercentInfo(b.id);
                            const percentOk =
                              info.entries.length === 0 || !info.invalid;
                            return (
                              <>
                                {elevationRows.map((row, i) => (
                                  <AutocompleteInput
                                    key={i}
                                    row={row}
                                    onChange={(patch) => updateRow(i, patch)}
                                    options={elevationOptions}
                                    onRemove={() => removeRow(i)}
                                    showRemove={elevationRows.length > 1}
                                    isDuplicate={dupeFlags[i]}
                                    remaining={info.remaining}
                                    over={info.over}
                                    buildingSq={b.sqGross}
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
                                    disabled={submitting || hasDupe || !percentOk}
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