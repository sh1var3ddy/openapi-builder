// src/components/ParameterBuilder.jsx
import styles from "./Canvas.module.css";

const STRING_FORMATS = ["", "date-time", "date", "uuid", "email", "uri", "hostname", "ipv4", "ipv6", "byte", "binary", "password"];
const INTEGER_FORMATS = ["", "int32", "int64"];
const NUMBER_FORMATS  = ["", "float", "double"];
const BOOLEAN_FORMATS = [""];

function formatOptionsFor(type) {
  switch (type) {
    case "string":  return STRING_FORMATS;
    case "integer": return INTEGER_FORMATS;
    case "number":  return NUMBER_FORMATS;
    case "double":  return NUMBER_FORMATS;
    case "boolean": return BOOLEAN_FORMATS;
    default:        return [""];
  }
}

const uid = () => Math.random().toString(36).slice(2, 9);

export default function ParameterBuilder({
  reusableParams,
  setReusableParams,
  editingParams,
  setEditingParams,
}) {
  const startNew = () => {
    setEditingParams(prev => [
      ...prev,
      {
        id: uid(),
        __editId: null,          // when set, editing an existing saved param
        key: "",                 // components.parameters key (e.g., limitParam)
        name: "",                // actual parameter name (e.g., limit)
        in: "query",             // query | path | header | cookie
        required: false,
        description: "",
        type: "string",
        format: "",
        enum: [],
        // validations
        minLength: undefined,
        maxLength: undefined,
        pattern: "",
        minimum: undefined,
        maximum: undefined,
        // serialization
        style: "",
        explode: true,
      }
    ]);
  };

  const updateDraft = (idx, key, value) => {
    setEditingParams(prev => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  };

  const discardDraft = (idx) => {
    setEditingParams(prev => prev.filter((_, i) => i !== idx));
  };

  const submitDraft = (idx) => {
    const d = editingParams[idx];
    if (!d?.key) return alert("Parameter key is required (the reusable name under components.parameters).");
    if (!d?.name) return alert("Parameter 'name' is required (the actual param name).");
    if (!d?.in) return alert("Parameter 'in' is required.");

    const packed = { ...d };
    delete packed.__editId;

    if (d.__editId) {
      // update saved
      setReusableParams(prev => prev.map(p => (p.id === d.__editId ? packed : p)));
    } else {
      // new saved
      setReusableParams(prev => [...prev, packed]);
    }
    discardDraft(idx);
  };

  const startEdit = (id) => {
    const p = reusableParams.find(x => x.id === id);
    if (!p) return;
    setEditingParams(prev => [
      ...prev,
      { ...JSON.parse(JSON.stringify(p)), __editId: id, id: uid() }
    ]);
  };

  const duplicate = (id) => {
    const p = reusableParams.find(x => x.id === id);
    if (!p) return;
    const copy = { ...JSON.parse(JSON.stringify(p)), id: uid(), key: `${p.key}_copy` };
    setReusableParams(prev => [...prev, copy]);
    setTimeout(() => startEdit(copy.id), 0);
  };

  const deleteSaved = (id) => {
    if (!confirm("Delete this reusable parameter?")) return;
    setReusableParams(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className={styles.schemaPanel}>
      <h3>Reusable Parameters</h3>

      {/* Saved list */}
      {reusableParams?.length > 0 && (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Parameters</div>
          {reusableParams.map((p) => (
            <div key={p.id} className={styles.savedRow}>
              <span className={styles.savedName}>
                {p.key} <span style={{ color: "#64748b" }}>({p.in} {p.name})</span>
              </span>
              <div className={styles.savedActions}>
                <button className={styles.addBtn} onClick={() => startEdit(p.id)}>Edit</button>
                <button className={styles.addBtn} onClick={() => duplicate(p.id)}>Duplicate</button>
                <button className={styles.inlineDeleteBtn} onClick={() => deleteSaved(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft editors */}
      {(editingParams || []).map((d, idx) => {
        const showStringValidations = d.type === "string";
        const showNumberValidations = d.type === "number" || d.type === "integer" || d.type === "double";

        return (
          <div key={d.id} className={styles.schemaBlock}>
            <div className={styles.fieldRow}>
              <input
                className={styles.metaInput}
                placeholder="Ref key (e.g., limitParam)"
                value={d.key}
                onChange={(e) => updateDraft(idx, "key", e.target.value)}
                title="Name under components.parameters"
              />
              <input
                className={styles.metaInput}
                placeholder="Name (e.g., limit)"
                value={d.name}
                onChange={(e) => updateDraft(idx, "name", e.target.value)}
                title="Actual parameter name used in requests"
              />
              <select
                className={styles.metaInput}
                value={d.in}
                onChange={(e) => updateDraft(idx, "in", e.target.value)}
                title="Location"
              >
                <option value="query">query</option>
                <option value="path">path</option>
                <option value="header">header</option>
                <option value="cookie">cookie</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!d.required}
                  onChange={(e) => updateDraft(idx, "required", e.target.checked)}
                />
                Required
              </label>
              <button className={styles.inlineDeleteBtn} onClick={() => discardDraft(idx)}>Discard</button>
            </div>

            <input
              className={styles.metaInput}
              placeholder="Description"
              value={d.description || ""}
              onChange={(e) => updateDraft(idx, "description", e.target.value)}
            />

            <div className={styles.fieldRow}>
              <select
                className={styles.metaInput}
                value={d.type}
                onChange={(e) => updateDraft(idx, "type", e.target.value)}
              >
                <option value="string">string</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
                <option value="number">number</option>
                <option value="double">double</option>
              </select>

              <select
                className={styles.metaInput}
                value={d.format || ""}
                onChange={(e) => updateDraft(idx, "format", e.target.value)}
                title="Format (optional)"
              >
                {formatOptionsFor(d.type === "double" ? "double" : d.type).map((opt) => (
                  <option key={opt || "none"} value={opt}>{opt || "— format —"}</option>
                ))}
              </select>

              <input
                className={styles.metaInput}
                placeholder="style (optional) — e.g., form, simple"
                value={d.style || ""}
                onChange={(e) => updateDraft(idx, "style", e.target.value)}
                title="Parameter serialization style"
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!d.explode}
                  onChange={(e) => updateDraft(idx, "explode", e.target.checked)}
                />
                explode
              </label>
            </div>

            {/* Enums */}
            <div className={styles.enumEditor}>
              <div className={styles.enumHeader}>
                <span>Enum values (optional)</span>
                <button
                  className={styles.addBtn}
                  onClick={() => updateDraft(idx, "enum", [...(d.enum || []), ""])}
                >
                  + Add Value
                </button>
              </div>
              <div className={styles.enumList}>
                {(d.enum || []).map((val, eIdx) => (
                  <div key={eIdx} className={styles.enumItem}>
                    <input
                      className={styles.metaInput}
                      value={val}
                      onChange={(e) => {
                        const next = [...(d.enum || [])];
                        next[eIdx] = e.target.value;
                        updateDraft(idx, "enum", next);
                      }}
                      placeholder={`Value ${eIdx + 1}`}
                    />
                    <button
                      className={styles.deleteBtn}
                      onClick={() => {
                        const next = [...(d.enum || [])];
                        next.splice(eIdx, 1);
                        updateDraft(idx, "enum", next);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Validations */}
            {showStringValidations && (
              <div className={styles.fieldRow}>
                <input
                  className={styles.metaInput}
                  type="number"
                  placeholder="minLength"
                  value={d.minLength ?? ""}
                  onChange={(e) =>
                    updateDraft(idx, "minLength", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
                <input
                  className={styles.metaInput}
                  type="number"
                  placeholder="maxLength"
                  value={d.maxLength ?? ""}
                  onChange={(e) =>
                    updateDraft(idx, "maxLength", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
                <input
                  className={styles.metaInput}
                  placeholder="pattern (regex)"
                  value={d.pattern || ""}
                  onChange={(e) => updateDraft(idx, "pattern", e.target.value)}
                />
              </div>
            )}

            {showNumberValidations && (
              <div className={styles.fieldRow}>
                <input
                  className={styles.metaInput}
                  type="number"
                  placeholder="minimum"
                  value={d.minimum ?? ""}
                  onChange={(e) =>
                    updateDraft(idx, "minimum", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
                <input
                  className={styles.metaInput}
                  type="number"
                  placeholder="maximum"
                  value={d.maximum ?? ""}
                  onChange={(e) =>
                    updateDraft(idx, "maximum", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
              </div>
            )}

            <button className={styles.saveBtn} onClick={() => submitDraft(idx)}>
              {d.__editId ? "💾 Update Parameter" : "✅ Save Parameter"}
            </button>
          </div>
        );
      })}

      <button className={styles.addBtn} onClick={startNew}>+ New Parameter</button>
    </div>
  );
}
