import { useDrop } from "react-dnd";
import { useState, useEffect } from "react";
import styles from "./Canvas.module.css";
import yaml from "js-yaml";
import YamlEditor from "./YamlEditor";
import SwaggerPreview from "./SwaggerPreview";

export default function Canvas() {
  const [blocks, setBlocks] = useState([]);
  const [openapi, setOpenapi] = useState({});
  const [yamlSpec, setYamlSpec] = useState(() =>
    yaml.dump({
      openapi: "3.0.0",
      info: {
        title: "Swagger Builder API",
        version: "1.0.0",
        description: "Generated using drag-and-drop builder",
      },
      servers: [
        {
          url: "http://localhost:8080/api",
          description: "Development server",
        },
      ],
      paths: {},
    })
  );


  const [{ isOver }, drop] = useDrop(() => ({
    accept: "method",
    drop: (item) => {
      const newBlock = {
        method: item.method.toLowerCase(),
        path: "/new-path",
        operationId: `${item.method.toLowerCase()}_${Date.now()}`,
        description: "",
      };
      setBlocks((prev) => [...prev, newBlock]);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const downloadYaml = () => {
    const blob = new Blob([yamlSpec], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "openapi.yaml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const deleteBlock = (index) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePath = (index, newPath) => {
    setBlocks((prev) =>
      prev.map((block, i) =>
        i === index ? { ...block, path: newPath } : block
      )
    );
  };

  const updateBlock = (index, key, value) => {
    setBlocks((prev) =>
      prev.map((block, i) =>
        i === index ? { ...block, [key]: value } : block
      )
    );
  };

  // Build OpenAPI spec + convert to YAML
  useEffect(() => {
    try {
      // Parse the current YAML spec
      const parsed = yaml.load(yamlSpec);

      // Replace the 'paths' with the ones generated from blocks
      parsed.paths = {};

      blocks.forEach((block) => {
          const { method, path } = block;
          if (!parsed.paths[path]) {
            parsed.paths[path] = {};
          }
          parsed.paths[path][method] = {
            summary: `${method.toUpperCase()} ${path}`,
            operationId: block.operationId,
            description: block.description,
            responses: {
              "200": {
                description: "Success",
              },
            },
          };
      });

    setOpenapi(parsed);

    // Convert back to YAML
    const newYaml = yaml.dump(parsed);
      setYamlSpec(newYaml);
    } catch (e) {
      console.error("Failed to parse or update YAML", e);
    }
  }, [blocks]);

  return (
  <div className={styles.canvasContainer}>
    {/* Canvas for endpoints */}
    <div
      ref={drop}
      className={styles.canvas}
      style={{ backgroundColor: isOver ? "#1e2a3a" : undefined }}
    >
      <h2>Drop here to create endpoints</h2>
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
            onChange={(e) => updateBlock(idx, "operationId", e.target.value)}
            placeholder="operationId"
          />
          <textarea
            className={styles.metaInput}
            value={block.description}
            onChange={(e) => updateBlock(idx, "description", e.target.value)}
            placeholder="Description"
          />
          <span className={styles.method}>{block.method.toUpperCase()}</span>
          <button onClick={() => deleteBlock(idx)} className={styles.deleteBtn}>✕</button>
        </div>
      ))}
    </div>

    {/* YAML Editor */}
    <div className={styles.specViewer}>
      <div className={styles.specHeader}>
        <h3>Generated OpenAPI YAML</h3>
        <button onClick={downloadYaml} className={styles.downloadBtn}>
          Download YAML
        </button>
      </div>
      <YamlEditor yamlText={yamlSpec} onChange={(value) => setYamlSpec(value)} />
    </div>

    {/* Swagger UI */}
    <div className={styles.swaggerPanel}>
      <h3>Swagger UI Preview</h3>
      {(() => {
        try {
          const parsedSpec = yaml.load(yamlSpec);
          return <SwaggerPreview spec={parsedSpec} />;
        } catch (err) {
          return <p style={{ color: "red" }}>Invalid YAML</p>;
        }
      })()}
    </div>
  </div>
);
}
