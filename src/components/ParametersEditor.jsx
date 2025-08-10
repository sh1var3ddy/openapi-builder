import styles from "./Canvas.module.css";

export default function ParametersEditor({ block, idx, updateBlock, reusableParams = [] }) {
  const parameters = block.parameters || [];

  const updateParam = (pIdx, key, value) => {
    const next = parameters.map((p, i) => (i === pIdx ? { ...p, [key]: value } : p));
    updateBlock(idx, "parameters", next);
  };

  const addInlineParam = () => {
    const next = [
      ...parameters,
      {
        mode: "inline",        // "inline" | "ref"
        name: "",
        in: "query",
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
      },
    ];
    updateBlock(idx, "parameters", next);
  };

  const addRefParam = () => {
    const next = [
      ...parameters,
      {
        mode: "ref",
        refName: "", // components.parameters key
      },
    ];
    updateBlock(idx, "parameters", next);
  };

  const deleteParam = (pIdx, e) => {
    e?.preventDefault();
    const next = parameters.filter((_, i) => i !== pIdx);
    updateBlock(idx, "parameters", next);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.addBtn} onClick={addInlineParam}>+ Add Inline</button>
          <button className={styles.addBtn} onClick={addRefParam}>+ Add from $ref</button>
        </div>
      </div>

      {parameters.length === 0 && (
        <div className={styles.emptyMessage}>No parameters defined.</div>
      )}

      {parameters.map((param, pIdx) => {
        const isRef = param.mode === "ref";

        return (
          <div key={pIdx} className={styles.schemaBlock} style={{ marginTop: 8 }}>
            {/* mode switch */}
            <div className={styles.fieldRow}>
              <select
                className={styles.metaInput}
                value={param.mode || "inline"}
                onChange={(e) => updateParam(pIdx, "mode", e.target.value)}
                title="Parameter mode: inline definition or $ref"
              >
                <option value="inline">Inline</option>
                <option value="ref">$ref</option>
              </select>

              <button
                className={styles.inlineDeleteBtn}
                onClick={(e) => deleteParam(pIdx, e)}
                title="Delete parameter"
              >
                ✕
              </button>
            </div>

            {/* $ref mode */}
            {isRef ? (
              <div className={styles.fieldRow}>
                <select
                  className={styles.metaInput}
                  value={param.refName || ""}
                  onChange={(e) => updateParam(pIdx, "refName", e.target.value)}
                  title="Choose a reusable parameter from components.parameters"
                >
                  <option value="">-- Select components.parameters --</option>
                  {reusableParams.map((rp) => (
                    <option key={rp.id} value={rp.key}>
                      {rp.key} ({rp.in} {rp.name})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                {/* Inline mode */}
                <div className={styles.fieldRow}>
                  <input
                    className={styles.metaInput}
                    placeholder="Name"
                    value={param.name}
                    onChange={(e) => updateParam(pIdx, "name", e.target.value)}
                  />
                  <select
                    className={styles.metaInput}
                    value={param.in}
                    onChange={(e) => updateParam(pIdx, "in", e.target.value)}
                  >
                    <option value="query">Query</option>
                    <option value="path">Path</option>
                    <option value="header">Header</option>
                    <option value="cookie">Cookie</option>
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!param.required}
                      onChange={(e) => updateParam(pIdx, "required", e.target.checked)}
                    />
                    Required
                  </label>
                  <select
                    className={styles.metaInput}
                    value={param.type || "string"}
                    onChange={(e) => updateParam(pIdx, "type", e.target.value)}
                  >
                    <option value="string">string</option>
                    <option value="integer">integer</option>
                    <option value="boolean">boolean</option>
                    <option value="number">number</option>
                    <option value="double">double</option>
                  </select>
                </div>

                <input
                  className={styles.metaInput}
                  placeholder="Description"
                  value={param.description || ""}
                  onChange={(e) => updateParam(pIdx, "description", e.target.value)}
                />

                {/* optional format */}
                <div className={styles.fieldRow}>
                  <input
                    className={styles.metaInput}
                    placeholder="format (optional)"
                    value={param.format || ""}
                    onChange={(e) => updateParam(pIdx, "format", e.target.value)}
                    title="Format like int64, date-time, uuid, etc."
                  />
                </div>

                {/* enums */}
                <div className={styles.enumEditor}>
                  <div className={styles.enumHeader}>
                    <span>Enum values (optional)</span>
                    <button
                      className={styles.addBtn}
                      onClick={() => updateParam(pIdx, "enum", [...(param.enum || []), ""])}
                    >
                      + Add Value
                    </button>
                  </div>
                  <div className={styles.enumList}>
                    {(param.enum || []).map((val, eIdx) => (
                      <div key={eIdx} className={styles.enumItem}>
                        <input
                          className={styles.metaInput}
                          value={val}
                          onChange={(e) => {
                            const next = [...(param.enum || [])];
                            next[eIdx] = e.target.value;
                            updateParam(pIdx, "enum", next);
                          }}
                          placeholder={`Value ${eIdx + 1}`}
                        />
                        <button
                          className={styles.deleteBtn}
                          onClick={() => {
                            const next = [...(param.enum || [])];
                            next.splice(eIdx, 1);
                            updateParam(pIdx, "enum", next);
                          }}
                          title="Remove enum value"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* validations */}
                <div className={styles.fieldRow}>
                  {/* string validations */}
                  {param.type === "string" && (
                    <>
                      <input
                        className={styles.metaInput}
                        type="number"
                        placeholder="minLength"
                        value={param.minLength ?? ""}
                        onChange={(e) =>
                          updateParam(pIdx, "minLength", e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                      <input
                        className={styles.metaInput}
                        type="number"
                        placeholder="maxLength"
                        value={param.maxLength ?? ""}
                        onChange={(e) =>
                          updateParam(pIdx, "maxLength", e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                      <input
                        className={styles.metaInput}
                        placeholder="pattern (regex)"
                        value={param.pattern || ""}
                        onChange={(e) => updateParam(pIdx, "pattern", e.target.value)}
                      />
                    </>
                  )}

                  {/* number/integer/double validations */}
                  {(param.type === "number" || param.type === "integer" || param.type === "double") && (
                    <>
                      <input
                        className={styles.metaInput}
                        type="number"
                        placeholder="minimum"
                        value={param.minimum ?? ""}
                        onChange={(e) =>
                          updateParam(pIdx, "minimum", e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                      <input
                        className={styles.metaInput}
                        type="number"
                        placeholder="maximum"
                        value={param.maximum ?? ""}
                        onChange={(e) =>
                          updateParam(pIdx, "maximum", e.target.value === "" ? undefined : Number(e.target.value))
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
  );
}
