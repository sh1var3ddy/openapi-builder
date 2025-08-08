// src/components/EndpointBuilder.jsx

import styles from "./Canvas.module.css";
import ResponseEditor from "./ResponseEditor";

export default function EndpointBuilder({ blocks, updateBlock, deleteBlock, schemas }) {
  return (
    <>
      {blocks.map((block, idx) => (
        <div key={idx} className={styles.endpointBlock}>
          <input
            className={styles.pathInput}
            value={block.path}
            onChange={(e) => updateBlock(idx, "path", e.target.value)}
            placeholder="/new-path"
          />
          <input
            className={styles.metaInput}
            value={block.operationId}
            onChange={(e) =>
              updateBlock(idx, "operationId", e.target.value)
            }
            placeholder="operationId"
          />
          <textarea
            className={styles.metaInput}
            value={block.description}
            onChange={(e) =>
              updateBlock(idx, "description", e.target.value)
            }
            placeholder="Description"
          />

          {/* ✅ Request Schema Selector */}
          <select
            className={styles.metaInput}
            value={block.requestSchemaRef || ""}
            onChange={(e) =>
              updateBlock(idx, "requestSchemaRef", e.target.value)
            }
          >
            <option value="">No Request Body</option>
            {schemas.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* ✅ Response Schema Selector */}
          <select
            className={styles.metaInput}
            value={block.responseSchemaRef || ""}
            onChange={(e) =>
              updateBlock(idx, "responseSchemaRef", e.target.value)
            }
          >
            <option value="">No Response Body</option>
            {schemas.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <ResponseEditor
            block={block}
            idx={idx}
            updateBlock={updateBlock}
            schemas={schemas}
          />
          <span className={styles.method}>{block.method.toUpperCase()}</span>
          <button
            onClick={() => deleteBlock(idx)}
            className={styles.deleteBtn}
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
}
