// src/components/SchemaBuilder.jsx
import styles from "./Canvas.module.css";

export default function SchemaBuilder({
  schemas,
  editingSchemas,
  updateSchemaName,
  addField,
  updateField,
  deleteField,
  submitSchema,
  startNewSchema,
  startEditSchema,
  duplicateSchema,
  deleteSchemaById,
}) {
  return (
    <div className={styles.schemaPanel}>
      <h3>Component Schemas</h3>

      {/* Saved Schemas list */}
      {schemas?.length > 0 && (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Schemas</div>
          {schemas.map((s) => (
            <div key={s.id} className={styles.savedRow}>
              <span className={styles.savedName}>{s.name}</span>
              <div className={styles.savedActions}>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => startEditSchema?.(s.id)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => duplicateSchema?.(s.id)}
                  title="Duplicate"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className={styles.inlineDeleteBtn}
                  onClick={() => {
                    if (confirm(`Delete schema "${s.name}"? This cannot be undone.`)) {
                      deleteSchemaById?.(s.id);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft editors */}
      {(editingSchemas || []).map((schema, sIdx) => (
        <div key={sIdx} className={styles.schemaBlock}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className={styles.metaInput}
              value={schema.name}
              onChange={(e) => updateSchemaName(sIdx, e.target.value)}
              placeholder="Schema Name"
            />
            {schema.__editId && <span className={styles.editBadge}>Editing</span>}
          </div>

          {(schema.fields ?? []).map((field, fIdx) => (
            <div key={fIdx} className={styles.fieldRow}>
              {/* Field name */}
              <input
                className={styles.metaInput}
                value={field.name}
                onChange={(e) => updateField(sIdx, fIdx, "name", e.target.value)}
                placeholder="Field Name"
              />

              {/* Field type */}
              <select
                className={styles.metaInput}
                value={field.type}
                onChange={(e) => updateField(sIdx, fIdx, "type", e.target.value)}
              >
                <option value="string">string</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
                <option value="number">number</option>
                <option value="double">double</option>
                <option value="enum">enum</option>
                <option value="array">array</option>
                <option value="$ref">Schema Reference</option>
              </select>

              {/* Required toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={field.required ?? true}
                  onChange={(e) => updateField(sIdx, fIdx, "required", e.target.checked)}
                />
                Required
              </label>

              {/* Delete field */}
              <button
                type="button"
                className={styles.inlineDeleteBtn}
                onClick={() => deleteField(sIdx, fIdx)}
                title="Delete field"
                aria-label={`Delete field ${field.name || ""}`}
              >
                ✕
              </button>

              {/* Direct $ref type selector */}
              {field.type === "$ref" && (
                <select
                  className={styles.metaInput}
                  value={field.ref || ""}
                  onChange={(e) => updateField(sIdx, fIdx, "ref", e.target.value)}
                >
                  <option value="">-- Select Schema --</option>
                  {(schemas || [])
                    .filter((s) => s.name !== schema.name) // avoid obvious self-ref loop
                    .map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              )}

              {/* Enum editor */}
              {field.type === "enum" && (
                <div className={styles.enumEditor}>
                  {(field.enum || []).map((val, eIdx) => (
                    <div key={eIdx} className={styles.enumRow}>
                      <input
                        className={styles.metaInput}
                        value={val}
                        onChange={(e) =>
                          updateField(sIdx, fIdx, "enum", [
                            ...field.enum.slice(0, eIdx),
                            e.target.value,
                            ...field.enum.slice(eIdx + 1),
                          ])
                        }
                        placeholder="Enum value"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...field.enum];
                          updated.splice(eIdx, 1);
                          updateField(sIdx, fIdx, "enum", updated);
                        }}
                        className={styles.inlineDeleteBtn}
                        title="Remove enum value"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateField(sIdx, fIdx, "enum", [...(field.enum || []), ""])
                    }
                    className={styles.addBtn}
                  >
                    + Add Enum Value
                  </button>
                </div>
              )}

              {/* Array editor */}
              {field.type === "array" && (
                <div className={styles.arrayConfig}>
                  <label>Array of:</label>
                  <select
                    className={styles.metaInput}
                    value={field.itemsType || "string"}
                    onChange={(e) => updateField(sIdx, fIdx, "itemsType", e.target.value)}
                  >
                    <option value="string">string</option>
                    <option value="integer">integer</option>
                    <option value="boolean">boolean</option>
                    <option value="number">number</option>
                    <option value="double">double</option>
                    <option value="$ref">Schema Reference</option>
                  </select>

                  {/* $ref for array items */}
                  {field.itemsType === "$ref" && (
                    <select
                      className={styles.metaInput}
                      value={field.ref || ""}
                      onChange={(e) => updateField(sIdx, fIdx, "ref", e.target.value)}
                    >
                      <option value="">-- Select Schema --</option>
                      {(schemas || [])
                        .filter((s) => s.name !== schema.name)
                        .map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          ))}

          <button type="button" onClick={() => addField(sIdx)} className={styles.addBtn}>
            + Add Field
          </button>
          <button type="button" onClick={() => submitSchema(sIdx)} className={styles.saveBtn}>
            {schema.__editId ? "💾 Update Schema" : "✅ Save Schema"}
          </button>
        </div>
      ))}

      <button type="button" onClick={startNewSchema} className={styles.addBtn}>
        + New Schema
      </button>
    </div>
  );
}
