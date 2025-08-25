// src/components/ExamplesBuilder.jsx
import { useMemo, useState } from "react";
import styles from "./Canvas.module.css";

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- helpers moved to top-level so NodeEditor is stable ---------- */
function defaultValueFor(node) {
  if (!node) return null;
  if (node.oneOf || node.anyOf) {
    const arr = node.oneOf || node.anyOf;
    return defaultValueFor(arr[0] || { type: "string" });
  }
  switch (node.type) {
    case "object":  return {};
    case "array":   return [];
    case "number":
    case "integer": return 0;
    case "boolean": return false;
    case "string":
    default:        return "";
  }
}

/** Stable component (no longer recreated each render) */
function NodeEditor({ node, value, onChange }) {
  if (!node) return null;

  if (node.oneOf || node.anyOf) {
    const keyword = node.oneOf ? "oneOf" : "anyOf";
    const variants = node[keyword] || [];
    const [choiceIndex, setChoiceIndex] = useState(0);
    const safeIndex = Math.min(choiceIndex, Math.max(variants.length - 1, 0));

    return (
      <div className={styles.schemaBlock}>
        <div className={styles.fieldRow}>
          <span style={{ fontWeight: 600 }}>{keyword}</span>
          <select
            className={styles.metaInput}
            value={safeIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setChoiceIndex(idx);
              const def = defaultValueFor(variants[idx]);
              onChange(def);
            }}
          >
            {variants.map((_, i) => (
              <option key={i} value={i}>
                Variant {i + 1}
              </option>
            ))}
          </select>
        </div>
        <NodeEditor node={variants[safeIndex]} value={value} onChange={onChange} />
      </div>
    );
  }

  if (node.type === "object") {
    const props = node.properties || {};
    return (
      <div className={styles.schemaBlock}>
        {Object.entries(props).map(([k, child]) => (
          <div key={k} className={styles.fieldRow}>
            <label className={styles.headerLabel} style={{ minWidth: 120 }}>
              {k}
            </label>
            <NodeEditor
              node={child}
              value={value?.[k]}
              onChange={(nv) => onChange({ ...(value || {}), [k]: nv })}
            />
          </div>
        ))}
        {Object.keys(props).length === 0 && (
          <div className={styles.emptyMessage}>
            No properties; switch to Raw JSON if needed.
          </div>
        )}
      </div>
    );
  }

  if (node.type === "array") {
    const items = node.items || { type: "string" };
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className={styles.schemaBlock}>
        {arr.map((v, i) => (
          <div key={i} className={styles.fieldRow}>
            <span className={styles.headerLabel} style={{ minWidth: 60 }}>
              [{i}]
            </span>
            <NodeEditor
              node={items}
              value={v}
              onChange={(nv) => {
                const copy = [...arr];
                copy[i] = nv;
                onChange(copy);
              }}
            />
            <button
              className={styles.inlineDeleteBtn}
              onClick={() => onChange(arr.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          className={styles.addBtn}
          onClick={() => onChange([...(arr || []), defaultValueFor(items)])}
        >
          + Add Item
        </button>
      </div>
    );
  }

  if (node.type === "boolean") {
    return (
      <select
        className={styles.metaInput}
        value={String(!!value)}
        onChange={(e) => onChange(e.target.value === "true")}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (node.type === "number" || node.type === "integer") {
    return (
      <input
        className={styles.metaInput}
        type="number"
        value={value ?? 0}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
      />
    );
  }

  if (Array.isArray(node.enum) && node.enum.length) {
    return (
      <select
        className={styles.metaInput}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {node.enum.map((ev, i) => (
          <option key={i} value={String(ev)}>
            {String(ev)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className={styles.metaInput}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ------------------------- Pretty helpers (unchanged) ------------------------- */
function safePrettyObj(obj) {
  try {
    return JSON.stringify(obj ?? null, null, 2);
  } catch {
    return String(obj);
  }
}
function safePrettyJson(s) {
  try {
    if (!s?.trim()) return "(empty)";
    const o = JSON.parse(s);
    return JSON.stringify(o, null, 2);
  } catch {
    return s;
  }
}

/* ============================== MAIN COMPONENT ============================== */
export default function ExamplesBuilder({
  reusableExamples,
  setReusableExamples,
  editingExamples,
  setEditingExamples,
  schemas,
  reusableResponses,
  reusableRequestBodies,
  reusableParams,
  reusableHeaders,
}) {
  /* ----------------------------- helpers ----------------------------- */
  const schemaMap = useMemo(() => {
    const m = new Map();
    (schemas || []).forEach((s) => {
      if (s?.name) m.set(s.name, s);
    });
    return m;
  }, [schemas]);

  // Resolve builder schema into simplified JSON-schema-like node
  function toJsonNodeFromBuilderSchema(s) {
    if (!s) return { type: "object", properties: {} };
    const kind = s.schemaType || "object";

    if (kind === "enum") return { type: "string", enum: (s.enum || []).slice() };
    if (kind === "oneOf" || kind === "anyOf")
      return { [kind]: (s.variants || []).map(toJsonNodeFromVariant) };
    if (kind === "$ref" && s.ref) {
      const target = schemaMap.get(s.ref);
      return toJsonNodeFromBuilderSchema(target);
    }
    if (["string", "integer", "number", "double", "boolean"].includes(kind)) {
      return {
        type: kind === "double" ? "number" : kind,
        ...(s.format ? { format: s.format } : {}),
      };
    }
    if (kind === "array") {
      const items =
        s.itemsType === "$ref" && s.ref
          ? toJsonNodeFromBuilderSchema(schemaMap.get(s.ref))
          : s.itemsType === "double"
          ? { type: "number", format: "double" }
          : { type: s.itemsType || "string", ...(s.itemsFormat ? { format: s.itemsFormat } : {}) };
      return { type: "array", items };
    }
    const properties = {};
    (s.fields || []).forEach((f) => {
      properties[f.name] = toJsonNodeFromField(f);
    });
    return { type: "object", properties };
  }

  function toJsonNodeFromVariant(v) {
    if (!v) return { type: "string" };
    if (v.kind === "$ref" && v.ref) {
      const t = schemaMap.get(v.ref);
      return toJsonNodeFromBuilderSchema(t);
    }
    if (v.type === "double") return { type: "number", format: "double" };
    return { type: v.type || "string", ...(v.format ? { format: v.format } : {}) };
  }

  function toJsonNodeFromField(f) {
    if (f.type === "$ref" && f.ref) {
      const t = schemaMap.get(f.ref);
      return toJsonNodeFromBuilderSchema(t);
    }
    if (f.type === "enum") return { type: "string", enum: (f.enum || []).slice() };
    if (f.type === "array") {
      const items =
        f.itemsType === "$ref" && f.ref
          ? toJsonNodeFromBuilderSchema(schemaMap.get(f.ref))
          : f.itemsType === "double"
          ? { type: "number", format: "double" }
          : { type: f.itemsType || "string", ...(f.itemsFormat ? { format: f.itemsFormat } : {}) };
      return { type: "array", items };
    }
    if (f.type === "oneOf" || f.type === "anyOf")
      return { [f.type]: (f.variants || []).map(toJsonNodeFromVariant) };
    if (f.type === "double") return { type: "number", format: "double" };
    return { type: f.type || "string", ...(f.format ? { format: f.format } : {}) };
  }

  // Given target, get JSON node
  function resolveTargetJsonNode(targetType, targetKey /*, mediaType */) {
    if (!targetType || !targetKey) return null;

    if (targetType === "schemas") {
      const s = schemaMap.get(targetKey);
      return toJsonNodeFromBuilderSchema(s);
    }

    if (targetType === "responses") {
      const r = (reusableResponses || []).find((x) => x.key === targetKey);
      if (!r) return null;
      if (r.schemaMode === "primitive")
        return {
          type: r.primitiveType === "double" ? "number" : r.primitiveType,
          ...(r.primitiveFormat ? { format: r.primitiveFormat } : {}),
        };
      if (r.schemaMode === "ref" && r.refName) {
        const s = schemaMap.get(r.refName);
        return toJsonNodeFromBuilderSchema(s);
      }
      return null;
    }

    if (targetType === "requestBodies") {
      const rb = (reusableRequestBodies || []).find((x) => x.key === targetKey);
      if (!rb) return null;
      if (rb.schemaMode === "primitive")
        return {
          type: rb.primitiveType === "double" ? "number" : rb.primitiveType,
          ...(rb.primitiveFormat ? { format: rb.primitiveFormat } : {}),
        };
      if (rb.schemaMode === "ref" && rb.refName)
        return toJsonNodeFromBuilderSchema(schemaMap.get(rb.refName));
      return null;
    }

    if (targetType === "parameters") {
      const p = (reusableParams || []).find((x) => x.key === targetKey);
      if (!p) return null;
      return {
        type: p.type === "double" ? "number" : p.type || "string",
        ...(p.format ? { format: p.format } : {}),
      };
    }

    if (targetType === "headers") {
      const h = (reusableHeaders || []).find((x) => x.key === targetKey);
      if (!h) return null;
      return {
        type: h.type === "double" ? "number" : h.type || "string",
        ...(h.format ? { format: h.format } : {}),
      };
    }

    return null;
  }

  /* ------------------------------ behavior ------------------------------ */
  const startNew = () => {
    setEditingExamples((prev) => [
      ...prev,
      {
        id: uid(),
        __editId: null,
        key: "",
        summary: "",
        targetType: "schemas",
        targetKey: "",
        mediaType: "application/json",
        mode: "form",
        valueJson: "",
        externalValue: "",
        structuredValue: undefined,
      },
    ]);
  };

  const update = (idx, k, v) => {
    setEditingExamples((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [k]: v } : d))
    );
  };

  const discard = (idx) =>
    setEditingExamples((prev) => prev.filter((_, i) => i !== idx));

  const submit = (idx) => {
    const d = editingExamples[idx];
    if (!d?.key) return alert("Example key is required.");
    const payload = { ...d };
    delete payload.__editId;
    if (d.__editId) {
      setReusableExamples((prev) =>
        prev.map((x) => (x.id === d.__editId ? payload : x))
      );
    } else {
      setReusableExamples((prev) => [...prev, payload]);
    }
    discard(idx);
  };

  const startEdit = (id) => {
    const ex = reusableExamples.find((x) => x.id === id);
    if (!ex) return;
    setEditingExamples((prev) => [
      ...prev,
      { ...JSON.parse(JSON.stringify(ex)), __editId: id, id: uid() },
    ]);
  };

  const duplicate = (id) => {
    const ex = reusableExamples.find((x) => x.id === id);
    if (!ex) return;
    const copy = {
      ...JSON.parse(JSON.stringify(ex)),
      id: uid(),
      key: `${ex.key}_copy`,
    };
    setReusableExamples((prev) => [...prev, copy]);
    setTimeout(() => startEdit(copy.id), 0);
  };

  const remove = (id) => {
    if (!confirm("Delete this example?")) return;
    setReusableExamples((prev) => prev.filter((x) => x.id !== id));
  };

  /* ------------------------------ UI ------------------------------ */
  const schemaKeys = (schemas || []).map((s) => s.name);
  const responseKeys = (reusableResponses || []).map((r) => r.key);
  const requestBodyKeys = (reusableRequestBodies || []).map((rb) => rb.key);
  const paramKeys = (reusableParams || []).map((p) => p.key);
  const headerKeys = (reusableHeaders || []).map((h) => h.key);

  return (
    <div className={styles.schemaPanel}>
      <h3>Reusable Examples</h3>

      {reusableExamples?.length ? (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Examples</div>
          {reusableExamples.map((e) => (
            <div key={e.id} className={styles.savedRow}>
              <span className={styles.savedName}>{e.key}</span>
              <div className={styles.savedActions}>
                <button className={styles.addBtn} onClick={() => startEdit(e.id)}>
                  Edit
                </button>
                <button className={styles.addBtn} onClick={() => duplicate(e.id)}>
                  Duplicate
                </button>
                <button className={styles.inlineDeleteBtn} onClick={() => remove(e.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {(editingExamples || []).map((d, idx) => {
        const jsonNode =
          d.mode === "form"
            ? resolveTargetJsonNode(d.targetType, d.targetKey /*, d.mediaType */)
            : null;

        return (
          <div key={d.id} className={styles.schemaBlock}>
            <div className={styles.fieldRow}>
              <input
                className={styles.metaInput}
                placeholder="Ref key (e.g., ErrorExample)"
                value={d.key}
                onChange={(e) => update(idx, "key", e.target.value)}
              />
              <select
                className={styles.metaInput}
                value={d.mode}
                onChange={(e) => update(idx, "mode", e.target.value)}
                title="Editing mode"
              >
                <option value="form">Form (from schema)</option>
                <option value="raw">Raw JSON</option>
                <option value="external">External URL</option>
              </select>
              <button className={styles.inlineDeleteBtn} onClick={() => discard(idx)}>
                Discard
              </button>
            </div>

            <div className={styles.fieldRow}>
              <select
                className={styles.metaInput}
                value={d.targetType}
                onChange={(e) => update(idx, "targetType", e.target.value)}
                title="Attach/derive shape from"
              >
                <option value="schemas">schemas</option>
                <option value="responses">responses</option>
                <option value="requestBodies">requestBodies</option>
                <option value="parameters">parameters</option>
                <option value="headers">headers</option>
                <option value="none">none</option>
              </select>

              {d.targetType === "schemas" && (
                <select
                  className={styles.metaInput}
                  value={d.targetKey || ""}
                  onChange={(e) => update(idx, "targetKey", e.target.value)}
                >
                  <option value="">— select schema —</option>
                  {schemaKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}
              {d.targetType === "responses" && (
                <select
                  className={styles.metaInput}
                  value={d.targetKey || ""}
                  onChange={(e) => update(idx, "targetKey", e.target.value)}
                >
                  <option value="">— select response —</option>
                  {responseKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}
              {d.targetType === "requestBodies" && (
                <select
                  className={styles.metaInput}
                  value={d.targetKey || ""}
                  onChange={(e) => update(idx, "targetKey", e.target.value)}
                >
                  <option value="">— select requestBody —</option>
                  {requestBodyKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}
              {d.targetType === "parameters" && (
                <select
                  className={styles.metaInput}
                  value={d.targetKey || ""}
                  onChange={(e) => update(idx, "targetKey", e.target.value)}
                >
                  <option value="">— select parameter —</option>
                  {paramKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}
              {d.targetType === "headers" && (
                <select
                  className={styles.metaInput}
                  value={d.targetKey || ""}
                  onChange={(e) => update(idx, "targetKey", e.target.value)}
                >
                  <option value="">— select header —</option>
                  {headerKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}

              {(d.targetType === "responses" || d.targetType === "requestBodies") && (
                <input
                  className={styles.metaInput}
                  placeholder="media type (default application/json)"
                  value={d.mediaType || "application/json"}
                  onChange={(e) => update(idx, "mediaType", e.target.value)}
                />
              )}
            </div>

            {d.mode === "external" && (
              <input
                className={styles.metaInput}
                placeholder="externalValue URL"
                value={d.externalValue || ""}
                onChange={(e) => update(idx, "externalValue", e.target.value)}
              />
            )}

            {d.mode === "raw" && (
              <textarea
                className={styles.metaInput}
                style={{ minHeight: 140 }}
                placeholder="value JSON"
                value={d.valueJson || ""}
                onChange={(e) => update(idx, "valueJson", e.target.value)}
              />
            )}

            {d.mode === "form" && (
              <>
                {!jsonNode ? (
                  <div className={styles.emptyMessage}>
                    Pick a target with a resolvable schema (or switch to Raw/External).
                  </div>
                ) : (
                  <NodeEditor
                    node={jsonNode}
                    value={d.structuredValue}
                    onChange={(nv) => update(idx, "structuredValue", nv)}
                  />
                )}
              </>
            )}

            <input
              className={styles.metaInput}
              placeholder="Summary (optional)"
              value={d.summary || ""}
              onChange={(e) => update(idx, "summary", e.target.value)}
            />

            <div className={styles.enumEditor} style={{ marginTop: 8 }}>
              <div className={styles.enumHeader}>
                <span>Preview</span>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }} className={styles.previewBox}>
                {d.mode === "external"
                  ? `externalValue: ${d.externalValue || "(none)"}`
                  : d.mode === "raw"
                  ? safePrettyJson(d.valueJson)
                  : safePrettyObj(d.structuredValue)}
              </pre>
            </div>

            <button className={styles.saveBtn} onClick={() => submit(idx)}>
              {d.__editId ? "💾 Update Example" : "✅ Save Example"}
            </button>
          </div>
        );
      })}

      <button className={styles.addBtn} onClick={startNew}>
        + New Example
      </button>
    </div>
  );
}
