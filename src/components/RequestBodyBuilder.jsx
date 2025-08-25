// src/components/RequestBodyBuilder.jsx
import styles from "./Canvas.module.css";

const uid = () => Math.random().toString(36).slice(2, 9);

export default function RequestBodyBuilder({
  reusableRequestBodies,
  setReusableRequestBodies,
  editingRequestBodies,
  setEditingRequestBodies,
  schemas = [],
  reusableExamples = [],            // 👈 NEW: pass from ComponentsPanel
}) {
  const startNew = () => {
    setEditingRequestBodies(prev => [
      ...prev,
      {
        id: uid(),
        key: "",
        description: "",
        mediaType: "application/json",
        required: true,
        schemaMode: "ref",
        primitiveType: "string",
        primitiveFormat: "",
        refName: "",
        exampleRef: "",              // 👈 NEW
        __editId: null,
      }
    ]);
  };

  const updateDraft = (idx, key, val) =>
    setEditingRequestBodies(prev => prev.map((r,i)=> i===idx ? { ...r, [key]: val } : r));

  const discardDraft = (idx) =>
    setEditingRequestBodies(prev => prev.filter((_,i)=> i!==idx));

  const submit = (idx) => {
    const d = editingRequestBodies[idx];
    if (!d.key) return alert("Request body key is required");
    const packed = { ...d };
    delete packed.__editId;
    if (d.__editId) {
      setReusableRequestBodies(prev => prev.map(r => r.id === d.__editId ? packed : r));
    } else {
      setReusableRequestBodies(prev => [...prev, packed]);
    }
    discardDraft(idx);
  };

  const startEdit = (id) => {
    const r = reusableRequestBodies.find(x=>x.id===id);
    if (!r) return;
    setEditingRequestBodies(prev => [...prev, { ...JSON.parse(JSON.stringify(r)), __editId: id }]);
  };

  const duplicate = (id) => {
    const r = reusableRequestBodies.find(x=>x.id===id);
    if (!r) return;
    const copy = { ...JSON.parse(JSON.stringify(r)), id: uid(), key: `${r.key}_copy` };
    setReusableRequestBodies(prev => [...prev, copy]);
    setTimeout(()=> startEdit(copy.id), 0);
  };

  const deleteSaved = (id) => {
    if (!confirm("Delete this reusable request body?")) return;
    setReusableRequestBodies(prev => prev.filter(r=>r.id!==id));
  };

  return (
    <div>
      {reusableRequestBodies?.length > 0 && (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Request Bodies</div>
          {reusableRequestBodies.map((r)=>(
            <div key={r.id} className={styles.savedRow}>
              <span className={styles.savedName}>{r.key}</span>
              <div className={styles.savedActions}>
                <button className={styles.addBtn} onClick={()=>startEdit(r.id)}>Edit</button>
                <button className={styles.addBtn} onClick={()=>duplicate(r.id)}>Duplicate</button>
                <button className={styles.inlineDeleteBtn} onClick={()=>deleteSaved(r.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editingRequestBodies||[]).map((d, idx)=>(
        <div key={d.id} className={styles.schemaBlock}>
          <div className={styles.fieldRow}>
            <input className={styles.metaInput} placeholder="Request body key (e.g., CreateUserJson)" value={d.key} onChange={e=>updateDraft(idx,"key",e.target.value)}/>
            <input className={styles.metaInput} placeholder="Description" value={d.description||""} onChange={e=>updateDraft(idx,"description",e.target.value)}/>
            <input className={styles.metaInput} placeholder="Media type" value={d.mediaType||"application/json"} onChange={e=>updateDraft(idx,"mediaType",e.target.value)}/>
            <label style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="checkbox" checked={!!d.required} onChange={(e)=>updateDraft(idx,"required",e.target.checked)} />
              Required
            </label>
            <select className={styles.metaInput} value={d.schemaMode} onChange={e=>updateDraft(idx,"schemaMode",e.target.value)}>
              <option value="primitive">primitive</option>
              <option value="ref">schema $ref</option>
            </select>
            <button className={styles.inlineDeleteBtn} onClick={()=>discardDraft(idx)}>Discard</button>
          </div>

          {d.schemaMode === "primitive" && (
            <div className={styles.fieldRow}>
              <select className={styles.metaInput} value={d.primitiveType} onChange={(e)=>updateDraft(idx,"primitiveType",e.target.value)}>
                <option value="string">string</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
                <option value="number">number</option>
                <option value="double">double</option>
              </select>
              <input className={styles.metaInput} placeholder="format (optional)" value={d.primitiveFormat||""} onChange={e=>updateDraft(idx,"primitiveFormat",e.target.value)}/>
            </div>
          )}

          {d.schemaMode === "ref" && (
            <div className={styles.fieldRow}>
              <select className={styles.metaInput} value={d.refName||""} onChange={e=>updateDraft(idx,"refName",e.target.value)}>
                <option value="">-- Select schema --</option>
                {(schemas||[]).map(s=>(
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 👇 NEW: Example picker from components.examples */}
          <div className={styles.fieldRow}>
            <select
              className={styles.metaInput}
              value={d.exampleRef || ""}
              onChange={(e)=>updateDraft(idx, "exampleRef", e.target.value || "")}
              title="Example (from components.examples)"
            >
              <option value="">No Example</option>
              {(reusableExamples || []).map((ex) => (
                <option key={ex.id} value={`ex:${ex.key}`}>
                  #/components/examples/{ex.key}
                </option>
              ))}
            </select>
            <span className={styles.hintText}>
              Emits <code>content[mediaType].examples[&lt;key&gt;].$ref</code>
            </span>
          </div>

          <button className={styles.saveBtn} onClick={()=>submit(idx)}>
            {d.__editId ? "💾 Update Request Body" : "✅ Save Request Body"}
          </button>
        </div>
      ))}

      <button className={styles.addBtn} onClick={startNew}>+ New Request Body</button>
    </div>
  );
}
