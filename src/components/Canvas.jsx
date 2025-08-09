// src/components/Canvas.jsx
import { useDrop } from "react-dnd";
import { useState, useEffect } from "react";
import styles from "./Canvas.module.css";
import yaml from "js-yaml";
import YamlEditor from "./YamlEditor";
import SwaggerPreview from "./SwaggerPreview";
import SchemaBuilder from "./SchemaBuilder";
import EndpointBuilder from "./EndpointBuilder";

const uid = () => Math.random().toString(36).slice(2, 9);

export default function Canvas() {
  const [blocks, setBlocks] = useState([]);
  const [openapi, setOpenapi] = useState({});
  const [schemas, setSchemas] = useState([]);
  const [editingSchemas, setEditingSchemas] = useState([]);
  const [defaultTagsText, setDefaultTagsText] = useState(""); // ✅ default tags UI string

  const parseTags = (txt) =>
    String(txt || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const clearWorkspace = () => {
    if (!confirm("Clear all endpoints, schemas, and YAML? This can’t be undone.")) return;
    setBlocks([]);
    setSchemas([]);
    setEditingSchemas([]);
    setYamlSpec(
      yaml.dump({
        openapi: "3.0.0",
        info: {
          title: "Swagger Builder API",
          version: "1.0.0",
          description: "Generated using drag-and-drop builder",
        },
        servers: [{ url: "http://localhost:8080/api", description: "Development server" }],
        paths: {},
      })
    );
    localStorage.removeItem("swaggerBlocks");
    localStorage.removeItem("swaggerSchemas");
    localStorage.removeItem("swaggerYaml");
    localStorage.removeItem("swaggerDefaultTagsText");
  };

  const duplicateBlock = (index) => {
    setBlocks((prev) => {
      const src = prev[index];
      if (!src) return prev;
      const clone = {
        ...JSON.parse(JSON.stringify(src)),
        operationId: `${src.method}_${Date.now()}`, // new opId
      };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

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

  // ✅ Load saved data on first render
  useEffect(() => {
    try {
      const savedBlocks = JSON.parse(localStorage.getItem("swaggerBlocks") || "[]");
      const savedSchemas = JSON.parse(localStorage.getItem("swaggerSchemas") || "[]");
      const savedYaml = localStorage.getItem("swaggerYaml");
      const savedDefaultTagsText = localStorage.getItem("swaggerDefaultTagsText") || "";

      if (Array.isArray(savedBlocks) && savedBlocks.length) setBlocks(savedBlocks);
      if (Array.isArray(savedSchemas) && savedSchemas.length) setSchemas(savedSchemas);
      if (typeof savedYaml === "string" && savedYaml.trim()) setYamlSpec(savedYaml);
      setDefaultTagsText(savedDefaultTagsText);
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // ✅ Save to localStorage whenever changes happen
  useEffect(() => {
    try {
      localStorage.setItem("swaggerBlocks", JSON.stringify(blocks));
      localStorage.setItem("swaggerSchemas", JSON.stringify(schemas));
      localStorage.setItem("swaggerYaml", yamlSpec);
      localStorage.setItem("swaggerDefaultTagsText", defaultTagsText);
    } catch {
      // storage might be full or blocked; ignore for now
    }
  }, [blocks, schemas, yamlSpec, defaultTagsText]);

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
    setBlocks((prev) => prev.map((block, i) => (i === index ? { ...block, [key]: value } : block)));
  };

  const deleteBlock = (index) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  // SCHEMA METHODS
  const startNewSchema = () => {
    setEditingSchemas((prev) => [...prev, { name: "", fields: [] }]);
  };

  const updateSchemaName = (i, name) => {
    setEditingSchemas((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));
  };

  const addField = (schemaIndex) => {
    setEditingSchemas((prev) =>
      prev.map((s, idx) =>
        idx === schemaIndex
          ? {
              ...s,
              fields: [...s.fields, { name: "", type: "string", enum: [], required: true }],
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
    const draft = editingSchemas[index];
    if (!draft.name) return;

    if (draft.__editId) {
      // update existing
      const oldIdx = schemas.findIndex((s) => s.id === draft.__editId);
      if (oldIdx === -1) return;

      const oldName = schemas[oldIdx].name;
      const newName = draft.name;

      const updated = { id: draft.__editId, name: draft.name, fields: draft.fields };
      setSchemas((prev) => prev.map((s, i) => (i === oldIdx ? updated : s)));

      if (oldName !== newName) renameSchemaRefs(oldName, newName);

      setEditingSchemas((prev) => prev.filter((_, i) => i !== index));
    } else {
      // new
      const newSchema = { id: uid(), name: draft.name, fields: draft.fields };
      setSchemas((prev) => [...prev, newSchema]);
      setEditingSchemas((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const startEditSchema = (id) => {
    const s = schemas.find((sc) => sc.id === id);
    if (!s) return;
    setEditingSchemas((prev) => [
      ...prev,
      { __editId: id, name: s.name, fields: JSON.parse(JSON.stringify(s.fields || [])) },
    ]);
  };

  const ensureUniqueSchemaName = (base, existingNames) => {
    if (!existingNames.includes(base)) return base;
    let i = 1;
    let candidate = `${base}_copy`;
    while (existingNames.includes(candidate)) {
      i += 1;
      candidate = `${base}_copy${i}`;
    }
    return candidate;
  };

  const duplicateSchema = (id, { edit = false } = {}) => {
    setSchemas((prev) => {
      const src = prev.find((sc) => sc.id === id);
      if (!src) return prev;

      const existingNames = prev.map((p) => p.name);
      const newName = ensureUniqueSchemaName(src.name, existingNames);

      const copy = { id: uid(), name: newName, fields: JSON.parse(JSON.stringify(src.fields || [])) };
      const next = [...prev, copy];
      if (edit) setTimeout(() => startEditSchema(copy.id), 0);
      return next;
    });
  };

  const deleteSchemaById = (id) => {
    setSchemas((prev) => prev.filter((sc) => sc.id !== id));
  };

  // ✅ One-time backfill: ensure every saved schema has a unique id
  useEffect(() => {
    setSchemas((prev) => prev.map((s) => (s.id ? s : { ...s, id: uid() })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // rename propagation for refs everywhere
  const renameSchemaRefs = (oldName, newName) => {
    // endpoints
    setBlocks((prev) =>
      prev.map((b) => {
        const nb = { ...b };
        if (nb.requestSchemaRef === `ref:${oldName}`) nb.requestSchemaRef = `ref:${newName}`;
        if (nb.responseSchemaRef === `ref:${oldName}`) nb.responseSchemaRef = `ref:${newName}`;
        if (Array.isArray(nb.responses)) {
          nb.responses = nb.responses.map((r) =>
            r.schemaRef === `ref:${oldName}` ? { ...r, schemaRef: `ref:${newName}` } : r
          );
        }
        return nb;
      })
    );
    // component schemas
    setSchemas((prev) =>
      prev.map((s) => ({
        ...s,
        fields: (s.fields || []).map((f) => {
          const nf = { ...f };
          if (nf.type === "$ref" && nf.ref === oldName) nf.ref = newName;
          if (nf.type === "array" && nf.itemsType === "$ref" && nf.ref === oldName) nf.ref = newName;
          return nf;
        }),
      }))
    );
    // drafts
    setEditingSchemas((prev) =>
      prev.map((s) => ({
        ...s,
        fields: (s.fields || []).map((f) => {
          const nf = { ...f };
          if (nf.type === "$ref" && nf.ref === oldName) nf.ref = newName;
          if (nf.type === "array" && nf.itemsType === "$ref" && nf.ref === oldName) nf.ref = newName;
          return nf;
        }),
      }))
    );
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

        // ✅ Tags: endpoint-specific or fallback to default
        const defaultTags = parseTags(defaultTagsText);
        const opTags = Array.isArray(block.tags) ? block.tags : parseTags(block.tagsText || "");
        if ((opTags && opTags.length) || defaultTags.length) {
          methodObject.tags = opTags && opTags.length ? opTags : defaultTags;
        }

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
            schemaObj = { $ref: `#/components/schemas/${requestSchemaRef.replace("ref:", "")}` };
          } else if (requestSchemaRef.startsWith("type:")) {
            const t = requestSchemaRef.replace("type:", "");
            schemaObj = t === "double" ? { type: "number", format: "double" } : { type: t };
          }
          methodObject.requestBody = {
            required: true,
            content: { "application/json": { schema: schemaObj } },
          };
        }

        // Custom Responses
        if (responses.length > 0) {
          responses.forEach((res) => {
            const resp = { description: res.description || "" };
            if (res.schemaRef) {
              let schemaObj = {};
              if (res.schemaRef.startsWith("ref:")) {
                schemaObj = { $ref: `#/components/schemas/${res.schemaRef.replace("ref:", "")}` };
              } else if (res.schemaRef.startsWith("type:")) {
                const t = res.schemaRef.replace("type:", "");
                schemaObj = t === "double" ? { type: "number", format: "double" } : { type: t };
              }
              resp.content = { "application/json": { schema: schemaObj } };
            }
            methodObject.responses[res.status || "default"] = resp;
          });
        } else if (responseSchemaRef) {
          // Default 200 response
          let schemaObj = {};
          if (responseSchemaRef.startsWith("ref:")) {
            schemaObj = { $ref: `#/components/schemas/${responseSchemaRef.replace("ref:", "")}` };
          } else if (responseSchemaRef.startsWith("type:")) {
            const t = responseSchemaRef.replace("type:", "");
            schemaObj = t === "double" ? { type: "number", format: "double" } : { type: t };
          }
          methodObject.responses["200"] = {
            description: "Success",
            content: { "application/json": { schema: schemaObj } },
          };
        } else {
          // Fallback response
          methodObject.responses["200"] = { description: "Success" };
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

    (schema.fields || []).forEach((field) => {
      if (!field?.name) return;
      if (field.required ?? true) required.push(field.name);
      const applyCommon = (obj) => {
        if (field.description) obj.description = field.description;
          return obj;
      };

      // enum
      if (field.type === "enum") {
        properties[field.name] = {
          type: "string",
          enum: (field.enum || []).filter((v) => v?.trim()),
        };
        if (field.description) properties[field.name].description = field.description;

      // array
      } else if (field.type === "array") {
        if (field.itemsType === "$ref" && field.ref) {
          properties[field.name] = {
            type: "array",
            items: { $ref: `#/components/schemas/${field.ref}` },
          };
        } else if (field.itemsType === "double") {
          properties[field.name] = {
            type: "array",
            items: { type: "number", format: "double" },
          };
        } else {
          properties[field.name] = {
            type: "array",
            items: {
              type: field.itemsType || "string",
              ...(field.itemsFormat ? { format: field.itemsFormat } : {}),
            },
          };
        }
        if (field.description) properties[field.name].description = field.description;

      // direct $ref (no siblings allowed next to $ref in OAS3)
      } else if (field.type === "$ref" && field.ref) {
        properties[field.name] = { $ref: `#/components/schemas/${field.ref}` };

        // If you want a description here, uncomment this pattern:
        // properties[field.name] = {
        //   allOf: [{ $ref: `#/components/schemas/${field.ref}` }],
        //   ...(field.description ? { description: field.description } : {}),
        // };

      // explicit double
      } else if (field.type === "double") {
        properties[field.name] = { type: "number", format: "double" };
        if (field.description) properties[field.name].description = field.description;

      // primitive (string/integer/number/boolean)
      } else if (field.type === "oneOf" || field.type === "anyOf") {
           const keyword = field.type; // 'oneOf' or 'anyOf'
           const variants = (field.variants || []).map((v) => {
             if (v.kind === "$ref" && v.ref) {
               return { $ref: `#/components/schemas/${v.ref}` };
             }
             // primitive
             if (v.type === "double") {
               return { type: "number", format: "double" };
             }
             const obj = { type: v.type || "string" };
             if (v.format) obj.format = v.format;
             return obj;
           }).filter(Boolean);

           if (variants.length > 0) {
             properties[field.name] = applyCommon({ [keyword]: variants });
           }
      } else {
        properties[field.name] = { type: field.type };
        if (field.format) properties[field.name].format = field.format;
        if (field.description) properties[field.name].description = field.description;
      }
  });

  parsed.components = parsed.components || {};
  parsed.components.schemas = parsed.components.schemas || {};
  parsed.components.schemas[schema.name] = {
    type: "object",
    properties,
    required,
  };
      });


      // ✅ Top-level tags array for Swagger UI groups
      const allTagNames = new Set();
      Object.values(parsed.paths || {}).forEach((pathItem) => {
        Object.values(pathItem || {}).forEach((op) => {
          if (op && Array.isArray(op.tags)) op.tags.forEach((t) => allTagNames.add(t));
        });
      });
      parsed.tags = Array.from(allTagNames).map((name) => ({ name }));

      setOpenapi(parsed);
      setYamlSpec(yaml.dump(parsed));
    } catch (e) {
      console.error("Failed to parse or update YAML", e);
    }
  }, [blocks, schemas, defaultTagsText]); // ✅ watch defaultTagsText

  return (
    <div className={styles.canvasContainer}>
      {/* TOP ROW: 3 columns */}
      <div className={styles.topRowGrid}>
        <div
          ref={drop}
          className={styles.canvas}
          style={{ backgroundColor: isOver ? "#1e2a3a" : undefined }}
        >
          <h2 style={{ color: "#1e293b", fontWeight: "600" }}>Drop here to create endpoints</h2>
          <EndpointBuilder
            blocks={blocks}
            updateBlock={updateBlock}
            deleteBlock={deleteBlock}
            schemas={schemas}
            duplicateBlock={duplicateBlock}
          />
        </div>

        <div className={styles.specViewer}>
          <div className={styles.specHeader}>
            <h3>Generated OpenAPI YAML</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={downloadYaml} className={styles.downloadBtn}>Download YAML</button>
              <button onClick={clearWorkspace} className={styles.deleteEndpointBtn}>Clear</button>
            </div>
          </div>
          <YamlEditor yamlText={yamlSpec} onChange={(value) => setYamlSpec(value)} />
        </div>

        <div className={styles.swaggerPanel}>
          <h3>Swagger UI Preview</h3>
          {(() => {
            try {
              const parsedSpec = yaml.load(yamlSpec);
              return <SwaggerPreview spec={parsedSpec} />;
            } catch {
              return <p style={{ color: "red" }}>Invalid YAML</p>;
            }
          })()}
        </div>
      </div>

      {/* BOTTOM ROW: full-width SchemaBuilder */}
      <div className={styles.bottomRow}>
        <SchemaBuilder
          schemas={schemas}
          editingSchemas={editingSchemas}
          updateSchemaName={updateSchemaName}
          addField={addField}
          updateField={updateField}
          deleteField={deleteField}
          submitSchema={submitSchema}
          startNewSchema={startNewSchema}
          startEditSchema={startEditSchema}
          duplicateSchema={duplicateSchema}
          deleteSchemaById={deleteSchemaById}
        />
      </div>
    </div>
  );
}
