import { useDrop } from "react-dnd";
import { useState, useEffect } from "react";
import styles from "./Canvas.module.css";
import yaml from "js-yaml";

export default function Canvas() {
  const [blocks, setBlocks] = useState([]);
  const [openapi, setOpenapi] = useState({});
  const [yamlSpec, setYamlSpec] = useState("");

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "method",
    drop: (item) => {
      const newBlock = {
        method: item.method.toLowerCase(),
        path: "/new-path",
      };
      setBlocks((prev) => [...prev, newBlock]);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const updatePath = (index, newPath) => {
    setBlocks((prev) =>
      prev.map((block, i) =>
        i === index ? { ...block, path: newPath } : block
      )
    );
  };

  // Build OpenAPI spec + convert to YAML
  useEffect(() => {
    const spec = {
      openapi: "3.0.0",
      info: {
        title: "Swagger Builder API",
        version: "1.0.0",
      },
      paths: {},
    };

    blocks.forEach(({ method, path }) => {
      if (!spec.paths[path]) {
        spec.paths[path] = {};
      }
      spec.paths[path][method] = {
        summary: `${method.toUpperCase()} ${path}`,
        responses: {
          "200": {
            description: "Success",
          },
        },
      };
    });

    setOpenapi(spec);

    try {
      const yamlStr = yaml.dump(spec);
      setYamlSpec(yamlStr);
    } catch (e) {
      console.error("YAML generation failed", e);
    }
  }, [blocks]);

  return (
    <div className={styles.canvasContainer}>
      <div
        ref={drop}
        className={styles.canvas}
        style={{ backgroundColor: isOver ? "#eef" : "#fdfdfd" }}
      >
        <h2>Drop here to create endpoints</h2>
        {blocks.map((block, idx) => (
          <div key={idx} className={styles.endpointBlock}>
            <input
              className={styles.pathInput}
              value={block.path}
              onChange={(e) => updatePath(idx, e.target.value)}
            />
            <span className={styles.method}>{block.method.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* YAML view */}
      <div className={styles.specViewer}>
        <h3>Generated OpenAPI YAML</h3>
        <pre>{yamlSpec}</pre>
      </div>
    </div>
  );
}

