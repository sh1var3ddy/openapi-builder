// src/components/HeaderBuilder.jsx
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

/**
 * Manages components.headers (reusable header objects).
 * Each saved header produces:
 * components.headers[ key ] = {
 *   description?, style?, explode?, schema{ type, format?, enum?, min/max... }, example?
 * }
 */
export default function HeaderBuilder({
  reusableHeaders,
  setReusableHeaders,
  editingHeaders,
  setEditingHeaders,
}) {
  const startNew = () => {
    setEditingHeaders(prev => [
      ...prev,
      {
        id: uid(),
        __editId: null,
        key: "",              // components.headers key (e.g., CacheControlHeader)
        description: "",
        // serialization (optional in OAS Header Object)
        style: "",            // default "simple" if omitted
        explode: undefined,   // true/false/undefined
        // schema bits
        type: "string",
        format: "",
        enum: [],
        minLength: undefined,
        maxLength: undefined,
        pattern: "",
        minimum: undefined,
        maximum: undefined,
        example: "",          // optional sample value
      }
    ]);
  };

  const updateDraft = (idx, key, value) => {
    setEditingHeaders(prev => prev.map((h, i) => (i === idx ? { ...h, [key]: value } : h)));
  };

  const discardDraft = (idx) => setEditingHeaders(prev => prev.filter((_, i) => i !== idx));

  const submitDraft = (idx) => {
    const d = editingHeaders[idx];
    if (!d?.key) return alert("Header key is required (name under components.headers).");

    const packed = { ...d };
    delete packed.__editId;

    if (d.__editId) {
      setReusableHeaders(prev => prev.map(h => (h.id === d.__editId ? packed : h)));
    } else {
      setReusableHeaders(prev => [...prev, packed]);
    }
    discardDraft(idx);
  };

  const startEdit = (id) => {
    const h = reusableHeaders.find(x => x.id === id);
    if (!h) return;
    setEditingHeaders(prev => [
      ...prev,
      { ...JSON.parse(JSON.stringify(h)), __editId: id, id: uid() }
    ]);
  };

  const duplicate = (id) => {
    const h = reusableHeaders.find(x => x.id === id);
    if (!h) return;
    const copy = { ...JSON.parse(JSON.stringify(h)), id: uid(), key: `${h.key}_copy` };
    setReusableHeaders(prev => [...prev, copy]);
    setTimeout(() => startEdit(copy.id), 0);
  };

  const deleteSaved = (id) => {
    if (!confirm("Delete this reusable header?")) return;
    setReusableHeaders(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className={styles.schemaPanel}>
      <h3>Reusable Headers</h3>

      {/* Saved list */}
      {reusableHeaders?.length > 0 && (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Headers</div>
          {reusableHeaders.map((h) => (
            <div key={h.id} className={styles.savedRow}>
              <span className={styles.savedName}>{h.key}</span>
              <div className={styles.savedActions}>
                <button className={styles.addBtn} onClick={() => startEdit(h.id)}>Edit</button>
                <button className={styles.addBtn} onClick={() => duplicate(h.id)}>Duplicate</button>
                <button className={styles.inlineDeleteBtn} onClick={() => deleteSaved(h.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft editors */}
      {(editingHeaders || []).map((d, idx) => {
        const showStringValidations = d.type === "string";
        const showNumberValidations = d.type === "number" || d.type === "integer" || d.type === "double";

        return (
          <div key={d.id} className={styles.schemaBlock}>
            <div className={styles.fieldRow}>
              <input
                className={styles.metaInput}
                placeholder="Ref key (e.g., CacheControlHeader)"
                value={d.key}
                onChange={(e) => updateDraft(idx, "key", e.target.value)}
                title="Name under components.headers"
              />
              <button className={styles.inlineDeleteBtn} onClick={() => discardDraft(idx)}>Discard</button>
            </div>

            <input
              className={styles.metaInput}
              placeholder="Description (optional)"
              value={d.description || ""}
              onChange={(e) => updateDraft(idx, "description", e.target.value)}
            />

            {/* Serialization (optional) */}
            <div className={styles.fieldRow}>
              <input
                className={styles.metaInput}
                placeholder="style (optional, e.g., simple)"
                value={d.style || ""}
                onChange={(e) => updateDraft(idx, "style", e.target.value)}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!d.explode}
                  onChange={(e) => updateDraft(idx, "explode", e.target.checked)}
                />
                explode
              </label>
              <input
                className={styles.metaInput}
                placeholder="example (optional)"
                value={d.example || ""}
                onChange={(e) => updateDraft(idx, "example", e.target.value)}
              />
            </div>

            {/* Schema */}
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
            </div>

            {/* Enum */}
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
            <div className={styles.fieldRow}>
              {showStringValidations && (
                <>
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
                </>
              )}

              {showNumberValidations && (
                <>
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
                </>
              )}
            </div>

            <button className={styles.saveBtn} onClick={() => submitDraft(idx)}>
              {d.__editId ? "💾 Update Header" : "✅ Save Header"}
            </button>
          </div>
        );
      })}

      <button className={styles.addBtn} onClick={startNew}>+ New Header</button>
    </div>
  );
}
