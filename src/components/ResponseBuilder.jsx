// src/components/ResponseBuilder.jsx
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
 * Manages components.responses
 * Draft shape:
 * {
 *   id, __editId?, key, description, mediaType,
 *   schemaMode: 'none' | 'primitive' | 'ref',
 *   primitiveType, primitiveFormat, refName,
 *   headers: [
 *     {
 *       id, name, mode: 'ref' | 'inline',
 *       refName?, description?,
 *       type?, format?, enum?: string[],
 *       minLength?, maxLength?, pattern?,
 *       minimum?,  maximum?
 *     }
 *   ]
 * }
 */
export default function ResponseBuilder({
  reusableResponses,
  setReusableResponses,
  editingResponses,
  setEditingResponses,
  schemas,
  reusableHeaders,             // 👈 dropdown source
}) {
  const startNew = () => {
    setEditingResponses(prev => [
      ...prev,
      {
        id: uid(),
        __editId: null,
        key: "",
        description: "",
        mediaType: "application/json",
        schemaMode: "none",
        primitiveType: "string",
        primitiveFormat: "",
        refName: "",
        headers: [],          // header entries (inline or ref)
      }
    ]);
  };

  const updateDraft = (idx, key, value) => {
    setEditingResponses(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const discardDraft = (idx) => {
    setEditingResponses(prev => prev.filter((_, i) => i !== idx));
  };

  const submitDraft = (idx) => {
    const d = editingResponses[idx];
    if (!d?.key) return alert("Response key is required (name under components.responses).");

    const packed = { ...d };
    delete packed.__editId;

    if (d.__editId) {
      setReusableResponses(prev => prev.map(r => (r.id === d.__editId ? packed : r)));
    } else {
      setReusableResponses(prev => [...prev, packed]);
    }
    discardDraft(idx);
  };

  const startEdit = (id) => {
    const r = reusableResponses.find(x => x.id === id);
    if (!r) return;
    setEditingResponses(prev => [
      ...prev,
      { ...JSON.parse(JSON.stringify(r)), __editId: id, id: uid() }
    ]);
  };

  const duplicate = (id) => {
    const r = reusableResponses.find(x => x.id === id);
    if (!r) return;
    const copy = { ...JSON.parse(JSON.stringify(r)), id: uid(), key: `${r.key}_copy` };
    setReusableResponses(prev => [...prev, copy]);
    setTimeout(() => startEdit(copy.id), 0);
  };

  const deleteSaved = (id) => {
    if (!confirm("Delete this reusable response?")) return;
    setReusableResponses(prev => prev.filter(r => r.id !== id));
  };

  // ----- Headers inside a response draft -----
  const addHeader = (idx) => {
    const h = {
      id: uid(),
      name: "",        // the actual HTTP header field name in the response map
      mode: "ref",     // 'ref' | 'inline'
      refName: "",     // key under components.headers when mode='ref'
      description: "",
      type: "string",  // for inline
      format: "",
      enum: [],
      minLength: undefined,
      maxLength: undefined,
      pattern: "",
      minimum: undefined,
      maximum: undefined,
    };
    updateDraft(idx, "headers", [ ...(editingResponses[idx].headers || []), h ]);
  };

  const updateHeader = (idx, hIdx, key, value) => {
    const list = [ ...(editingResponses[idx].headers || []) ];
    list[hIdx] = { ...list[hIdx], [key]: value };

    // If switching to 'ref' and header name is blank, default name to ref key
    if (key === "refName" && list[hIdx].mode === "ref" && !list[hIdx].name) {
      list[hIdx].name = value || "";
    }

    updateDraft(idx, "headers", list);
  };

  const deleteHeader = (idx, hIdx) => {
    const list = [ ...(editingResponses[idx].headers || []) ];
    list.splice(hIdx, 1);
    updateDraft(idx, "headers", list);
  };

  return (
    <div className={styles.schemaPanel}>
      <h3>Reusable Responses</h3>

      {/* Saved list */}
      {reusableResponses?.length > 0 && (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Responses</div>
          {reusableResponses.map((r) => (
            <div key={r.id} className={styles.savedRow}>
              <span className={styles.savedName}>{r.key}</span>
              <div className={styles.savedActions}>
                <button className={styles.addBtn} onClick={() => startEdit(r.id)}>Edit</button>
                <button className={styles.addBtn} onClick={() => duplicate(r.id)}>Duplicate</button>
                <button className={styles.inlineDeleteBtn} onClick={() => deleteSaved(r.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft editors */}
      {(editingResponses || []).map((d, idx) => {
        const showPrimitive = d.schemaMode === "primitive";
        const showRef       = d.schemaMode === "ref";

        return (
          <div key={d.id} className={styles.schemaBlock}>
            <div className={styles.fieldRow}>
              <input
                className={styles.metaInput}
                placeholder="Ref key (e.g., ErrorBadRequest)"
                value={d.key}
                onChange={(e) => updateDraft(idx, "key", e.target.value)}
                title="Name under components.responses"
              />
              <button className={styles.inlineDeleteBtn} onClick={() => discardDraft(idx)}>Discard</button>
              {d.__editId && <span className={styles.editBadge}>Editing</span>}
            </div>

            <input
              className={styles.metaInput}
              placeholder="Description"
              value={d.description || ""}
              onChange={(e) => updateDraft(idx, "description", e.target.value)}
            />

            {/* Content schema mode */}
            <div className={styles.fieldRow}>
              <select
                className={styles.metaInput}
                value={d.schemaMode || "none"}
                onChange={(e) => updateDraft(idx, "schemaMode", e.target.value)}
                title="Response content schema"
              >
                <option value="none">No Content</option>
                <option value="primitive">Primitive</option>
                <option value="ref">Schema $ref</option>
              </select>

              {/* media type when content exists */}
              {d.schemaMode !== "none" && (
                <input
                  className={styles.metaInput}
                  placeholder="Media type (e.g., application/json)"
                  value={d.mediaType || "application/json"}
                  onChange={(e) => updateDraft(idx, "mediaType", e.target.value)}
                />
              )}
            </div>

            {/* Primitive schema config */}
            {showPrimitive && (
              <div className={styles.fieldRow}>
                <select
                  className={styles.metaInput}
                  value={d.primitiveType || "string"}
                  onChange={(e) => updateDraft(idx, "primitiveType", e.target.value)}
                >
                  <option value="string">string</option>
                  <option value="integer">integer</option>
                  <option value="boolean">boolean</option>
                  <option value="number">number</option>
                  <option value="double">double</option>
                </select>

                <select
                  className={styles.metaInput}
                  value={d.primitiveFormat || ""}
                  onChange={(e) => updateDraft(idx, "primitiveFormat", e.target.value)}
                >
                  {formatOptionsFor(d.primitiveType === "double" ? "double" : d.primitiveType || "string").map((opt) => (
                    <option key={opt || "none"} value={opt}>{opt || "— format —"}</option>
                  ))}
                </select>
              </div>
            )}

            {/* $ref schema config */}
            {showRef && (
              <div className={styles.fieldRow}>
                <select
                  className={styles.metaInput}
                  value={d.refName || ""}
                  onChange={(e) => updateDraft(idx, "refName", e.target.value)}
                  title="Pick a schema to reference"
                >
                  <option value="">-- Select Schema --</option>
                  {(schemas || []).map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Headers section */}
            <details className={styles.section} open>
              <summary className={styles.sectionSummary}>
                <span className={styles.sectionTitle}>Headers</span>
              </summary>
              <div className={styles.sectionBody}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Response headers</strong>
                  <button className={styles.addBtn} onClick={() => addHeader(idx)}>+ Add Header</button>
                </div>

                {(d.headers || []).length === 0 && (
                  <div className={styles.emptyMessage}>No headers added.</div>
                )}

                {(d.headers || []).map((h, hIdx) => {
                  const showStringValidations = h.type === "string";
                  const showNumberValidations = h.type === "number" || h.type === "integer" || h.type === "double";

                  return (
                    <div key={h.id} className={styles.schemaBlock} style={{ marginTop: 8 }}>
                      <div className={styles.fieldRow}>
                        <input
                          className={styles.metaInput}
                          placeholder='Header name (e.g., "Cache-Control")'
                          value={h.name}
                          onChange={(e) => updateHeader(idx, hIdx, "name", e.target.value)}
                          title="Map key under responses[*].headers"
                        />

                        <select
                          className={styles.metaInput}
                          value={h.mode || "ref"}
                          onChange={(e) => updateHeader(idx, hIdx, "mode", e.target.value)}
                        >
                          <option value="ref">Reference (components.headers)</option>
                          <option value="inline">Inline schema</option>
                        </select>

                        <button className={styles.inlineDeleteBtn} onClick={() => deleteHeader(idx, hIdx)}>✕</button>
                      </div>

                      {/* Reference picker */}
                      {h.mode === "ref" && (
                        <div className={styles.fieldRow}>
                          <select
                            className={styles.metaInput}
                            value={h.refName || ""}
                            onChange={(e) => updateHeader(idx, hIdx, "refName", e.target.value)}
                            title="Pick a reusable header"
                          >
                            <option value="">-- Select Reusable Header --</option>
                            {(reusableHeaders || []).map((rh) => (
                              <option key={rh.id} value={rh.key}>{rh.key}</option>
                            ))}
                          </select>
                          <span className={styles.hintText}>This will emit <code>$ref: #/components/headers/&lt;key&gt;</code></span>
                        </div>
                      )}

                      {/* Inline header schema */}
                      {h.mode === "inline" && (
                        <>
                          <input
                            className={styles.metaInput}
                            placeholder="Description (optional)"
                            value={h.description || ""}
                            onChange={(e) => updateHeader(idx, hIdx, "description", e.target.value)}
                          />

                          <div className={styles.fieldRow}>
                            <select
                              className={styles.metaInput}
                              value={h.type || "string"}
                              onChange={(e) => updateHeader(idx, hIdx, "type", e.target.value)}
                            >
                              <option value="string">string</option>
                              <option value="integer">integer</option>
                              <option value="boolean">boolean</option>
                              <option value="number">number</option>
                              <option value="double">double</option>
                            </select>

                            <select
                              className={styles.metaInput}
                              value={h.format || ""}
                              onChange={(e) => updateHeader(idx, hIdx, "format", e.target.value)}
                              title="Format (optional)"
                            >
                              {formatOptionsFor(h.type === "double" ? "double" : h.type || "string").map((opt) => (
                                <option key={opt || "none"} value={opt}>{opt || "— format —"}</option>
                              ))}
                            </select>
                          </div>

                          {/* Optional enum */}
                          {(Array.isArray(h.enum) && h.enum.length > 0) ? (
                            <div className={styles.enumEditor}>
                              <div className={styles.enumHeader}>
                                <span>Enum values</span>
                                <button
                                  className={styles.addBtn}
                                  onClick={() => updateHeader(idx, hIdx, "enum", [...(h.enum || []), ""])}
                                >
                                  + Add Value
                                </button>
                              </div>
                              <div className={styles.enumList}>
                                {(h.enum || []).map((val, eIdx) => (
                                  <div key={eIdx} className={styles.enumItem}>
                                    <input
                                      className={styles.metaInput}
                                      value={val}
                                      onChange={(e) => {
                                        const next = [...(h.enum || [])];
                                        next[eIdx] = e.target.value;
                                        updateHeader(idx, hIdx, "enum", next);
                                      }}
                                      placeholder={`Value ${eIdx + 1}`}
                                    />
                                    <button
                                      className={styles.deleteBtn}
                                      onClick={() => {
                                        const next = [...(h.enum || [])];
                                        next.splice(eIdx, 1);
                                        updateHeader(idx, hIdx, "enum", next);
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className={styles.fieldRow}>
                              <button
                                className={styles.addBtn}
                                onClick={() => updateHeader(idx, hIdx, "enum", [""])}
                                title="Add enum values (optional)"
                              >
                                + Add enum
                              </button>
                              <span className={styles.hintText}>optional</span>
                            </div>
                          )}

                          {/* Validations */}
                          <div className={styles.fieldRow}>
                            {showStringValidations && (
                              <>
                                <input
                                  className={styles.metaInput}
                                  type="number"
                                  placeholder="minLength"
                                  value={h.minLength ?? ""}
                                  onChange={(e) =>
                                    updateHeader(idx, hIdx, "minLength", e.target.value === "" ? undefined : Number(e.target.value))
                                  }
                                />
                                <input
                                  className={styles.metaInput}
                                  type="number"
                                  placeholder="maxLength"
                                  value={h.maxLength ?? ""}
                                  onChange={(e) =>
                                    updateHeader(idx, hIdx, "maxLength", e.target.value === "" ? undefined : Number(e.target.value))
                                  }
                                />
                                <input
                                  className={styles.metaInput}
                                  placeholder="pattern (regex)"
                                  value={h.pattern || ""}
                                  onChange={(e) => updateHeader(idx, hIdx, "pattern", e.target.value)}
                                />
                              </>
                            )}

                            {showNumberValidations && (
                              <>
                                <input
                                  className={styles.metaInput}
                                  type="number"
                                  placeholder="minimum"
                                  value={h.minimum ?? ""}
                                  onChange={(e) =>
                                    updateHeader(idx, hIdx, "minimum", e.target.value === "" ? undefined : Number(e.target.value))
                                  }
                                />
                                <input
                                  className={styles.metaInput}
                                  type="number"
                                  placeholder="maximum"
                                  value={h.maximum ?? ""}
                                  onChange={(e) =>
                                    updateHeader(idx, hIdx, "maximum", e.target.value === "" ? undefined : Number(e.target.value))
                                  }
                                />
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>

            <button className={styles.saveBtn} onClick={() => submitDraft(idx)}>
              {d.__editId ? "💾 Update Response" : "✅ Save Response"}
            </button>
          </div>
        );
      })}

      <button className={styles.addBtn} onClick={startNew}>+ New Response</button>
    </div>
  );
}
