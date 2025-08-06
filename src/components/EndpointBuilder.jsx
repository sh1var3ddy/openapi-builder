// src/components/EndpointBuilder.jsx

import styles from "./Canvas.module.css";

export default function EndpointBuilder({ blocks, updateBlock, deleteBlock }) {
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
