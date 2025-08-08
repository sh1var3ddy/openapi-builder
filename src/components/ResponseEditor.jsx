// src/components/ResponseEditor.jsx
import styles from "./Canvas.module.css";

export default function ResponseEditor({ block, idx, updateBlock, schemas }) {
  const responses = block.responses || [];

  const updateResponse = (rIdx, key, value) => {
    const next = responses.map((r, i) => (i === rIdx ? { ...r, [key]: value } : r));
    updateBlock(idx, "responses", next);
  };

  const addResponse = () => {
    const next = [...responses, { status: "200", description: "", schemaRef: "" }];
    updateBlock(idx, "responses", next);
  };

  const deleteResponse = (rIdx) => {
    const next = responses.filter((_, i) => i !== rIdx);
    updateBlock(idx, "responses", next);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Responses</strong>
        <button className={styles.addBtn} onClick={addResponse}>+ Add Response</button>
      </div>

      {responses.length === 0 && (
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
          No custom responses. The default 200 from the dropdown (if any) will be used.
        </div>
      )}

      {responses.map((res, rIdx) => (
        <div key={rIdx} className={styles.schemaBlock} style={{ marginTop: 8 }}>
          <div className={styles.fieldRow}>
            <input
              className={styles.metaInput}
              placeholder="Status (e.g. 200, 201, 400)"
              value={res.status || ""}
              onChange={(e) => updateResponse(rIdx, "status", e.target.value)}
            />
            <input
              className={styles.metaInput}
              placeholder="Description"
              value={res.description || ""}
              onChange={(e) => updateResponse(rIdx, "description", e.target.value)}
            />
            <select
              className={styles.metaInput}
              value={res.schemaRef || ""}
              onChange={(e) => updateResponse(rIdx, "schemaRef", e.target.value)}
            >
              <option value="">No Body</option>
              {schemas.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            <button className={styles.deleteBtn} onClick={() => deleteResponse(rIdx)}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
