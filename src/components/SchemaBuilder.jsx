// src/components/SchemaBuilder.jsx
import styles from "./Canvas.module.css";

const STRING_FORMATS = ["", "date-time", "date", "uuid", "email", "uri", "hostname", "ipv4", "ipv6", "byte", "binary", "password"];
const INTEGER_FORMATS = ["", "int32", "int64"];
const NUMBER_FORMATS  = ["", "float", "double"]; // note: you also have explicit "double" type elsewhere
const BOOLEAN_FORMATS = [""]; // none, but keep consistent

function formatOptionsFor(type) {
  switch (type) {
    case "string":  return STRING_FORMATS;
    case "integer": return INTEGER_FORMATS;
    case "number":  return NUMBER_FORMATS;
    case "double":  return NUMBER_FORMATS; // allow user to pick "double" or keep empty; YAML builder already maps type:double → number+double
    case "boolean": return BOOLEAN_FORMATS;
    default:        return [""];
  }
}

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

      {/* Saved Schemas */}
      {schemas?.length > 0 && (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Schemas</div>
          {schemas.map((s) => (
            <div key={s.id} className={styles.savedRow}>
              <span className={styles.savedName}>{s.name}</span>
              <div className={styles.savedActions}>
                <button type="button" className={styles.addBtn} onClick={() => startEditSchema?.(s.id)}>Edit</button>
                <button type="button" className={styles.addBtn} onClick={() => duplicateSchema?.(s.id)}>Duplicate</button>
                <button
                  type="button"
                  className={styles.inlineDeleteBtn}
                  onClick={() => { if (confirm(`Delete schema "${s.name}"?`)) deleteSchemaById?.(s.id); }}
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

          {(schema.fields ?? []).map((field, fIdx) => {
            const showFormatOnField = ["string", "integer", "number", "double", "boolean"].includes(field.type);
            const isArrayPrimitive  = field.type === "array" && !["$ref"].includes(field.itemsType) && !!field.itemsType;
            const arrayFormatChoices = formatOptionsFor(field.itemsType);

            return (
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

                {/* Required / Optional */}
                <select
                  className={styles.metaInput}
                  value={field.required ?? true ? "required" : "optional"}
                  onChange={(e) => updateField(sIdx, fIdx, "required", e.target.value === "required")}
                  title="Controls whether this field appears in the schema's 'required' array"
                >
                  <option value="required">Required</option>
                  <option value="optional">Optional</option>
                </select>

                {/* Delete field */}
                <button
                  type="button"
                  className={styles.inlineDeleteBtn}
                  onClick={() => deleteField(sIdx, fIdx)}
                  title="Delete field"
                >
                  ✕
                </button>

                {/* —— Optional Description —— */}
                <input
                  className={styles.metaInput}
                  value={field.description || ""}
                  onChange={(e) => updateField(sIdx, fIdx, "description", e.target.value)}
                  placeholder="Description (optional)"
                  title="Description appears in the schema under this property"
                />

                {/* —— Optional Format (for primitives) —— */}
                {showFormatOnField && (
                  <select
                    className={styles.metaInput}
                    value={field.format || ""}
                    onChange={(e) => updateField(sIdx, fIdx, "format", e.target.value)}
                    title="Optional format for this type"
                  >
                    {formatOptionsFor(field.type).map((opt) => (
                      <option key={opt || "none"} value={opt}>{opt || "— format —"}</option>
                    ))}
                  </select>
                )}

                {/* Direct $ref */}
                {field.type === "$ref" && (
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

                    {/* Optional format for primitive array items */}
                    {isArrayPrimitive && (
                      <select
                        className={styles.metaInput}
                        value={field.itemsFormat || ""}
                        onChange={(e) => updateField(sIdx, fIdx, "itemsFormat", e.target.value)}
                        title="Optional format for array items"
                      >
                        {arrayFormatChoices.map((opt) => (
                          <option key={opt || "none"} value={opt}>{opt || "— items format —"}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}

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
