import ResponseEditor from "./ResponseEditor";
import ParametersEditor from "./ParametersEditor";
import styles from "./Canvas.module.css";

export default function EndpointBuilder({
  blocks,
  updateBlock,
  deleteBlock,
  schemas,
  duplicateBlock,
  reusableParams = [],            // components.parameters
  reusableResponses = [],         // components.responses  ✅ used below
  reusableRequestBodies = [],     // components.requestBodies (unused here)
}) {
  return (
    <>
      {blocks.map((block, idx) => (
        <details key={idx} className={styles.endpointDetails}>
          {/* Collapsed header */}
          <summary className={styles.endpointSummary}>
            <span className={styles.methodPill}>{block.method.toUpperCase()}</span>
            <span className={styles.pathLabel}>{block.path || "/new-path"}</span>

            <div className={styles.summaryActions}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  duplicateBlock?.(idx);
                }}
                className={styles.addBtn}
                title="Duplicate endpoint"
                aria-label="Duplicate endpoint"
              >
                ⧉
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  deleteBlock(idx);
                }}
                className={styles.deleteEndpointBtn}
                title="Delete endpoint"
                aria-label="Delete endpoint"
              >
                ✕
              </button>

              <span className={styles.chevron} aria-hidden>
                ▸
              </span>
            </div>
          </summary>

          {/* Expanded body */}
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

            {/* Tags */}
            <input
              className={styles.metaInput}
              value={block.tagsText || ""}
              onChange={(e) => updateBlock(idx, "tagsText", e.target.value)}
              placeholder="Tags (comma-separated, e.g. payments,admin)"
              title="Tags that group this endpoint in Swagger UI"
            />

            <textarea
              className={styles.metaInput}
              value={block.description}
              onChange={(e) => updateBlock(idx, "description", e.target.value)}
              placeholder="Description"
            />

            {/* Request Body Schema */}
            <select
              className={styles.metaInput}
              value={block.requestSchemaRef || ""}
              onChange={(e) => updateBlock(idx, "requestSchemaRef", e.target.value)}
              title="Request body schema"
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
                  <option key={s.name} value={`ref:${s.name}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>

              {/* NEW: inline components.requestBodies */}
              {Array.isArray(reusableRequestBodies) && reusableRequestBodies.length > 0 && (
                <optgroup label="components.requestBodies">
                  {reusableRequestBodies.map((rb) => (
                    <option key={rb.id} value={`rb:${rb.key}`}>
                      #/components/requestBodies/{rb.key}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Default 200 Response Body Schema — NOW includes components.responses */}
            <select
              className={styles.metaInput}
              value={block.responseSchemaRef || ""}
              onChange={(e) => updateBlock(idx, "responseSchemaRef", e.target.value)}
              title="Default 200 response body schema"
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
                  <option key={s.name} value={`ref:${s.name}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              {Array.isArray(reusableResponses) && reusableResponses.length > 0 && (
                <optgroup label="components.responses">
                  {reusableResponses.map((r) => (
                    <option key={r.id} value={`resp:${r.key}`}>
                      #/components/responses/{r.key}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Parameters */}
            <details className={styles.section} open>
              <summary className={styles.sectionSummary}>
                <span className={styles.sectionTitle}>Parameters</span>
              </summary>
              <div className={styles.sectionBody}>
                <ParametersEditor
                  block={block}
                  idx={idx}
                  updateBlock={updateBlock}
                  reusableParams={reusableParams}
                />
              </div>
            </details>

            {/* Responses */}
            <details className={styles.section} open>
              <summary className={styles.sectionSummary}>
                <span className={styles.sectionTitle}>Responses</span>
              </summary>
              <div className={styles.sectionBody}>
                <ResponseEditor
                  block={block}
                  idx={idx}
                  updateBlock={updateBlock}
                  schemas={schemas}
                  reusableResponses={reusableResponses} 
                />
              </div>
            </details>
          </div>
        </details>
      ))}
    </>
  );
}
