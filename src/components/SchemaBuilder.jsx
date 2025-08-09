// src/components/SchemaBuilder.jsx
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
  cancelDraft, // 👈 NEW
}) {
  // field-level composition controls
  const addVariant = (sIdx, fIdx) => {
    const v = { kind: "primitive", type: "string", format: "" };
    updateField(sIdx, fIdx, "variants", [ ...(editingSchemas[sIdx]?.fields?.[fIdx]?.variants || []), v ]);
  };
  const updateVariant = (sIdx, fIdx, vIdx, key, value) => {
    const list = [...(editingSchemas[sIdx]?.fields?.[fIdx]?.variants || [])];
    list[vIdx] = { ...list[vIdx], [key]: value };
    updateField(sIdx, fIdx, "variants", list);
  };
  const deleteVariant = (sIdx, fIdx, vIdx) => {
    const list = [...(editingSchemas[sIdx]?.fields?.[fIdx]?.variants || [])];
    list.splice(vIdx, 1);
    updateField(sIdx, fIdx, "variants", list);
  };

  // schema-level composition controls
  const addSchemaVariant = (sIdx) => {
    const v = { kind: "primitive", type: "string", format: "" };
    const current = editingSchemas[sIdx]?.variants || [];
    updateField(sIdx, -1, "variants", [...current, v]);
  };
  const updateSchemaVariant = (sIdx, vIdx, key, value) => {
    const list = [...(editingSchemas[sIdx]?.variants || [])];
    list[vIdx] = { ...list[vIdx], [key]: value };
    updateField(sIdx, -1, "variants", list);
  };
  const deleteSchemaVariant = (sIdx, vIdx) => {
    const list = [...(editingSchemas[sIdx]?.variants || [])];
    list.splice(vIdx, 1);
    updateField(sIdx, -1, "variants", list);
  };

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
                  onClick={() => { if (confirm(`Delete schema "${s.name}"? This cannot be undone.`)) deleteSchemaById?.(s.id); }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft editors */}
      {(editingSchemas || []).map((schema, sIdx) => {
        const schemaType = schema.schemaType || "object";
        return (
          <div key={sIdx} className={styles.schemaBlock}>
            {/* Header row: name, type, format, actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input
                className={styles.metaInput}
                value={schema.name}
                onChange={(e) => updateSchemaName(sIdx, e.target.value)}
                placeholder="Schema Name"
              />
              {schema.__editId && <span className={styles.editBadge}>Editing</span>}

              {/* Schema-level type */}
              <select
                className={styles.metaInput}
                value={schemaType}
                onChange={(e) => updateField(sIdx, -1, "schemaType", e.target.value)}
                title="Schema type"
              >
                <option value="object">object</option>
                <option value="enum">enum</option>
                <option value="string">string</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
                <option value="number">number</option>
                <option value="double">double</option>
                <option value="array">array</option>
                <option value="$ref">Schema Reference</option>
                <option value="oneOf">oneOf (union)</option>
                <option value="anyOf">anyOf</option>
              </select>

              {/* Optional schema-level format for primitives/double */}
              {["string","integer","number","double","boolean"].includes(schemaType) && (
                <select
                  className={styles.metaInput}
                  value={schema.format || ""}
                  onChange={(e) => updateField(sIdx, -1, "format", e.target.value)}
                  title="Schema format"
                >
                  {formatOptionsFor(schemaType === "double" ? "double" : schemaType).map((opt) => (
                    <option key={opt || "none"} value={opt}>{opt || "— format —"}</option>
                  ))}
                </select>
              )}

              {/* Actions on the right */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {!schema.__editId ? (
                  // Draft: Discard
                  <button
                    type="button"
                    className={styles.deleteEndpointBtn}
                    onClick={() => cancelDraft?.(sIdx)}
                    title="Discard this draft"
                  >
                    Discard
                  </button>
                ) : (
                  // Editing: Delete Schema + Discard changes
                  <>
                    <button
                      type="button"
                      className={styles.deleteEndpointBtn}
                      onClick={() => {
                        if (confirm(`Delete schema "${schema.name}"? This cannot be undone.`)) {
                          deleteSchemaById?.(schema.__editId);
                          cancelDraft?.(sIdx);
                        }
                      }}
                      title="Delete this schema"
                    >
                      Delete Schema
                    </button>
                    <button
                      type="button"
                      className={styles.inlineDeleteBtn}
                      onClick={() => cancelDraft?.(sIdx)}
                      title="Discard changes"
                    >
                      Discard
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ENUM schema editor */}
            {schemaType === "enum" && (
              <div className={styles.enumEditor} style={{ width: "100%" }}>
                <div className={styles.enumHeader}>
                  <span>Schema enum values</span>
                  <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => updateField(sIdx, -1, "enum", [...(schema.enum || []), ""])}
                  >
                    + Add Value
                  </button>
                </div>

                <div className={styles.enumList}>
                  {(schema.enum || []).map((val, eIdx) => (
                    <div key={eIdx} className={styles.enumItem}>
                      <input
                        className={styles.metaInput}
                        value={val}
                        onChange={(e) => {
                          const next = [...(schema.enum || [])];
                          next[eIdx] = e.target.value;
                          updateField(sIdx, -1, "enum", next);
                        }}
                        placeholder={`Value ${eIdx + 1}`}
                      />
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => {
                          const next = [...(schema.enum || [])];
                          next.splice(eIdx, 1);
                          updateField(sIdx, -1, "enum", next);
                        }}
                        title="Remove value"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARRAY schema editor */}
            {schemaType === "array" && (
              <div className={styles.arrayConfig} style={{ width: "100%" }}>
                <label>Array of:</label>
                <select
                  className={styles.metaInput}
                  value={schema.itemsType || "string"}
                  onChange={(e) => updateField(sIdx, -1, "itemsType", e.target.value)}
                >
                  <option value="string">string</option>
                  <option value="integer">integer</option>
                  <option value="boolean">boolean</option>
                  <option value="number">number</option>
                  <option value="double">double</option>
                  <option value="$ref">Schema Reference</option>
                </select>

                {schema.itemsType === "$ref" ? (
                  <select
                    className={styles.metaInput}
                    value={schema.ref || ""}
                    onChange={(e) => updateField(sIdx, -1, "ref", e.target.value)}
                  >
                    <option value="">-- Select Schema --</option>
                    {(schemas || [])
                      .filter((s) => s.name !== schema.name)
                      .map((s) => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                  </select>
                ) : (
                  ["string","integer","number","double","boolean"].includes(schema.itemsType || "") && (
                    <select
                      className={styles.metaInput}
                      value={schema.itemsFormat || ""}
                      onChange={(e) => updateField(sIdx, -1, "itemsFormat", e.target.value)}
                      title="Items format"
                    >
                      {formatOptionsFor(schema.itemsType === "double" ? "double" : (schema.itemsType || "string"))
                        .map((opt) => <option key={opt || "none"} value={opt}>{opt || "— items format —"}</option>)}
                    </select>
                  )
                )}
              </div>
            )}

            {/* $REF schema editor */}
            {schemaType === "$ref" && (
              <div className={styles.arrayConfig} style={{ width: "100%" }}>
                <label>Reference schema:</label>
                <select
                  className={styles.metaInput}
                  value={schema.ref || ""}
                  onChange={(e) => updateField(sIdx, -1, "ref", e.target.value)}
                >
                  <option value="">-- Select Schema --</option>
                  {(schemas || [])
                    .filter((s) => s.name !== schema.name)
                    .map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* schema-level oneOf / anyOf editor */}
            {(schemaType === "oneOf" || schemaType === "anyOf") && (
              <div className={styles.schemaBlock} style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{schemaType} variants</strong>
                  <button type="button" className={styles.addBtn} onClick={() => addSchemaVariant(sIdx)}>
                    + Add Variant
                  </button>
                </div>

                {(schema.variants || []).length === 0 && (
                  <div className={styles.emptyMessage}>No variants yet. Add a primitive type or a schema reference.</div>
                )}

                {(schema.variants || []).map((v, vIdx) => {
                  const primitiveFormats = formatOptionsFor(v.type);
                  return (
                    <div key={vIdx} className={styles.fieldRow}>
                      <select
                        className={styles.metaInput}
                        value={v.kind || "primitive"}
                        onChange={(e) => updateSchemaVariant(sIdx, vIdx, "kind", e.target.value)}
                        title="Variant kind"
                      >
                        <option value="primitive">Primitive</option>
                        <option value="$ref">Schema Reference</option>
                      </select>

                      {v.kind !== "$ref" ? (
                        <>
                          <select
                            className={styles.metaInput}
                            value={v.type || "string"}
                            onChange={(e) => updateSchemaVariant(sIdx, vIdx, "type", e.target.value)}
                          >
                            <option value="string">string</option>
                            <option value="integer">integer</option>
                            <option value="boolean">boolean</option>
                            <option value="number">number</option>
                            <option value="double">double</option>
                          </select>

                          <select
                            className={styles.metaInput}
                            value={v.format || ""}
                            onChange={(e) => updateSchemaVariant(sIdx, vIdx, "format", e.target.value)}
                          >
                            {primitiveFormats.map((opt) => (
                              <option key={opt || "none"} value={opt}>{opt || "— format —"}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <select
                          className={styles.metaInput}
                          value={v.ref || ""}
                          onChange={(e) => updateSchemaVariant(sIdx, vIdx, "ref", e.target.value)}
                        >
                          <option value="">-- Select Schema --</option>
                          {(schemas || [])
                            .filter((s) => s.name !== schema.name)
                            .map((s) => (
                              <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                      )}

                      <button
                        type="button"
                        className={styles.inlineDeleteBtn}
                        onClick={() => deleteSchemaVariant(sIdx, vIdx)}
                        title="Remove variant"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* OBJECT schema fields editor */}
            {schemaType === "object" && (
              <>
                {(schema.fields ?? []).map((field, fIdx) => {
                  const showFormatOnField = ["string", "integer", "number", "double", "boolean"].includes(field.type);
                  const isArrayPrimitive  = field.type === "array" && !["$ref"].includes(field.itemsType) && !!field.itemsType;
                  const arrayFormatChoices = formatOptionsFor(field.itemsType);

                  const isComposition = field.type === "oneOf" || field.type === "anyOf";
                  const variants = field.variants || [];

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
                        <option value="oneOf">oneOf (union)</option>
                        <option value="anyOf">anyOf</option>
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

                      {/* Description */}
                      <input
                        className={styles.metaInput}
                        value={field.description || ""}
                        onChange={(e) => updateField(sIdx, fIdx, "description", e.target.value)}
                        placeholder="Description (optional)"
                      />

                      {/* Format (optional for primitives) */}
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

                      {/* $ref property */}
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

                      {/* Enum editor (field-level) */}
                      {field.type === "enum" && (
                        <div className={styles.enumEditor}>
                          <div className={styles.enumHeader}>
                            <span>Enum values</span>
                            <button
                              type="button"
                              className={styles.addBtn}
                              onClick={() =>
                                updateField(sIdx, fIdx, "enum", [...(field.enum || []), ""])
                              }
                            >
                              + Add Value
                            </button>
                          </div>

                          <div className={styles.enumList}>
                            {(field.enum || []).map((val, eIdx) => (
                              <div key={eIdx} className={styles.enumItem}>
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
                                  placeholder={`Value ${eIdx + 1}`}
                                />
                                <button
                                  type="button"
                                  className={styles.deleteBtn}
                                  onClick={() => {
                                    const updated = [...field.enum];
                                    updated.splice(eIdx, 1);
                                    updateField(sIdx, fIdx, "enum", updated);
                                  }}
                                  title="Remove value"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Array editor (field-level) */}
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

                      {/* oneOf / anyOf editor (field-level) */}
                      {isComposition && (
                        <div className={styles.schemaBlock} style={{ width: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{field.type} variants</strong>
                            <button type="button" className={styles.addBtn} onClick={() => addVariant(sIdx, fIdx)}>
                              + Add Variant
                            </button>
                          </div>

                          {variants.length === 0 && (
                            <div className={styles.emptyMessage}>No variants yet. Add a primitive type or a schema reference.</div>
                          )}

                          {variants.map((v, vIdx) => {
                            const primitiveFormats = formatOptionsFor(v.type);
                            return (
                              <div key={vIdx} className={styles.fieldRow}>
                                <select
                                  className={styles.metaInput}
                                  value={v.kind || "primitive"}
                                  onChange={(e) => updateVariant(sIdx, fIdx, vIdx, "kind", e.target.value)}
                                  title="Variant kind"
                                >
                                  <option value="primitive">Primitive</option>
                                  <option value="$ref">Schema Reference</option>
                                </select>

                                {v.kind !== "$ref" ? (
                                  <>
                                    <select
                                      className={styles.metaInput}
                                      value={v.type || "string"}
                                      onChange={(e) => updateVariant(sIdx, fIdx, vIdx, "type", e.target.value)}
                                    >
                                      <option value="string">string</option>
                                      <option value="integer">integer</option>
                                      <option value="boolean">boolean</option>
                                      <option value="number">number</option>
                                      <option value="double">double</option>
                                    </select>

                                    <select
                                      className={styles.metaInput}
                                      value={v.format || ""}
                                      onChange={(e) => updateVariant(sIdx, fIdx, vIdx, "format", e.target.value)}
                                    >
                                      {primitiveFormats.map((opt) => (
                                        <option key={opt || "none"} value={opt}>{opt || "— format —"}</option>
                                      ))}
                                    </select>
                                  </>
                                ) : (
                                  <select
                                    className={styles.metaInput}
                                    value={v.ref || ""}
                                    onChange={(e) => updateVariant(sIdx, fIdx, vIdx, "ref", e.target.value)}
                                  >
                                    <option value="">-- Select Schema --</option>
                                    {(schemas || [])
                                      .filter((s) => s.name !== schema.name)
                                      .map((s) => (
                                        <option key={s.name} value={s.name}>{s.name}</option>
                                      ))}
                                  </select>
                                )}

                                <button
                                  type="button"
                                  className={styles.inlineDeleteBtn}
                                  onClick={() => deleteVariant(sIdx, fIdx, vIdx)}
                                  title="Remove variant"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button type="button" onClick={() => addField(sIdx)} className={styles.addBtn}>
                  + Add Field
                </button>
              </>
            )}

            {/* Non-object hint */}
            {schemaType !== "object" && (
              <div className={styles.emptyMessage} style={{ marginTop: 8 }}>
                Switch schema type to <strong>object</strong> to add fields.
              </div>
            )}

            <button type="button" onClick={() => submitSchema(sIdx)} className={styles.saveBtn}>
              {schema.__editId ? "💾 Update Schema" : "✅ Save Schema"}
            </button>
          </div>
        );
      })}

      <button type="button" onClick={startNewSchema} className={styles.addBtn}>
        + New Schema
      </button>
    </div>
  );
}
