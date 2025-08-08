import ResponseEditor from "./ResponseEditor";
import ParametersEditor from "./ParametersEditor";
import styles from "./Canvas.module.css";

export default function EndpointBuilder({ blocks, updateBlock, deleteBlock, schemas }) {
  return (
    <>
      {blocks.map((block, idx) => (
        <details key={idx} className={styles.endpointDetails}>
          {/* Header (summary) — compact, click to expand/collapse */}
          <summary className={styles.endpointSummary}>
            <span className={styles.methodPill}>{block.method.toUpperCase()}</span>
            <span className={styles.pathLabel}>{block.path || "/new-path"}</span>
            <span className={styles.chevron} aria-hidden>▸</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault(); // don't toggle collapse when deleting
                deleteBlock(idx);
              }}
              className={styles.deleteBtn}
              title="Delete endpoint"
            >
              ✕
            </button>
          </summary>

          {/* Body — full editor */}
          <div className={styles.endpointBody}>
            <div className={styles.endpointHeader}>
              <span className={styles.headerLabel}>Path</span>
              <input
                className={styles.pathInput}
                value={block.path}
                onChange={(e) => updateBlock(idx, "path", e.target.value)}
                placeholder="/new-path"
              />
            </div>

            <input
              className={styles.metaInput}
              value={block.operationId}
              onChange={(e) => updateBlock(idx, "operationId", e.target.value)}
              placeholder="operationId"
            />

            <textarea
              className={styles.metaInput}
              value={block.description}
              onChange={(e) => updateBlock(idx, "description", e.target.value)}
              placeholder="Description"
            />

            {/* Request / Response selectors */}
            <select
              className={styles.metaInput}
              value={block.requestSchemaRef || ""}
              onChange={(e) => updateBlock(idx, "requestSchemaRef", e.target.value)}
            >
              <option value="">No Request Body</option>
              <optgroup label="Primitive Types">
                <option value="type:string">string</option>
                <option value="type:integer">integer</option>
                <option value="type:boolean">boolean</option>
                <option value="type:number">number</option>
                <option value="type:double">double</option>
              </optgroup>
              <optgroup label="Component Schemas">
                {schemas.map((s) => (
                  <option key={s.name} value={`ref:${s.name}`}>{s.name}</option>
                ))}
              </optgroup>
            </select>

            <select
              className={styles.metaInput}
              value={block.responseSchemaRef || ""}
              onChange={(e) => updateBlock(idx, "responseSchemaRef", e.target.value)}
            >
              <option value="">No Response Body</option>
              <optgroup label="Primitive Types">
                <option value="type:string">string</option>
                <option value="type:integer">integer</option>
                <option value="type:boolean">boolean</option>
                <option value="type:number">number</option>
                <option value="type:double">double</option>
              </optgroup>
              <optgroup label="Component Schemas">
                {schemas.map((s) => (
                  <option key={s.name} value={`ref:${s.name}`}>{s.name}</option>
                ))}
              </optgroup>
            </select>

            {/* Collapsible sections already inside body */}
            <details className={styles.section} open>
              <summary className={styles.sectionSummary}>
                <span className={styles.sectionTitle}>Parameters</span>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    const next = [...(block.parameters || []), { name: "", in: "query", required: false, description: "", type: "string" }];
                    updateBlock(idx, "parameters", next);
                  }}
                >
                  + Add Parameter
                </button>
              </summary>
              <div className={styles.sectionBody}>
                <ParametersEditor block={block} idx={idx} updateBlock={updateBlock} />
              </div>
            </details>

            <details className={styles.section} open>
              <summary className={styles.sectionSummary}>
                <span className={styles.sectionTitle}>Responses</span>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    const next = [...(block.responses || []), { status: "200", description: "", schemaRef: "" }];
                    updateBlock(idx, "responses", next);
                  }}
                >
                  + Add Response
                </button>
              </summary>
              <div className={styles.sectionBody}>
                <ResponseEditor block={block} idx={idx} updateBlock={updateBlock} schemas={schemas} />
              </div>
            </details>
          </div>
        </details>
      ))}
    </>
  );
}
