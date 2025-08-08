// src/components/ParametersEditor.jsx
import styles from "./Canvas.module.css";

export default function ParametersEditor({ block, idx, updateBlock }) {
  const parameters = block.parameters || [];

  const updateParam = (pIdx, key, value) => {
    const next = parameters.map((p, i) => (i === pIdx ? { ...p, [key]: value } : p));
    updateBlock(idx, "parameters", next);
  };

  const addParam = () => {
    const next = [...parameters, { name: "", in: "query", required: false, description: "", type: "string" }];
    updateBlock(idx, "parameters", next);
  };

  const deleteParam = (pIdx) => {
    const next = parameters.filter((_, i) => i !== pIdx);
    updateBlock(idx, "parameters", next);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#1e293b" }}>
        <strong>Parameters</strong>
        <button className={styles.addBtn} onClick={addParam}>+ Add Parameter</button>
      </div>

      {parameters.length === 0 && (
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6,color: "#6b7280" }}>
          No parameters defined.
        </div>
      )}

      {parameters.map((param, pIdx) => (
        <div key={pIdx} className={styles.schemaBlock} style={{ marginTop: 8 }}>
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
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={param.required}
                onChange={(e) => updateParam(pIdx, "required", e.target.checked)}
              />
              Required
            </label>
            <select
              className={styles.metaInput}
              value={param.type}
              onChange={(e) => updateParam(pIdx, "type", e.target.value)}
            >
              <option value="string">string</option>
              <option value="integer">integer</option>
              <option value="boolean">boolean</option>
              <option value="number">number</option>
            </select>
            <button className={styles.deleteBtn} onClick={() => deleteParam(pIdx)}>✕</button>
          </div>
          <input
            className={styles.metaInput}
            placeholder="Description"
            value={param.description}
            onChange={(e) => updateParam(pIdx, "description", e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
