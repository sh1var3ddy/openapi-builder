// src/components/SecuritySchemesBuilder.jsx
import styles from "./Canvas.module.css";
const uid = () => Math.random().toString(36).slice(2, 9);

export default function SecuritySchemesBuilder({
  reusableSecurity,
  setReusableSecurity,
  editingSecurity,
  setEditingSecurity,
}) {
  const startNew = () => {
    setEditingSecurity((p) => [...p, { id: uid(), __editId: null, key: "", type: "http", scheme: "bearer", bearerFormat: "", name: "", in: "header", flowsJson: "{\n}", openIdConnectUrl: "" }]);
  };
  const update = (idx, k, v) => setEditingSecurity((p)=>p.map((d,i)=>i===idx?{...d,[k]:v}:d));
  const discard = (idx) => setEditingSecurity((p)=>p.filter((_,i)=>i!==idx));
  const submit = (idx) => {
    const d = editingSecurity[idx];
    if (!d?.key) return alert("Security scheme key is required.");
    if (!d?.type) return alert("Security scheme type is required.");

    const payload = { ...d };
    delete payload.__editId;

    if (d.__editId) {
      setReusableSecurity((prev)=>prev.map((x)=>x.id===d.__editId?payload:x));
    } else {
      setReusableSecurity((prev)=>[...prev, payload]);
    }
    discard(idx);
  };
  const startEdit = (id) => {
    const s = reusableSecurity.find((x)=>x.id===id);
    if (!s) return;
    setEditingSecurity((p)=>[...p, { ...JSON.parse(JSON.stringify(s)), __editId:id, id: uid() }]);
  };
  const duplicate = (id) => {
    const s = reusableSecurity.find((x)=>x.id===id);
    if (!s) return;
    const copy = { ...JSON.parse(JSON.stringify(s)), id: uid(), key: `${s.key}_copy` };
    setReusableSecurity((prev)=>[...prev, copy]);
    setTimeout(()=>startEdit(copy.id), 0);
  };
  const remove = (id) => {
    if (!confirm("Delete this security scheme?")) return;
    setReusableSecurity((prev)=>prev.filter((x)=>x.id!==id));
  };

  return (
    <div className={styles.schemaPanel}>
      <h3>Security Schemes</h3>

      {reusableSecurity?.length ? (
        <div className={styles.savedList}>
          <div className={styles.savedListHeader}>Saved Schemes</div>
          {reusableSecurity.map((s)=>(
            <div key={s.id} className={styles.savedRow}>
              <span className={styles.savedName}>{s.key}</span>
              <div className={styles.savedActions}>
                <button className={styles.addBtn} onClick={()=>startEdit(s.id)}>Edit</button>
                <button className={styles.addBtn} onClick={()=>duplicate(s.id)}>Duplicate</button>
                <button className={styles.inlineDeleteBtn} onClick={()=>remove(s.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ):null}

      {(editingSecurity || []).map((d, idx)=>{
        return (
          <div key={d.id} className={styles.schemaBlock}>
            <div className={styles.fieldRow}>
              <input className={styles.metaInput} placeholder="Ref key (e.g., BearerAuth)"
                     value={d.key} onChange={(e)=>update(idx,"key",e.target.value)} />
              <select className={styles.metaInput} value={d.type} onChange={(e)=>update(idx,"type",e.target.value)}>
                <option value="http">http</option>
                <option value="apiKey">apiKey</option>
                <option value="oauth2">oauth2</option>
                <option value="openIdConnect">openIdConnect</option>
              </select>
              <button className={styles.inlineDeleteBtn} onClick={()=>discard(idx)}>Discard</button>
            </div>

            {/* http */}
            {d.type === "http" && (
              <div className={styles.fieldRow}>
                <input className={styles.metaInput} placeholder='scheme ("basic" or "bearer")'
                       value={d.scheme||""} onChange={(e)=>update(idx,"scheme",e.target.value)} />
                <input className={styles.metaInput} placeholder="bearerFormat (optional)"
                       value={d.bearerFormat||""} onChange={(e)=>update(idx,"bearerFormat",e.target.value)} />
              </div>
            )}

            {/* apiKey */}
            {d.type === "apiKey" && (
              <div className={styles.fieldRow}>
                <input className={styles.metaInput} placeholder="name (e.g., X-API-Key)"
                       value={d.name||""} onChange={(e)=>update(idx,"name",e.target.value)} />
                <select className={styles.metaInput} value={d.in||"header"} onChange={(e)=>update(idx,"in",e.target.value)}>
                  <option value="header">header</option>
                  <option value="query">query</option>
                  <option value="cookie">cookie</option>
                </select>
              </div>
            )}

            {/* oauth2 */}
            {d.type === "oauth2" && (
              <div className={styles.fieldRow} style={{alignItems:"stretch"}}>
                <textarea className={styles.metaInput} style={{minHeight:140}} placeholder={`flows JSON (e.g.)
{
  "authorizationCode": {
    "authorizationUrl": "https://example.com/auth",
    "tokenUrl": "https://example.com/token",
    "scopes": { "read": "Read access" }
  }
}`}
                  value={d.flowsJson||""} onChange={(e)=>update(idx,"flowsJson",e.target.value)} />
              </div>
            )}

            {/* openIdConnect */}
            {d.type === "openIdConnect" && (
              <input className={styles.metaInput} placeholder="openIdConnectUrl"
                     value={d.openIdConnectUrl||""} onChange={(e)=>update(idx,"openIdConnectUrl",e.target.value)} />
            )}

            <button className={styles.saveBtn} onClick={()=>submit(idx)}>
              {d.__editId ? "💾 Update Scheme" : "✅ Save Scheme"}
            </button>
          </div>
        );
      })}

      <button className={styles.addBtn} onClick={startNew}>+ New Security Scheme</button>
    </div>
  );
}
