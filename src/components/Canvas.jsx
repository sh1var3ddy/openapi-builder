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

/* ---------- Import helpers ---------- */
// Map an OpenAPI schema node into our selector string: "ref:Name" | "type:string" | "type:number" | "type:double" | ""
const toSelector = (node) => {
  if (!node || typeof node !== "object") return "";
  if (node.$ref) {
    const name = node.$ref.split("/").pop();
    return `ref:${name}`;
  }
  if (node.type === "number" && node.format === "double") return "type:double";
  if (node.type) return `type:${node.type}`;
  return "";
};

// Map a component property schema into our schema-field model
const toField = (propName, node, requiredList = []) => {
  const base = {
    name: propName,
    type: "string",
    enum: [],
    required: requiredList.includes(propName),
    description: node?.description || "",
    format: node?.format || "",
  };
  if (!node) return base;

  // oneOf / anyOf
  if (node.oneOf || node.anyOf) {
    const keyword = node.oneOf ? "oneOf" : "anyOf";
    const variants = (node[keyword] || []).map((v) => {
      if (v?.$ref) return { kind: "$ref", ref: v.$ref.split("/").pop() };
      if (v?.type === "number" && v?.format === "double")
        return { kind: "primitive", type: "double", format: "double" };
      return { kind: "primitive", type: v?.type || "string", format: v?.format || "" };
    });
    return { ...base, type: keyword, variants };
  }

  // $ref
  if (node.$ref) {
    return { ...base, type: "$ref", ref: node.$ref.split("/").pop(), format: "" };
  }

  // enum
  if (Array.isArray(node.enum)) {
    return { ...base, type: "enum", enum: node.enum.map(String), format: "" };
  }

  // array
  if (node.type === "array") {
    const items = node.items || {};
    if (items.$ref) {
      return { ...base, type: "array", itemsType: "$ref", ref: items.$ref.split("/").pop(), itemsFormat: "", format: "" };
    }
    if (items.type === "number" && items.format === "double") {
      return { ...base, type: "array", itemsType: "double", itemsFormat: "double", format: "" };
    }
    return { ...base, type: "array", itemsType: items.type || "string", itemsFormat: items.format || "", format: "" };
  }

  // primitives
  if (node.type === "number" && node.format === "double") {
    return { ...base, type: "double", format: "double" };
  }
  if (node.type) {
    return { ...base, type: node.type, format: node.format || "" };
  }
  return base;
};
/* ------------------------------------ */

