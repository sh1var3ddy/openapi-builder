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
}) {
  return (
    <div className={styles.schemaPanel}>
      <h3>Component Schemas</h3>
      {editingSchemas.map((schema, sIdx) => (
        <div key={sIdx} className={styles.schemaBlock}>
          <input
            className={styles.metaInput}
            value={schema.name}
            onChange={(e) => updateSchemaName(sIdx, e.target.value)}
            placeholder="Schema Name"
          />
          {(schema.fields ?? []).map((field, fIdx) => (
            <div key={fIdx} className={styles.fieldRow}>
              <input
                className={styles.metaInput}
                value={field.name}
                onChange={(e) => updateField(sIdx, fIdx, "name", e.target.value)}
                placeholder="Field Name"
              />
              <select
                className={styles.metaInput}
                value={field.type}
                onChange={(e) => updateField(sIdx, fIdx, "type", e.target.value)}
              >
                <option value="string">string</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
                <option value="number">number</option>
                <option value="enum">enum</option>
                <option value="array">array</option>
              </select>

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
                        onClick={() => {
                          const updated = [...field.enum];
                          updated.splice(eIdx, 1);
                          updateField(sIdx, fIdx, "enum", updated);
                        }}
                        className={styles.deleteBtn}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      updateField(sIdx, fIdx, "enum", [...(field.enum || []), ""])
                    }
                    className={styles.addBtn}
                  >
                    + Add Enum Value
                  </button>
                </div>
              )}

              {field.type === "array" && (
                <div className={styles.arrayConfig}>
                  <label>Array of:</label>
                  <select
                    className={styles.metaInput}
                    value={field.itemsType || "string"}
                    onChange={(e) =>
                      updateField(sIdx, fIdx, "itemsType", e.target.value)
                    }
                  >
                    <option value="string">string</option>
                    <option value="integer">integer</option>
                    <option value="boolean">boolean</option>
                    <option value="number">number</option>
                    <option value="$ref">Schema Reference</option>
                  </select>

                  {field.itemsType === "$ref" && (
                    <select
                      className={styles.metaInput}
                      value={field.ref || ""}
                      onChange={(e) =>
                        updateField(sIdx, fIdx, "ref", e.target.value)
                      }
                    >
                      <option value="">-- Select Schema --</option>
                      {schemas.map((s) => (
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
          <button onClick={() => addField(sIdx)} className={styles.addBtn}>
            + Add Field
          </button>
          <button onClick={() => submitSchema(sIdx)} className={styles.saveBtn}>
            ✅ Save Schema
          </button>
        </div>
      ))}
      <button onClick={startNewSchema} className={styles.addBtn}>
        + New Schema
      </button>
    </div>
  );
}
