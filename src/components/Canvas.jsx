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
        requestSchemaRef: "",
        responseSchemaRef: "",
        responses: [],
        parameters: [],
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
              fields: [
                ...s.fields,
                { name: "", type: "string", enum: [], required: true },
              ],
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
        const {
          method,
          path,
          operationId,
          description,
          responses = [],
          requestSchemaRef,
          responseSchemaRef,
        } = block;

        if (!parsed.paths[path]) parsed.paths[path] = {};

        const methodObject = {
          summary: `${method.toUpperCase()} ${path}`,
          operationId,
          description,
          responses: {},
        };

        // Parameters
        if (block.parameters && block.parameters.length > 0) {
          methodObject.parameters = block.parameters.map((param) => ({
            name: param.name,
            in: param.in,
            description: param.description,
            required: param.required,
            schema: { type: param.type },
          }));
        }

        // Request Body
        if (requestSchemaRef) {
          let schemaObj = {};
          if (requestSchemaRef.startsWith("ref:")) {
            schemaObj = {
              $ref: `#/components/schemas/${requestSchemaRef.replace("ref:", "")}`,
            };
          } else if (requestSchemaRef.startsWith("type:")) {
            const t = requestSchemaRef.replace("type:", "");
            schemaObj =
              t === "double"
                ? { type: "number", format: "double" }
                : { type: t };
          }
          methodObject.requestBody = {
            required: true,
            content: { "application/json": { schema: schemaObj } },
          };
        }

        // Custom Responses
        if (responses.length > 0) {
          responses.forEach((res) => {
            const resp = {
              description: res.description || "",
            };
            if (res.schemaRef) {
              let schemaObj = {};
              if (res.schemaRef.startsWith("ref:")) {
                schemaObj = {
                  $ref: `#/components/schemas/${res.schemaRef.replace("ref:", "")}`,
                };
              } else if (res.schemaRef.startsWith("type:")) {
                const t = res.schemaRef.replace("type:", "");
                schemaObj =
                  t === "double"
                    ? { type: "number", format: "double" }
                    : { type: t };
              }
              resp.content = { "application/json": { schema: schemaObj } };
            }
            methodObject.responses[res.status || "default"] = resp;
          });
        } else if (responseSchemaRef) {
          // Default 200 response from dropdown
          let schemaObj = {};
          if (responseSchemaRef.startsWith("ref:")) {
            schemaObj = {
              $ref: `#/components/schemas/${responseSchemaRef.replace("ref:", "")}`,
            };
          } else if (responseSchemaRef.startsWith("type:")) {
            const t = responseSchemaRef.replace("type:", "");
            schemaObj =
              t === "double"
                ? { type: "number", format: "double" }
                : { type: t };
          }
          methodObject.responses["200"] = {
            description: "Success",
            content: { "application/json": { schema: schemaObj } },
          };
        } else {
          // Fallback response
          methodObject.responses["200"] = {
            description: "Success",
          };
        }

        parsed.paths[path][method] = methodObject;
      });

      // Components > Schemas
      parsed.components = parsed.components || {};
      parsed.components.schemas = {};

      schemas.forEach((schema) => {
        if (!schema.name) return;

        const properties = {};
        const required = [];

        schema.fields.forEach((field) => {
          if (!field.name) return;
          if (field.required ?? true) required.push(field.name);

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
          } else if (field.type === "$ref" && field.ref) {
            // ✅ Proper direct schema reference
            properties[field.name] = {
              $ref: `#/components/schemas/${field.ref}`,
            };
          } else if (field.type === "double") {
            properties[field.name] = { type: "number", format: "double" };
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
        <h2 style={{ color: "#1e293b", fontWeight: "600" }}>
          Drop here to create endpoints
        </h2>
        <EndpointBuilder
          blocks={blocks}
          updateBlock={updateBlock}
          deleteBlock={deleteBlock}
          schemas={schemas}
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
