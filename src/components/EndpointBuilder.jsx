// src/components/EndpointBuilder.jsx
import { useMemo } from "react";
import ResponseEditor from "./ResponseEditor";
import ParametersEditor from "./ParametersEditor";
import styles from "./Canvas.module.css";

export default function EndpointBuilder({ blocks, updateBlock, deleteBlock, schemas }) {
  // stable keys for details default open state if you want per-method defaults later
  const defaultOpen = useMemo(() => ({ params: true, responses: true }), []);

  return (
    <>
      {blocks.map((block, idx) => (
        <div key={idx} className={styles.endpointBlock}>
          {/* Header row: method pill + path + delete */}
          <div className={styles.endpointHeader}>
            <span className={styles.methodPill}>{block.method.toUpperCase()}</span>
            <input
              className={styles.pathInput}
              value={block.path}
              onChange={(e) => updateBlock(idx, "path", e.target.value)}
              placeholder="/new-path"
            />
            <button
              onClick={() => deleteBlock(idx)}
              className={styles.deleteBtn}
              aria-label="Delete endpoint"
              title="Delete endpoint"
            >
              ✕
            </button>
          </div>

          {/* OperationId + Description */}
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

          {/* Request / Response type selectors */}
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

          {/* Collapsible: Parameters */}
          <details open={defaultOpen.params} className={styles.section}>
            <summary className={styles.sectionSummary}>
              <span className={styles.sectionTitle}>Parameters</span>
              <button
                type="button"
                className={styles.addBtn}
                onClick={(e) => {
                  e.preventDefault(); // keep details from toggling on button click
                  const next = [...(block.parameters || []), { name: "", in: "query", required: false, description: "", type: "string" }];
                  updateBlock(idx, "parameters", next);
                }}
              >
                + Add Parameter
              </button>
            </summary>

            <div className={styles.sectionBody}>
              <ParametersEditor
                block={block}
                idx={idx}
                updateBlock={updateBlock}
              />
            </div>
          </details>

          {/* Collapsible: Responses */}
          <details open={defaultOpen.responses} className={styles.section}>
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
              <ResponseEditor
                block={block}
                idx={idx}
                updateBlock={updateBlock}
                schemas={schemas}
              />
            </div>
          </details>
        </div>
      ))}
    </>
  );
}
