// src/components/ResponseBuilder.jsx
import styles from "./Canvas.module.css";

const uid = () => Math.random().toString(36).slice(2, 9);

export default function ResponseBuilder({
  reusableResponses,
  setReusableResponses,
  editingResponses,
  setEditingResponses,
  schemas = [],
}) {
  const startNew = () => {
    setEditingResponses(prev => [
      ...prev,
      {
        id: uid(),
        key: "",                 // ref name in components.responses
        description: "",
        mediaType: "application/json",
        schemaMode: "none",      // none | primitive | ref
        primitiveType: "string", // when schemaMode=primitive
        primitiveFormat: "",
        refName: "",             // when schemaMode=ref
        __editId: null,
      }
    ]);
  };

  const updateDraft = (idx, key, val) =>
    setEditingResponses(prev => prev.map((r,i)=> i===idx ? { ...r, [key]: val } : r));

  const discardDraft = (idx) =>
    setEditingResponses(prev => prev.filter((_,i)=> i!==idx));

  const submit = (idx) => {
    const d = editingResponses[idx];
    if (!d.key) return alert("Response key is required");
    const packed = { ...d };
    delete packed.__editId;
    if (d.__editId) {
      setReusableResponses(prev => prev.map(r => r.id === d.__editId ? packed : r));
    } else {
      setReusableResponses(prev => [...prev, packed]);
    }
    discardDraft(idx);
  };

  const startEdit = (id) => {
    const r = reusableResponses.find(x=>x.id===id);
    if (!r) return;
    setEditingResponses(prev => [...prev, { ...JSON.parse(JSON.stringify(r)), __editId: id }]);
  };

  const duplicate = (id) => {
    const r = reusableResponses.find(x=>x.id===id);
    if (!r) return;
    const copy = { ...JSON.parse(JSON.stringify(r)), id: uid(), key: `${r.key}_copy` };
    setReusableResponses(prev => [...prev, copy]);
    setTimeout(()=> startEdit(copy.id), 0);
  };

  const deleteSaved = (id) => {
    if (!confirm("Delete this reusable response?")) return;
    setReusableResponses(prev => prev.filter(r=>r.id!==id));
  };

  return (
    <div>
      {reusableResponses?.length > 0 && (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Responses</div>
          {reusableResponses.map((r)=>(
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

      {(editingResponses||[]).map((d, idx)=>(
        <div key={d.id} className={styles.schemaBlock}>
          <div className={styles.fieldRow}>
            <input className={styles.metaInput} placeholder="Response key (e.g., OkJson)" value={d.key} onChange={e=>updateDraft(idx,"key",e.target.value)}/>
            <input className={styles.metaInput} placeholder="Description" value={d.description||""} onChange={e=>updateDraft(idx,"description",e.target.value)}/>
            <input className={styles.metaInput} placeholder="Media type" value={d.mediaType||"application/json"} onChange={e=>updateDraft(idx,"mediaType",e.target.value)}/>
            <select className={styles.metaInput} value={d.schemaMode} onChange={e=>updateDraft(idx,"schemaMode",e.target.value)}>
              <option value="none">no schema</option>
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

          <button className={styles.saveBtn} onClick={()=>submit(idx)}>
            {d.__editId ? "💾 Update Response" : "✅ Save Response"}
          </button>
        </div>
      ))}

      <button className={styles.addBtn} onClick={startNew}>+ New Response</button>
    </div>
  );
}