export default function Canvas() {
  const [blocks, setBlocks] = useState([]);
  const [openapi, setOpenapi] = useState({});
  const [schemas, setSchemas] = useState([]);
  const [editingSchemas, setEditingSchemas] = useState([]);
  const [defaultTagsText, setDefaultTagsText] = useState("");

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
        info: { title: "Swagger Builder API", version: "1.0.0", description: "Generated using drag-and-drop builder" },
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
        operationId: `${src.method}_${Date.now()}`,
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
      servers: [{ url: "http://localhost:8080/api", description: "Development server" }],
      paths: {},
    })
  );

  // Load saved
  useEffect(() => {
    try {
      const savedBlocks = JSON.parse(localStorage.getItem("swaggerBlocks") || "[]");
      const savedSchemas = JSON.parse(localStorage.getItem("swaggerSchemas") || "[]");
      const savedYaml = localStorage.getItem("swaggerYaml");
      const savedDefaultTagsText = localStorage.getItem("swaggerDefaultTagsText") || "";

      if (Array.isArray(savedBlocks) && savedBlocks.length) setBlocks(savedBlocks);
      if (Array.isArray(savedSchemas)) {
        savedSchemas = savedSchemas.map((s) => ({
          ...s,
          schemaType: s?.schemaType || "object",
          fields: (s?.fields || []).map((f) => ({ required: true, ...f })),
        }));
      }
      if (typeof savedYaml === "string" && savedYaml.trim()) setYamlSpec(savedYaml);
      setDefaultTagsText(savedDefaultTagsText);
    } catch {}
  }, []);

  // Save
  useEffect(() => {
    try {
      localStorage.setItem("swaggerBlocks", JSON.stringify(blocks));
      localStorage.setItem("swaggerSchemas", JSON.stringify(schemas));
      localStorage.setItem("swaggerYaml", yamlSpec);
      localStorage.setItem("swaggerDefaultTagsText", defaultTagsText);
    } catch {}
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
    collect: (monitor) => ({ isOver: monitor.isOver() }),
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

  // ---------- SCHEMA METHODS ----------
  const startNewSchema = () =>
    setEditingSchemas((prev) => [
      ...prev,
      {
        name: "",
        schemaType: "object",
        fields: [],
        enum: [],
        format: "",
        itemsType: "",
        itemsFormat: "",
        ref: "",
        variants: [], // NEW: schema-level oneOf/anyOf variants
      },
    ]);

  const updateSchemaName = (i, name) =>
    setEditingSchemas((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));

  // fIdx === -1 → schema-level update
  const addField = (schemaIndex) =>
    setEditingSchemas((prev) =>
      prev.map((s, idx) =>
        idx === schemaIndex ? { ...s, fields: [...(s.fields || []), { name: "", type: "string", enum: [], required: true }] } : s
      )
    );

  const updateField = (sIdx, fIdx, key, value) =>
    setEditingSchemas((prev) =>
      prev.map((schema, i) => {
        if (i !== sIdx) return schema;
        if (fIdx === -1) return { ...schema, [key]: value };
        const fields = [...(schema.fields || [])];
        fields[fIdx][key] = value;
        return { ...schema, fields };
      })
    );

  const deleteField = (sIdx, fIdx) =>
    setEditingSchemas((prev) =>
      prev.map((schema, i) => {
        if (i !== sIdx) return schema;
        const fields = (schema.fields || []).filter((_, j) => j !== fIdx);
        return { ...schema, fields };
      })
    );

  const submitSchema = (index) => {
    const draft = editingSchemas[index];
    if (!draft?.name) return;

    const packed = {
      id: draft.__editId || uid(),
      name: draft.name,
      schemaType: draft.schemaType || "object",
      fields: draft.fields || [],
      enum: (draft.enum || []).filter((v) => String(v).trim()),
      format: draft.format || "",
      itemsType: draft.itemsType || "",
      itemsFormat: draft.itemsFormat || "",
      ref: draft.ref || "",
      variants: draft.variants || [], // NEW
    };

    if (draft.__editId) {
      const oldIdx = schemas.findIndex((s) => s.id === draft.__editId);
      if (oldIdx === -1) return;

      const oldName = schemas[oldIdx].name;
      const newName = draft.name;

      setSchemas((prev) => prev.map((s, i) => (i === oldIdx ? packed : s)));
      if (oldName !== newName) renameSchemaRefs(oldName, newName);
    } else {
      setSchemas((prev) => [...prev, packed]);
    }

    setEditingSchemas((prev) => prev.filter((_, i) => i !== index));
  };

  const startEditSchema = (id) => {
    const s = schemas.find((sc) => sc.id === id);
    if (!s) return;
    setEditingSchemas((prev) => [
      ...prev,
      {
        __editId: id,
        name: s.name,
        schemaType: s.schemaType || "object",
        enum: s.enum || [],
        format: s.format || "",
        itemsType: s.itemsType || "",
        itemsFormat: s.itemsFormat || "",
        ref: s.ref || "",
        variants: s.variants || [],
        // ✅ ensure each field gets a default required:true so the toggle shows properly
        fields: JSON.parse(JSON.stringify(s.fields || [])).map((f) => ({ required: true, ...f })),
      },
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

      const copy = { ...JSON.parse(JSON.stringify(src)), id: uid(), name: newName };
      const next = [...prev, copy];
      if (edit) setTimeout(() => startEditSchema(copy.id), 0);
      return next;
    });
  };

  const deleteSchemaById = (id) => setSchemas((prev) => prev.filter((sc) => sc.id !== id));

  // One-time backfill
  useEffect(() => {
    setSchemas((prev) => prev.map((s) => (s.id ? s : { ...s, id: uid() })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // rename propagation for refs everywhere (fields + schema-level ref + schema-level variants)
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

    const fixRefs = (arr) =>
      arr.map((s) => ({
        ...s,
        fields: (s.fields || []).map((f) => {
          const nf = { ...f };
          if (nf.type === "$ref" && nf.ref === oldName) nf.ref = newName;
          if (nf.type === "array" && nf.itemsType === "$ref" && nf.ref === oldName) nf.ref = newName;
          // field-level composition variants
          if (Array.isArray(nf.variants)) {
            nf.variants = nf.variants.map((v) =>
              v.kind === "$ref" && v.ref === oldName ? { ...v, ref: newName } : v
            );
          }
          return nf;
        }),
        // schema-level ref
        ref: s.ref === oldName ? newName : s.ref,
        // schema-level variants
        variants: (s.variants || []).map((v) =>
          v.kind === "$ref" && v.ref === oldName ? { ...v, ref: newName } : v
        ),
      }));

    setSchemas((prev) => fixRefs(prev));
    setEditingSchemas((prev) => fixRefs(prev));
  };

  /* ---------- Import: handlers ---------- */
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const spec = file.name.endsWith(".json") ? JSON.parse(text) : yaml.load(text);
      importOpenAPISpec(spec);
    } catch (err) {
      alert("Failed to read/parse file. Make sure it's valid OpenAPI YAML or JSON.");
      console.error(err);
    } finally {
      e.target.value = "";
    }
  };

  const importOpenAPISpec = (spec) => {
    if (!spec || typeof spec !== "object") return;

    const toVariant = (v) => {
      if (v?.$ref) return { kind: "$ref", ref: v.$ref.split("/").pop() };
      if (v?.type === "number" && v?.format === "double")
        return { kind: "primitive", type: "double", format: "double" };
      return { kind: "primitive", type: v?.type || "string", format: v?.format || "" };
    };

    // Schemas
    const importedSchemas = [];
    const compSchemas = spec.components?.schemas || {};

    Object.entries(compSchemas).forEach(([name, schema]) => {
      // Top-level $ref
      if (schema && schema.$ref) {
        importedSchemas.push({
          id: uid(),
          name,
          schemaType: "$ref",
          ref: schema.$ref.split("/").pop(),
          fields: [],
          enum: [],
          format: "",
          itemsType: "",
          itemsFormat: "",
          variants: [],
        });
        return;
      }

      // Top-level oneOf / anyOf
      if (Array.isArray(schema?.oneOf) || Array.isArray(schema?.anyOf)) {
        const keyword = Array.isArray(schema.oneOf) ? "oneOf" : "anyOf";
        const variants = (schema[keyword] || []).map(toVariant);
        importedSchemas.push({
          id: uid(),
          name,
          schemaType: keyword,
          variants,
          fields: [],
          enum: [],
          format: "",
          itemsType: "",
          itemsFormat: "",
          ref: "",
        });
        return;
      }

      // Top-level enum
      if (Array.isArray(schema?.enum)) {
        importedSchemas.push({
          id: uid(),
          name,
          schemaType: "enum",
          enum: schema.enum.map(String),
          fields: [],
          format: "",
          itemsType: "",
          itemsFormat: "",
          ref: "",
          variants: [],
        });
        return;
      }

      // Top-level array
      if (schema?.type === "array") {
        const items = schema.items || {};
        let itemsType = "string";
        let itemsFormat = "";
        let ref = "";

        if (items.$ref) {
          itemsType = "$ref";
          ref = items.$ref.split("/").pop();
        } else if (items.type === "number" && items.format === "double") {
          itemsType = "double";
        } else if (items.type) {
          itemsType = items.type;
          itemsFormat = items.format || "";
        }

        importedSchemas.push({
          id: uid(),
          name,
          schemaType: "array",
          itemsType,
          itemsFormat,
          ref,
          fields: [],
          enum: [],
          format: "",
          variants: [],
        });
        return;
      }

      // Top-level primitive / double
      if (schema?.type && schema.type !== "object") {
        const st = schema.type === "number" && schema.format === "double" ? "double" : schema.type;
        importedSchemas.push({
          id: uid(),
          name,
          schemaType: st,
          format: schema.format || (st === "double" ? "double" : ""),
          fields: [],
          enum: [],
          itemsType: "",
          itemsFormat: "",
          ref: "",
          variants: [],
        });
        return;
      }

      // default: object with properties
      const props = schema?.properties || {};
      const requiredList = schema?.required || [];
      const fields = Object.entries(props).map(([propName, node]) => toField(propName, node, requiredList));
      importedSchemas.push({
        id: uid(),
        name,
        schemaType: "object",
        fields,
        enum: [],
        format: "",
        itemsType: "",
        itemsFormat: "",
        ref: "",
        variants: [],
      });
    });

    // Paths -> Blocks (unchanged)
    const importedBlocks = [];
    const paths = spec.paths || {};
    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods || {}).forEach(([method, op]) => {
        const m = method.toLowerCase();
        if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(m)) return;

        const params = (op.parameters || []).map((p) => ({
          name: p.name || "",
          in: p.in || "query",
          required: !!p.required,
          description: p.description || "",
          type:
            p.schema?.type === "number" && p.schema?.format === "double"
              ? "double"
              : (p.schema?.type || "string"),
        }));

        const reqSchema =
          op.requestBody?.content?.["application/json"]?.schema ||
          op.requestBody?.content?.["application/x-www-form-urlencoded"]?.schema ||
          null;

        const resp200 = op.responses?.["200"]?.content?.["application/json"]?.schema || null;

        const customResps = Object.entries(op.responses || {})
          .filter(([code]) => code !== "200" || !resp200)
          .map(([status, r]) => {
            const s =
              r?.content?.["application/json"]?.schema ||
              r?.content?.["application/x-www-form-urlencoded"]?.schema ||
              null;
            return { status, description: r?.description || "", schemaRef: toSelector(s) };
          });

        importedBlocks.push({
          method: m,
          path,
          operationId: op.operationId || `${m}_${Date.now()}`,
          description: op.description || "",
          tagsText: (op.tags || []).join(", "),
          parameters: params,
          requestSchemaRef: toSelector(reqSchema),
          responseSchemaRef: toSelector(resp200),
          responses: customResps,
        });
      });
    });

    setSchemas(importedSchemas);
    setBlocks(importedBlocks);

    try {
      setYamlSpec(yaml.dump(spec));
    } catch {}

    try {
      localStorage.setItem("swaggerBlocks", JSON.stringify(importedBlocks));
      localStorage.setItem("swaggerSchemas", JSON.stringify(importedSchemas));
      localStorage.setItem("swaggerYaml", yaml.dump(spec));
    } catch {}
    alert("Import successful ✅");
  };
  /* ------------------------------------- */

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

        // Tags
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
            schema: { type: param.type === "double" ? "number" : param.type, ...(param.type === "double" ? { format: "double" } : {}) },
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

        // Responses
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
          methodObject.responses["200"] = { description: "Success" };
        }

        parsed.paths[path][method] = methodObject;
      });

      // Components > Schemas
      parsed.components = parsed.components || {};
      parsed.components.schemas = {};

      const buildItemsSchema = (schema) => {
        if (schema.itemsType === "$ref" && schema.ref) {
          return { $ref: `#/components/schemas/${schema.ref}` };
        }
        if (schema.itemsType === "double") return { type: "number", format: "double" };
        const t = schema.itemsType || "string";
        const obj = { type: t };
        if (schema.itemsFormat) obj.format = schema.itemsFormat;
        return obj;
      };

      const mapVariant = (v) => {
        if (v.kind === "$ref" && v.ref) return { $ref: `#/components/schemas/${v.ref}` };
        if (v.type === "double") return { type: "number", format: "double" };
        const obj = { type: v.type || "string" };
        if (v.format) obj.format = v.format;
        return obj;
      };

      schemas.forEach((schema) => {
        if (!schema.name) return;
        const kind = schema.schemaType || "object";

        if (kind === "enum") {
          parsed.components.schemas[schema.name] = {
            type: "string",
            enum: (schema.enum || []).filter((v) => v?.trim()),
          };
          return;
        }

        if (kind === "oneOf" || kind === "anyOf") {
          const variants = (schema.variants || []).map(mapVariant).filter(Boolean);
          parsed.components.schemas[schema.name] = { [kind]: variants };
          return;
        }

        if (["string", "integer", "number", "double", "boolean"].includes(kind)) {
          parsed.components.schemas[schema.name] = {
            type: kind === "double" ? "number" : kind,
            ...(kind === "double" ? { format: "double" } : {}),
            ...(schema.format ? { format: schema.format } : {}),
          };
          return;
        }

        if (kind === "array") {
          parsed.components.schemas[schema.name] = {
            type: "array",
            items: buildItemsSchema(schema),
          };
          return;
        }

        if (kind === "$ref" && schema.ref) {
          parsed.components.schemas[schema.name] = { $ref: `#/components/schemas/${schema.ref}` };
          return;
        }

        // default: object
        const properties = {};
        const required = [];
        (schema.fields || []).forEach((field) => {
          if (!field?.name) return;
          if (field.required ?? true) required.push(field.name);

          const applyCommon = (obj) => {
            if (field.description) obj.description = field.description;
            return obj;
          };

          if (field.type === "enum") {
            properties[field.name] = applyCommon({
              type: "string",
              enum: (field.enum || []).filter((v) => v?.trim()),
            });
          } else if (field.type === "array") {
            if (field.itemsType === "$ref" && field.ref) {
              properties[field.name] = applyCommon({
                type: "array",
                items: { $ref: `#/components/schemas/${field.ref}` },
              });
            } else if (field.itemsType === "double") {
              properties[field.name] = applyCommon({
                type: "array",
                items: { type: "number", format: "double" },
              });
            } else {
              properties[field.name] = applyCommon({
                type: "array",
                items: {
                  type: field.itemsType || "string",
                  ...(field.itemsFormat ? { format: field.itemsFormat } : {}),
                },
              });
            }
          } else if (field.type === "$ref" && field.ref) {
            properties[field.name] = { $ref: `#/components/schemas/${field.ref}` };
          } else if (field.type === "double") {
            properties[field.name] = applyCommon({ type: "number", format: "double" });
          } else if (field.type === "oneOf" || field.type === "anyOf") {
            const keyword = field.type;
            const variants = (field.variants || [])
              .map((v) => mapVariant(v))
              .filter(Boolean);
            if (variants.length > 0) properties[field.name] = applyCommon({ [keyword]: variants });
          } else {
            const base = { type: field.type };
            if (field.format) base.format = field.format;
            properties[field.name] = applyCommon(base);
          }
        });

        parsed.components.schemas[schema.name] = {
          type: "object",
          ...(Object.keys(properties).length ? { properties } : {}),
          ...(required.length ? { required } : {}),
        };
      });

      // Tags
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
  }, [blocks, schemas, defaultTagsText]);

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
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className={styles.metaInput}
                style={{ width: 220 }}
                placeholder="Default tags (comma-separated)"
                value={defaultTagsText}
                onChange={(e) => setDefaultTagsText(e.target.value)}
                title="Tags applied when an endpoint has none"
              />
              <label className={styles.addBtn} style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                Import
                <input type="file" accept=".yaml,.yml,.json" onChange={onImportFile} style={{ display: "none" }} />
              </label>
              <button onClick={downloadYaml} className={styles.downloadBtn}>Download</button>
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
