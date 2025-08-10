// src/components/ExamplesBuilder.jsx
import styles from "./Canvas.module.css";
const uid = () => Math.random().toString(36).slice(2, 9);

export default function ExamplesBuilder({
  reusableExamples,
  setReusableExamples,
  editingExamples,
  setEditingExamples,
}) {
  const startNew = () => {
    setEditingExamples((prev) => [
      ...prev,
      { id: uid(), __editId: null, key: "", summary: "", valueJson: "", externalValue: "" },
    ]);
  };
  const update = (idx, k, v) =>
    setEditingExamples((prev) => prev.map((d, i) => (i === idx ? { ...d, [k]: v } : d)));
  const discard = (idx) => setEditingExamples((prev) => prev.filter((_, i) => i !== idx));
  const submit = (idx) => {
    const d = editingExamples[idx];
    if (!d?.key) return alert("Example key is required.");
    // if externalValue provided, we ignore valueJson when serializing (spec rule)
    const payload = { ...d };
    delete payload.__editId;
    if (d.__editId) {
      setReusableExamples((prev) => prev.map((x) => (x.id === d.__editId ? payload : x)));
    } else {
      setReusableExamples((prev) => [...prev, payload]);
    }
    discard(idx);
  };
  const startEdit = (id) => {
    const ex = reusableExamples.find((x) => x.id === id);
    if (!ex) return;
    setEditingExamples((prev) => [...prev, { ...JSON.parse(JSON.stringify(ex)), __editId: id, id: uid() }]);
  };
  const duplicate = (id) => {
    const ex = reusableExamples.find((x) => x.id === id);
    if (!ex) return;
    const copy = { ...JSON.parse(JSON.stringify(ex)), id: uid(), key: `${ex.key}_copy` };
    setReusableExamples((prev) => [...prev, copy]);
    setTimeout(() => startEdit(copy.id), 0);
  };
  const remove = (id) => {
    if (!confirm("Delete this example?")) return;
    setReusableExamples((prev) => prev.filter((x) => x.id !== id));
  };

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
                <button className={styles.addBtn} onClick={() => startEdit(e.id)}>Edit</button>
                <button className={styles.addBtn} onClick={() => duplicate(e.id)}>Duplicate</button>
                <button className={styles.inlineDeleteBtn} onClick={() => remove(e.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {(editingExamples || []).map((d, idx) => (
        <div key={d.id} className={styles.schemaBlock}>
          <div className={styles.fieldRow}>
            <input className={styles.metaInput} placeholder="Ref key (e.g., ErrorExample)"
                   value={d.key} onChange={(e)=>update(idx,"key",e.target.value)} />
            <button className={styles.inlineDeleteBtn} onClick={()=>discard(idx)}>Discard</button>
          </div>
          <input className={styles.metaInput} placeholder="Summary (optional)"
                 value={d.summary||""} onChange={(e)=>update(idx,"summary",e.target.value)} />

          <div className={styles.fieldRow}>
            <textarea className={styles.metaInput} style={{minHeight:100}} placeholder='value JSON (ignored if externalValue is set)'
                      value={d.valueJson||""} onChange={(e)=>update(idx,"valueJson",e.target.value)} />
            <input className={styles.metaInput} placeholder="externalValue URL (optional)"
                   value={d.externalValue||""} onChange={(e)=>update(idx,"externalValue",e.target.value)} />
          </div>

          <button className={styles.saveBtn} onClick={()=>submit(idx)}>
            {d.__editId ? "💾 Update Example" : "✅ Save Example"}
          </button>
        </div>
      ))}

      <button className={styles.addBtn} onClick={startNew}>+ New Example</button>
    </div>
  );
}
