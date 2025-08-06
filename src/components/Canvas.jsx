import { useDrop } from "react-dnd";
import { useState, useEffect } from "react";
import styles from "./Canvas.module.css";
import yaml from "js-yaml";
import YamlEditor from "./YamlEditor";
import SwaggerPreview from "./SwaggerPreview";

export default function Canvas() {
  const [blocks, setBlocks] = useState([]);
  const [openapi, setOpenapi] = useState({});
  const [schemas, setSchemas] = useState([]);
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

  const addNewSchema = () => {
  setSchemas((prev) => [...prev, { name: "", fields: [] }]);
};

  const updateSchemaName = (index, newName) => {
    setSchemas((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name: newName } : s))
    );
  };

  const addSchemaField = (schemaIndex) => {
    setSchemas((prev) =>
      prev.map((s, i) =>
        i === schemaIndex
          ? { ...s, fields: [...s.fields, { name: "", type: "string" }] }
          : s
      )
    );
  };

  const updateSchemaField = (schemaIndex, fieldIndex, key, value) => {
    setSchemas((prev) =>
      prev.map((s, i) => {
        if (i !== schemaIndex) return s;
        const fields = [...s.fields];
        fields[fieldIndex][key] = value;
        return { ...s, fields };
      })
    );
  };

  const deleteSchemaField = (schemaIndex, fieldIndex) => {
    setSchemas((prev) =>
      prev.map((s, i) => {
        if (i !== schemaIndex) return s;
        const fields = s.fields.filter((_, j) => j !== fieldIndex);
        return { ...s, fields };
      })
    );
  };


  // Build OpenAPI spec + convert to YAML
  useEffect(() => {
    try {
      const parsed = yaml.load(yamlSpec);

      // Reset the paths
      parsed.paths = {};

      // Generate endpoint paths from blocks
      blocks.forEach((block) => {
        const { method, path, operationId, description } = block;
        if (!parsed.paths[path]) {
          parsed.paths[path] = {};
        }
        parsed.paths[path][method] = {
          summary: `${method.toUpperCase()} ${path}`,
          operationId,
          description,
          responses: {
            "200": {
              description: "Success",
            },
          },
        };
      });

      // Add component schemas
      parsed.components = parsed.components || {};
      parsed.components.schemas = {};

      schemas.forEach((schema) => {
        if (!schema.name) return;

        const properties = {};
        const required = [];

        schema.fields.forEach((field) => {
          if (field.name) {
            properties[field.name] = { type: field.type };
            required.push(field.name);
          }
        });

        parsed.components.schemas[schema.name] = {
          type: "object",
          properties,
          required,
        };
      });

      setOpenapi(parsed);

      // Convert updated spec back to YAML
      const newYaml = yaml.dump(parsed);
      setYamlSpec(newYaml);
    } catch (e) {
      console.error("Failed to parse or update YAML", e);
    }
  }, [blocks, schemas]);

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
    {/* Schema Management */}
    {/* Schema Builder */}
    <div className={styles.schemaPanel}>
      <h3>Component Schemas</h3>
      {schemas.map((schema, sIdx) => (
        <div key={sIdx} className={styles.schemaBlock}>
          <input
            className={styles.metaInput}
            value={schema.name}
            onChange={(e) => updateSchemaName(sIdx, e.target.value)}
            placeholder="Schema Name"
          />
          {(schema.fields ?? []).map((field, fIdx) => (
            <div key={fIdx} className={styles.fieldRow}>
              <input
                className={styles.metaInput}
                value={field.name}
                onChange={(e) => updateSchemaField(sIdx, fIdx, "name", e.target.value)}
                placeholder="Field Name"
              />
              <select
                className={styles.metaInput}
                value={field.type}
                onChange={(e) => updateSchemaField(sIdx, fIdx, "type", e.target.value)}
              >
                <option value="string">string</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
                <option value="number">number</option>
              </select>
              <button onClick={() => deleteSchemaField(sIdx, fIdx)} className={styles.deleteBtn}>
                ✕
              </button>
            </div>
          ))}
          <button onClick={() => addSchemaField(sIdx)} className={styles.addBtn}>
            + Add Field
          </button>
        </div>
      ))}

      <button onClick={addNewSchema} className={styles.addBtn}>+ New Schema</button>
    </div>

  </div>
);
}
