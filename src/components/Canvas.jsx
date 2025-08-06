import { useDrop } from "react-dnd";
import { useState, useEffect } from "react";
import styles from "./Canvas.module.css";
import yaml from "js-yaml";
import YamlEditor from "./YamlEditor";
import SwaggerPreview from "./SwaggerPreview";
import SchemaBuilder from "./SchemaBuilder";
import EndpointBuilder from "./EndpointBuilder";

export default function Canvas() {
  const [blocks, setBlocks] = useState([]);
  const [openapi, setOpenapi] = useState({});
  const [schemas, setSchemas] = useState([]);
  const [editingSchemas, setEditingSchemas] = useState([]);
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
        responses: [
          { status: "200", description: "Success", schemaRef: "" },
        ],
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

  const updateBlock = (index, key, value) => {
    setBlocks((prev) =>
      prev.map((block, i) =>
        i === index ? { ...block, [key]: value } : block
      )
    );
  };

  const deleteBlock = (index) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  // SCHEMA METHODS
  const startNewSchema = () => {
    setEditingSchemas((prev) => [...prev, { name: "", fields: [] }]);
  };

  const updateSchemaName = (i, name) => {
    setEditingSchemas((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, name } : s))
    );
  };

  const addField = (schemaIndex) => {
    setEditingSchemas((prev) =>
      prev.map((s, idx) =>
        idx === schemaIndex
          ? {
              ...s,
              fields: [...s.fields, { name: "", type: "string", enum: [] }],
            }
          : s
      )
    );
  };

  const updateField = (sIdx, fIdx, key, value) => {
    setEditingSchemas((prev) =>
      prev.map((schema, i) => {
        if (i !== sIdx) return schema;
        const fields = [...schema.fields];
        fields[fIdx][key] = value;
        return { ...schema, fields };
      })
    );
  };

  const deleteField = (sIdx, fIdx) => {
    setEditingSchemas((prev) =>
      prev.map((schema, i) => {
        if (i !== sIdx) return schema;
        const fields = schema.fields.filter((_, j) => j !== fIdx);
        return { ...schema, fields };
      })
    );
  };

  const submitSchema = (index) => {
    const schema = editingSchemas[index];
    if (!schema.name) return;

    setSchemas((prev) => [...prev, schema]);
    setEditingSchemas((prev) => prev.filter((_, i) => i !== index));
  };

  // YAML SYNC
  useEffect(() => {
    try {
      const parsed = yaml.load(yamlSpec);
      parsed.paths = {};

      blocks.forEach((block) => {
        const { method, path, operationId, description, responses = [] } = block;

        const responseMap = {};
        responses.forEach((res) => {
          const resp = {
            description: res.description || "",
          };
          if (res.schemaRef) {
            resp.content = {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${res.schemaRef}`,
                },
              },
            };
          }
          responseMap[res.status || "default"] = resp;
        });

        if (!parsed.paths[path]) parsed.paths[path] = {};
        parsed.paths[path][method] = {
          summary: `${method.toUpperCase()} ${path}`,
          operationId,
          description,
          responses: responseMap,
        };
      });

      parsed.components = parsed.components || {};
      parsed.components.schemas = {};

      schemas.forEach((schema) => {
        if (!schema.name) return;
        const properties = {};
        const required = [];

        schema.fields.forEach((field) => {
          if (!field.name) return;
          required.push(field.name);

          if (field.type === "enum") {
            properties[field.name] = {
              type: "string",
              enum: field.enum?.filter((v) => v?.trim()) || [],
            };
          } else if (field.type === "array") {
            if (field.itemsType === "$ref" && field.ref) {
              properties[field.name] = {
                type: "array",
                items: { $ref: `#/components/schemas/${field.ref}` },
              };
            } else {
              properties[field.name] = {
                type: "array",
                items: { type: field.itemsType || "string" },
              };
            }
          } else {
            properties[field.name] = { type: field.type };
          }
        });

        parsed.components.schemas[schema.name] = {
          type: "object",
          properties,
          required,
        };
      });

      setOpenapi(parsed);
      setYamlSpec(yaml.dump(parsed));
    } catch (e) {
      console.error("Failed to parse or update YAML", e);
    }
  }, [blocks, schemas]);

  return (
    <div className={styles.canvasContainer}>
      <div
        ref={drop}
        className={styles.canvas}
        style={{ backgroundColor: isOver ? "#1e2a3a" : undefined }}
      >
        <h2>Drop here to create endpoints</h2>
        <EndpointBuilder
          blocks={blocks}
          updateBlock={updateBlock}
          deleteBlock={deleteBlock}
        />
      </div>

      <div className={styles.specViewer}>
        <div className={styles.specHeader}>
          <h3>Generated OpenAPI YAML</h3>
          <button onClick={downloadYaml} className={styles.downloadBtn}>
            Download YAML
          </button>
        </div>
        <YamlEditor
          yamlText={yamlSpec}
          onChange={(value) => setYamlSpec(value)}
        />
      </div>

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

      <SchemaBuilder
        schemas={schemas}
        editingSchemas={editingSchemas}
        updateSchemaName={updateSchemaName}
        addField={addField}
        updateField={updateField}
        deleteField={deleteField}
        submitSchema={submitSchema}
        startNewSchema={startNewSchema}
      />
    </div>
  );
}
