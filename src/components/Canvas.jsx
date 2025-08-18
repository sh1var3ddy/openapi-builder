// src/components/Canvas.jsx
import { useDrop } from "react-dnd";
import { useState, useEffect, useRef } from "react";
import styles from "./Canvas.module.css";
import yaml from "js-yaml";
import YamlEditor from "./YamlEditor";
import SwaggerPreview from "./SwaggerPreview";
import EndpointBuilder from "./EndpointBuilder";
import ComponentsPanel from "./ComponentsPanel"; // tabs for Schemas, Parameters, Responses, Request Bodies, Headers, Examples, Security

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- helpers for import ---------- */
const toSelector = (node) => {
  if (!node || typeof node !== "object") return "";
  if (node.$ref) return `ref:${node.$ref.split("/").pop()}`;
  if (node.type === "number" && node.format === "double") return "type:double";
  if (node.type) return `type:${node.type}`;
  return "";
};

const firstContentEntry = (contentObj) => {
  if (!contentObj || typeof contentObj !== "object") return null;
  const mediaType = Object.keys(contentObj)[0];
  if (!mediaType) return null;
  return { mediaType, schema: contentObj[mediaType]?.schema || null };
};

const toPrimitiveTuple = (schema) => {
  if (!schema || typeof schema !== "object") return null;
  if (schema.$ref) return null; // handled elsewhere
  const type =
    schema.type === "number" && schema.format === "double"
      ? "double"
      : schema.type || "string";
  const format = schema.format || (type === "double" ? "double" : "");
  return { type, format };
};

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

  if (node.oneOf || node.anyOf) {
    const keyword = node.oneOf ? "oneOf" : "anyOf";
    const variants = (node[keyword] || []).map((v) => {
      if (v?.$ref) return { kind: "$ref", ref: v.$ref.split("/").pop() };
      if (v?.type === "number" && v?.format === "double")
        return { kind: "primitive", type: "double", format: "double" };
      return {
        kind: "primitive",
        type: v?.type || "string",
        format: v?.format || "",
      };
    });
    return { ...base, type: keyword, variants };
  }

  if (node.$ref)
    return { ...base, type: "$ref", ref: node.$ref.split("/").pop(), format: "" };

  if (Array.isArray(node.enum))
    return { ...base, type: "enum", enum: node.enum.map(String), format: "" };

  if (node.type === "array") {
    const items = node.items || {};
    if (items.$ref) {
      return {
        ...base,
        type: "array",
        itemsType: "$ref",
        ref: items.$ref.split("/").pop(),
        itemsFormat: "",
        format: "",
      };
    }
    if (items.type === "number" && items.format === "double") {
      return {
        ...base,
        type: "array",
        itemsType: "double",
        itemsFormat: "double",
        format: "",
      };
    }
    return {
      ...base,
      type: "array",
      itemsType: items.type || "string",
      itemsFormat: items.format || "",
      format: "",
    };
  }

  if (node.type === "number" && node.format === "double")
    return { ...base, type: "double", format: "double" };
  if (node.type) return { ...base, type: node.type, format: node.format || "" };
  return base;
};
/* ---------------------------------------- */

export default function Canvas() {
  const [blocks, setBlocks] = useState([]);
  const [openapi, setOpenapi] = useState({});
  const [schemas, setSchemas] = useState([]);
  const [editingSchemas, setEditingSchemas] = useState([]);
  const [defaultTagsText, setDefaultTagsText] = useState("");

  // components.* (reusables)
  const [reusableParams, setReusableParams] = useState([]);
  const [editingParams, setEditingParams] = useState([]);

  const [reusableResponses, setReusableResponses] = useState([]);
  const [editingResponses, setEditingResponses] = useState([]);

  const [reusableRequestBodies, setReusableRequestBodies] = useState([]);
  const [editingRequestBodies, setEditingRequestBodies] = useState([]);

  const [reusableHeaders, setReusableHeaders] = useState([]);
  const [editingHeaders, setEditingHeaders] = useState([]);

  const [reusableExamples, setReusableExamples] = useState([]);
  const [editingExamples, setEditingExamples] = useState([]);

  const [reusableSecurity, setReusableSecurity] = useState([]);
  const [editingSecurity, setEditingSecurity] = useState([]);

  const [yamlSpec, setYamlSpec] = useState(() =>
    yaml.dump({
      openapi: "3.0.0",
      info: {
        title: "Swagger Builder API",
        version: "1.0.0",
        description: "Generated using drag-and-drop builder",
      },
      servers: [
        { url: "http://localhost:8080/api", description: "Development server" },
      ],
      paths: {},
    })
  );

  const [componentsHeight, setComponentsHeight] = useState(360);   // starting height in px
  const [componentsCollapsed, setComponentsCollapsed] = useState(false);
  const dragStartYRef = useRef(null);
  const dragStartHRef = useRef(null);
  const onResizeStart = (e) => {
    // don’t start a drag when collapsed
    if (componentsCollapsed) setComponentsCollapsed(false);
    dragStartYRef.current = e.clientY;
    dragStartHRef.current = componentsHeight;

    window.addEventListener("mousemove", onResizing);
    window.addEventListener("mouseup", onResizeEnd);
  };

  const onResizing = (e) => {
    const dy = e.clientY - (dragStartYRef.current ?? e.clientY);
    // invert dy because handle is at the TOP of the panel
    const next = Math.max(160, Math.min(window.innerHeight * 0.8, (dragStartHRef.current ?? 360) - dy));
    setComponentsHeight(next);
  };

  const onResizeEnd = () => {
    window.removeEventListener("mousemove", onResizing);
    window.removeEventListener("mouseup", onResizeEnd);
  };

  const toggleCollapsed = () => setComponentsCollapsed(v => !v);
  const resetHeight = () => setComponentsHeight(360);

  const parseTags = (txt) =>
    String(txt || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const clearWorkspace = () => {
    if (!confirm("Clear all endpoints, schemas, and YAML? This can’t be undone."))
      return;
    setBlocks([]);
    setSchemas([]);
    setEditingSchemas([]);

    setReusableParams([]);
    setEditingParams([]);

    setReusableResponses([]);
    setEditingResponses([]);

    setReusableRequestBodies([]);
    setEditingRequestBodies([]);

    setReusableHeaders([]);
    setEditingHeaders([]);

    setReusableExamples([]);
    setEditingExamples([]);

    setReusableSecurity([]);
    setEditingSecurity([]);

    setYamlSpec(
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

    localStorage.removeItem("swaggerBlocks");
    localStorage.removeItem("swaggerSchemas");
    localStorage.removeItem("swaggerYaml");
    localStorage.removeItem("swaggerDefaultTagsText");

    localStorage.removeItem("swaggerParams");
    localStorage.removeItem("swaggerResponses");
    localStorage.removeItem("swaggerRequestBodies");
    localStorage.removeItem("swaggerHeaders");
    localStorage.removeItem("swaggerExamples");
    localStorage.removeItem("swaggerSecuritySchemes");
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

  // load saved
  useEffect(() => {
    try {
      const savedBlocks = JSON.parse(localStorage.getItem("swaggerBlocks") || "[]");
      const savedSchemas = JSON.parse(localStorage.getItem("swaggerSchemas") || "[]");
      const savedYaml = localStorage.getItem("swaggerYaml");
      const savedDefaultTagsText =
        localStorage.getItem("swaggerDefaultTagsText") || "";

      const savedParams = JSON.parse(localStorage.getItem("swaggerParams") || "[]");
      const savedResps = JSON.parse(localStorage.getItem("swaggerResponses") || "[]");
      const savedReqBodies = JSON.parse(
        localStorage.getItem("swaggerRequestBodies") || "[]"
      );
      const savedHeaders = JSON.parse(
        localStorage.getItem("swaggerHeaders") || "[]"
      );
      const savedExamples = JSON.parse(
        localStorage.getItem("swaggerExamples") || "[]"
      );
      const savedSec = JSON.parse(
        localStorage.getItem("swaggerSecuritySchemes") || "[]"
      );

      if (Array.isArray(savedBlocks) && savedBlocks.length) setBlocks(savedBlocks);
      if (Array.isArray(savedSchemas) && savedSchemas.length) setSchemas(savedSchemas);
      if (typeof savedYaml === "string" && savedYaml.trim()) setYamlSpec(savedYaml);
      setDefaultTagsText(savedDefaultTagsText);

      if (Array.isArray(savedParams)) setReusableParams(savedParams);
      if (Array.isArray(savedResps)) setReusableResponses(savedResps);
      if (Array.isArray(savedReqBodies)) setReusableRequestBodies(savedReqBodies);
      if (Array.isArray(savedHeaders)) setReusableHeaders(savedHeaders);
      if (Array.isArray(savedExamples)) setReusableExamples(savedExamples);
      if (Array.isArray(savedSec)) setReusableSecurity(savedSec);
    } catch {}
  }, []);

  // save
  useEffect(() => {
    try {
      localStorage.setItem("swaggerBlocks", JSON.stringify(blocks));
      localStorage.setItem("swaggerSchemas", JSON.stringify(schemas));
      localStorage.setItem("swaggerYaml", yamlSpec);
      localStorage.setItem("swaggerDefaultTagsText", defaultTagsText);

      localStorage.setItem("swaggerParams", JSON.stringify(reusableParams));
      localStorage.setItem("swaggerResponses", JSON.stringify(reusableResponses));
      localStorage.setItem(
        "swaggerRequestBodies",
        JSON.stringify(reusableRequestBodies)
      );
      localStorage.setItem("swaggerHeaders", JSON.stringify(reusableHeaders));
      localStorage.setItem("swaggerExamples", JSON.stringify(reusableExamples));
      localStorage.setItem(
        "swaggerSecuritySchemes",
        JSON.stringify(reusableSecurity)
      );
    } catch {}
  }, [
    blocks,
    schemas,
    yamlSpec,
    defaultTagsText,
    reusableParams,
    reusableResponses,
    reusableRequestBodies,
    reusableHeaders,
    reusableExamples,
    reusableSecurity,
  ]);

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
    setBlocks((prev) =>
      prev.map((block, i) => (i === index ? { ...block, [key]: value } : block))
    );
  };
  const deleteBlock = (index) => setBlocks((prev) => prev.filter((_, i) => i !== index));

  // ---------- schema methods ----------
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
        variants: [],
      },
    ]);
  const updateSchemaName = (i, name) =>
    setEditingSchemas((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));
  const addField = (schemaIndex) =>
    setEditingSchemas((prev) =>
      prev.map((s, idx) =>
        idx === schemaIndex
          ? {
              ...s,
              fields: [
                ...(s.fields || []),
                { name: "", type: "string", enum: [], required: true },
              ],
            }
          : s
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
      variants: draft.variants || [],
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
        fields: JSON.parse(JSON.stringify(s.fields || [])).map((f) => ({
          required: true,
          ...f,
        })),
      },
    ]);
  };
  const duplicateSchema = (id, { edit = false } = {}) => {
    setSchemas((prev) => {
      const src = prev.find((sc) => sc.id === id);
      if (!src) return prev;
      const names = prev.map((p) => p.name);
      let newName = `${src.name}_copy`;
      let i = 1;
      while (names.includes(newName)) {
        i += 1;
        newName = `${src.name}_copy${i}`;
      }
      const copy = { ...JSON.parse(JSON.stringify(src)), id: uid(), name: newName };
      const next = [...prev, copy];
      if (edit) setTimeout(() => startEditSchema(copy.id), 0);
      return next;
    });
  };
  const deleteSchemaById = (id) => setSchemas((prev) => prev.filter((sc) => sc.id !== id));
  const cancelDraft = (i) =>
    setEditingSchemas((prev) => prev.filter((_, idx) => idx !== i));

  useEffect(() => {
    setSchemas((prev) => prev.map((s) => (s.id ? s : { ...s, id: uid() })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renameSchemaRefs = (oldName, newName) => {
    setBlocks((prev) =>
      prev.map((b) => {
        const nb = { ...b };
        if (nb.requestSchemaRef === `ref:${oldName}`)
          nb.requestSchemaRef = `ref:${newName}`;
        if (nb.responseSchemaRef === `ref:${oldName}`)
          nb.responseSchemaRef = `ref:${newName}`;
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
          if (nf.type === "array" && nf.itemsType === "$ref" && nf.ref === oldName)
            nf.ref = newName;
          if (Array.isArray(nf.variants)) {
            nf.variants = nf.variants.map((v) =>
              v.kind === "$ref" && v.ref === oldName ? { ...v, ref: newName } : v
            );
          }
          return nf;
        }),
        ref: s.ref === oldName ? newName : s.ref,
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

    // ---------- Schemas ----------
    const importedSchemas = [];
    const compSchemas = spec.components?.schemas || {};
    Object.entries(compSchemas).forEach(([name, schema]) => {
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
      if (schema?.type === "array") {
        const items = schema.items || {};
        let itemsType = "string",
          itemsFormat = "",
          ref = "";
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
      if (schema?.type && schema.type !== "object") {
        const st =
          schema.type === "number" && schema.format === "double"
            ? "double"
            : schema.type;
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
      const props = schema?.properties || {};
      const requiredList = schema?.required || [];
      const fields = Object.entries(props).map(([propName, node]) =>
        toField(propName, node, requiredList)
      );
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

    // ---------- Paths -> Blocks ----------
    const importedBlocks = [];
    const paths = spec.paths || {};
    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods || {}).forEach(([method, op]) => {
        const m = method.toLowerCase();
        if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(m))
          return;

        const params = (op.parameters || []).map((p) => {
          if (p.$ref?.startsWith("#/components/parameters/")) {
            return { mode: "ref", refName: p.$ref.split("/").pop() };
          }
          const t =
            p.schema?.type === "number" && p.schema?.format === "double"
              ? "double"
              : p.schema?.type || "string";
          return {
            mode: "inline",
            name: p.name || "",
            in: p.in || "query",
            required: !!p.required,
            description: p.description || "",
            type: t,
            format: p.schema?.format || "",
            minLength: p.schema?.minLength,
            maxLength: p.schema?.maxLength,
            pattern: p.schema?.pattern,
            minimum: p.schema?.minimum,
            maximum: p.schema?.maximum,
            enum: Array.isArray(p.schema?.enum) ? p.schema.enum.map(String) : [],
          };
        });

        const reqSchema =
          op.requestBody?.content?.["application/json"]?.schema ||
          op.requestBody?.content?.["application/x-www-form-urlencoded"]?.schema ||
          null;

        const resp200 =
          op.responses?.["200"]?.content?.["application/json"]?.schema || null;

        const customResps = Object.entries(op.responses || {})
          .filter(([code]) => code !== "200" || !resp200)
          .map(([status, r]) => {
            const s =
              r?.content?.["application/json"]?.schema ||
              r?.content?.["application/x-www-form-urlencoded"]?.schema ||
              null;
            return {
              status,
              description: r?.description || "",
              schemaRef: toSelector(s),
            };
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

    // ---------- components.parameters ----------
    const compParams = spec.components?.parameters || {};
    const importedParams = Object.entries(compParams).map(([key, p]) => {
      const t =
        p.schema?.type === "number" && p.schema?.format === "double"
          ? "double"
          : p.schema?.type || "string";
      return {
        id: uid(),
        key,
        name: p.name || key,
        in: p.in || "query",
        required: !!p.required,
        description: p.description || "",
        type: t,
        format: p.schema?.format || "",
        minLength: p.schema?.minLength,
        maxLength: p.schema?.maxLength,
        pattern: p.schema?.pattern,
        minimum: p.schema?.minimum,
        maximum: p.schema?.maximum,
        enum: Array.isArray(p.schema?.enum) ? p.schema.enum.map(String) : [],
        style: p.style,
        explode: p.explode,
      };
    });

    // ---------- components.headers ----------
    const compHeaders = spec.components?.headers || {};
    const importedHeaders = Object.entries(compHeaders).map(([key, h]) => {
      const sch = h?.schema || {};
      const prim = toPrimitiveTuple(sch) || { type: "string", format: "" };
      return {
        id: uid(),
        key, // components.headers key
        description: h?.description || "",
        style: h?.style || "",
        explode: typeof h?.explode === "boolean" ? h.explode : undefined,
        type: prim.type,
        format: prim.format || "",
        enum: Array.isArray(sch.enum) ? sch.enum.map(String) : [],
        minLength: sch.minLength,
        maxLength: sch.maxLength,
        pattern: sch.pattern || "",
        minimum: sch.minimum,
        maximum: sch.maximum,
        example: h?.example ?? "",
      };
    });

    // ---------- components.responses ----------
    const compResponses = spec.components?.responses || {};
    const importedResponses = Object.entries(compResponses).map(([key, r]) => {
      // pick first media type if multiple
      let schemaMode = "none";
      let primitiveType = "string";
      let primitiveFormat = "";
      let refName = "";
      let mediaType = "application/json";

      const c = firstContentEntry(r?.content);
      if (c?.schema) {
        mediaType = c.mediaType || "application/json";
        if (c.schema.$ref?.startsWith("#/components/schemas/")) {
          schemaMode = "ref";
          refName = c.schema.$ref.split("/").pop();
        } else {
          const prim = toPrimitiveTuple(c.schema);
          if (prim) {
            schemaMode = "primitive";
            primitiveType = prim.type;
            primitiveFormat = prim.format || "";
          }
        }
      }

      // headers (map $ref vs inline)
      const headers = [];
      const rh = r?.headers || {};
      Object.entries(rh).forEach(([hdrName, hdrObj]) => {
        if (hdrObj?.$ref?.startsWith("#/components/headers/")) {
          headers.push({
            id: uid(),
            name: hdrName,
            mode: "ref",
            refName: hdrObj.$ref.split("/").pop(),
          });
        } else {
          const sch = hdrObj?.schema || {};
          const prim = toPrimitiveTuple(sch) || { type: "string", format: "" };
          headers.push({
            id: uid(),
            name: hdrName,
            mode: "inline",
            description: hdrObj?.description || "",
            type: prim.type,
            format: prim.format || "",
            enum: Array.isArray(sch.enum) ? sch.enum.map(String) : [],
            minLength: sch.minLength,
            maxLength: sch.maxLength,
            pattern: sch.pattern || "",
            minimum: sch.minimum,
            maximum: sch.maximum,
          });
        }
      });

      return {
        id: uid(),
        key,
        description: r?.description || "",
        mediaType,
        schemaMode,
        primitiveType,
        primitiveFormat,
        refName,
        headers,
      };
    });

    // ---------- components.requestBodies ----------
    const compRB = spec.components?.requestBodies || {};
    const importedRBs = Object.entries(compRB).map(([key, rb]) => {
      const c = firstContentEntry(rb?.content);
      let schemaMode = "none";
      let primitiveType = "string";
      let primitiveFormat = "";
      let refName = "";
      let mediaType = c?.mediaType || "application/json";

      if (c?.schema) {
        if (c.schema.$ref?.startsWith("#/components/schemas/")) {
          schemaMode = "ref";
          refName = c.schema.$ref.split("/").pop();
        } else {
          const prim = toPrimitiveTuple(c.schema);
          if (prim) {
            schemaMode = "primitive";
            primitiveType = prim.type;
            primitiveFormat = prim.format || "";
          }
        }
      }

      return {
        id: uid(),
        key,
        description: rb?.description || "",
        required: !!rb?.required,
        mediaType,
        schemaMode,
        primitiveType,
        primitiveFormat,
        refName,
      };
    });

    // ---------- components.examples ----------
    const compExamples = spec.components?.examples || {};
   const importedExamples = Object.entries(compExamples).map(([key, ex]) => {
      // externalValue wins per spec
      if (ex?.externalValue) {
        return {
          id: uid(),
          key,
          summary: ex?.summary || "",
          mode: "external",
          externalValue: ex.externalValue,
          valueJson: "",
          structuredValue: undefined,
      };
      }
      // If a literal value exists, prefer raw JSON mode for fidelity.
      if (Object.prototype.hasOwnProperty.call(ex || {}, "value")) {
        let valueJson = "";
        try { valueJson = JSON.stringify(ex.value ?? null, null, 2); } catch {}
        return {
          id: uid(),
          key,
          summary: ex?.summary || "",
          mode: "raw",
          valueJson,
          externalValue: "",
          structuredValue: undefined,
        };
      }
      // Fallback to empty form example
      return {
        id: uid(),
        key,
        summary: ex?.summary || "",
        mode: "form",
        structuredValue: undefined,
        valueJson: "",
        externalValue: "",
      };
    });

    // ---------- components.securitySchemes ----------
    const compSec = spec.components?.securitySchemes || {};
    const importedSec = Object.entries(compSec).map(([key, def]) => ({
      id: uid(),
      key,
      definition: def || {},
    }));

    // ---------- Commit to state ----------
    setSchemas(importedSchemas);
    setBlocks(importedBlocks);
    setReusableParams(importedParams);
    setReusableHeaders(importedHeaders);
    setReusableResponses(importedResponses);
    setReusableRequestBodies(importedRBs);
    setReusableExamples(importedExamples);
    setReusableSecurity(importedSec);

    // ---------- Persist ----------
    try {
      setYamlSpec(yaml.dump(spec)); // keep original imported YAML in editor
    } catch {}
    try {
      localStorage.setItem("swaggerBlocks", JSON.stringify(importedBlocks));
      localStorage.setItem("swaggerSchemas", JSON.stringify(importedSchemas));
      localStorage.setItem("swaggerParams", JSON.stringify(importedParams));
      localStorage.setItem("swaggerHeaders", JSON.stringify(importedHeaders));
      localStorage.setItem("swaggerResponses", JSON.stringify(importedResponses));
      localStorage.setItem("swaggerRequestBodies", JSON.stringify(importedRBs));
      localStorage.setItem("swaggerExamples", JSON.stringify(importedExamples));
      localStorage.setItem(
        "swaggerSecuritySchemes",
        JSON.stringify(importedSec)
      );
      localStorage.setItem("swaggerYaml", yaml.dump(spec));
    } catch {}

    alert("Import successful ✅");
  };

  /* ------------------------------------- */

  // YAML SYNC
  useEffect(() => {
    try {
      const parsed = yaml.load(yamlSpec) || {};
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

        // tags
        const defaultTags = parseTags(defaultTagsText);
        const opTags = Array.isArray(block.tags)
          ? block.tags
          : parseTags(block.tagsText || "");
        if ((opTags && opTags.length) || defaultTags.length)
          methodObject.tags = opTags && opTags.length ? opTags : defaultTags;

        // parameters (inline + $ref)
        if (block.parameters && block.parameters.length > 0) {
          methodObject.parameters = block.parameters.map((param) => {
            if (param.mode === "ref" && param.refName)
              return { $ref: `#/components/parameters/${param.refName}` };

            const schema =
              param.type === "double"
                ? { type: "number", format: "double" }
                : { type: param.type };
            if (param.format && !schema.format) schema.format = param.format;
            if (param.minLength != null) schema.minLength = param.minLength;
            if (param.maxLength != null) schema.maxLength = param.maxLength;
            if (param.pattern) schema.pattern = param.pattern;
            if (param.minimum != null) schema.minimum = param.minimum;
            if (param.maximum != null) schema.maximum = param.maximum;
            if (Array.isArray(param.enum) && param.enum.length)
              schema.enum = param.enum;

            return {
              name: param.name,
              in: param.in,
              description: param.description,
              required: param.required,
              schema,
            };
          });
        }

        // requestBody (inline primitive/ref)
        if (requestSchemaRef) {
          let schemaObj = {};
          if (requestSchemaRef.startsWith("ref:"))
            schemaObj = {
              $ref: `#/components/schemas/${requestSchemaRef.replace("ref:", "")}`,
            };
          else if (requestSchemaRef.startsWith("type:")) {
            const t = requestSchemaRef.replace("type:", "");
            schemaObj =
              t === "double" ? { type: "number", format: "double" } : { type: t };
          }
          methodObject.requestBody = {
            required: true,
            content: { "application/json": { schema: schemaObj } },
          };
        }

        // responses (custom list OR default 200)
        if (responses.length > 0) {
          responses.forEach((res) => {
            const resp = { description: res.description || "" };
            if (res.schemaRef) {
              let schemaObj = {};
              if (res.schemaRef.startsWith("ref:"))
                schemaObj = {
                  $ref: `#/components/schemas/${res.schemaRef.replace("ref:", "")}`,
                };
              else if (res.schemaRef.startsWith("type:")) {
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
          let schemaObj = {};
          if (responseSchemaRef.startsWith("ref:"))
            schemaObj = {
              $ref: `#/components/schemas/${responseSchemaRef.replace("ref:", "")}`,
            };
          else if (responseSchemaRef.startsWith("type:")) {
            const t = responseSchemaRef.replace("type:", "");
            schemaObj =
              t === "double" ? { type: "number", format: "double" } : { type: t };
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

      // components
      parsed.components = parsed.components || {};

      // components.schemas
      parsed.components.schemas = {};
      const buildItemsSchema = (schema) => {
        if (schema.itemsType === "$ref" && schema.ref)
          return { $ref: `#/components/schemas/${schema.ref}` };
        if (schema.itemsType === "double")
          return { type: "number", format: "double" };
        const t = schema.itemsType || "string";
        const obj = { type: t };
        if (schema.itemsFormat) obj.format = schema.itemsFormat;
        return obj;
      };
      const mapVariant = (v) => {
        if (v.kind === "$ref" && v.ref)
          return { $ref: `#/components/schemas/${v.ref}` };
        if (v.type === "double") return { type: "number", format: "double" };
        const obj = { type: v.type || "string" };
        if (v.format) obj.format = v.format;
        return obj;
      };

      (schemas || []).forEach((schema) => {
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
          parsed.components.schemas[schema.name] = {
            $ref: `#/components/schemas/${schema.ref}`,
          };
          return;
        }

        // object
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
            properties[field.name] = {
              $ref: `#/components/schemas/${field.ref}`,
            };
          } else if (field.type === "double") {
            properties[field.name] = applyCommon({
              type: "number",
              format: "double",
            });
          } else if (field.type === "oneOf" || field.type === "anyOf") {
            const variants = (field.variants || []).map(mapVariant).filter(Boolean);
            if (variants.length > 0)
              properties[field.name] = applyCommon({ [field.type]: variants });
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

      // components.parameters
      parsed.components.parameters = {};
      (reusableParams || []).forEach((p) => {
        const schema =
          p.type === "double"
            ? { type: "number", format: "double" }
            : { type: p.type, ...(p.format ? { format: p.format } : {}) };
        if (p.minLength != null) schema.minLength = p.minLength;
        if (p.maxLength != null) schema.maxLength = p.maxLength;
        if (p.pattern) schema.pattern = p.pattern;
        if (p.minimum != null) schema.minimum = p.minimum;
        if (p.maximum != null) schema.maximum = p.maximum;
        if (Array.isArray(p.enum) && p.enum.length) schema.enum = p.enum;

        parsed.components.parameters[p.key] = {
          name: p.name,
          in: p.in,
          description: p.description || "",
          required: !!p.required,
          ...(p.style ? { style: p.style } : {}),
          ...(p.explode != null ? { explode: !!p.explode } : {}),
          schema,
        };
      });

      // components.responses
      parsed.components.responses = {};
      (reusableResponses || []).forEach((r) => {
        // Build optional content
        let contentObj;
        if (r.schemaMode === "primitive") {
          const t =
            r.primitiveType === "double"
              ? { type: "number", format: "double" }
              : { type: r.primitiveType };
          if (r.primitiveFormat) t.format = r.primitiveFormat;
          contentObj = { [r.mediaType || "application/json"]: { schema: t } };
        } else if (r.schemaMode === "ref" && r.refName) {
          contentObj = {
            [r.mediaType || "application/json"]: {
              schema: { $ref: `#/components/schemas/${r.refName}` },
            },
          };
        }

        // Build optional headers
        const headersList = r.headers || [];
        let headersObj;
        if (headersList.length) {
          headersObj = {};
          headersList.forEach((h) => {
            if (!h?.name) return; // header map key
            if (h.mode === "ref" && h.refName) {
              headersObj[h.name] = { $ref: `#/components/headers/${h.refName}` };
            } else if (h.mode === "inline") {
              const schema =
                h.type === "double"
                  ? { type: "number", format: "double" }
                  : { type: h.type || "string" };
              if (h.format) schema.format = h.format;
              if (h.minLength != null) schema.minLength = h.minLength;
              if (h.maxLength != null) schema.maxLength = h.maxLength;
              if (h.pattern) schema.pattern = h.pattern;
              if (h.minimum != null) schema.minimum = h.minimum;
              if (h.maximum != null) schema.maximum = h.maximum;
              if (Array.isArray(h.enum) && h.enum.length) schema.enum = h.enum;

              headersObj[h.name] = {
                ...(h.description ? { description: h.description } : {}),
                schema,
              };
            }
          });
        }

        parsed.components.responses[r.key] = {
          description: r.description || "",
          ...(contentObj ? { content: contentObj } : {}),
          ...(headersObj ? { headers: headersObj } : {}),
        };
      });

      // components.headers
      parsed.components.headers = {};
      (reusableHeaders || []).forEach((h) => {
        const schema =
          h.type === "double"
            ? { type: "number", format: "double" }
            : { type: h.type || "string" };
        if (h.format) schema.format = h.format;
        if (h.minLength != null) schema.minLength = h.minLength;
        if (h.maxLength != null) schema.maxLength = h.maxLength;
        if (h.pattern) schema.pattern = h.pattern;
        if (h.minimum != null) schema.minimum = h.minimum;
        if (h.maximum != null) schema.maximum = h.maximum;
        if (Array.isArray(h.enum) && h.enum.length) schema.enum = h.enum;

        parsed.components.headers[h.key] = {
          ...(h.description ? { description: h.description } : {}),
          ...(h.style ? { style: h.style } : {}),
          ...(h.explode != null ? { explode: !!h.explode } : {}),
          schema,
          ...(h.example ? { example: h.example } : {}),
        };
      });

      // components.requestBodies
      parsed.components.requestBodies = {};
      (reusableRequestBodies || []).forEach((rb) => {
        let schema;
        if (rb.schemaMode === "primitive") {
          schema =
            rb.primitiveType === "double"
              ? { type: "number", format: "double" }
              : { type: rb.primitiveType };
          if (rb.primitiveFormat) schema.format = rb.primitiveFormat;
        } else if (rb.schemaMode === "ref" && rb.refName) {
          schema = { $ref: `#/components/schemas/${rb.refName}` };
        }
        parsed.components.requestBodies[rb.key] = {
          description: rb.description || "",
          required: !!rb.required,
          content: {
            [rb.mediaType || "application/json"]: { schema: schema || { type: "object" } },
          },
        };
      });

      // components.examples
      parsed.components.examples = {};
      (reusableExamples || []).forEach(ex => {
        // externalValue beats value per spec
        if (ex.mode === "external" && ex.externalValue) {
          parsed.components.examples[ex.key] = {
            ...(ex.summary ? { summary: ex.summary } : {}),
            externalValue: ex.externalValue
          };
        } else if (ex.mode === "raw" && ex.valueJson?.trim()) {
          try {
            parsed.components.examples[ex.key] = {
              ...(ex.summary ? { summary: ex.summary } : {}),
              value: JSON.parse(ex.valueJson)
            };
          } catch {
            // fallback: store as string so YAML remains valid
            parsed.components.examples[ex.key] = {
              ...(ex.summary ? { summary: ex.summary } : {}),
              value: ex.valueJson
            };
          }
        } else if (ex.mode === "form") {
          parsed.components.examples[ex.key] = {
            ...(ex.summary ? { summary: ex.summary } : {}),
            value: ex.structuredValue ?? null
          };
        }
      });

      // components.securitySchemes
      parsed.components.securitySchemes = {};
      (reusableSecurity || []).forEach((s) => {
        parsed.components.securitySchemes[s.key] = s.definition || {};
      });

      // tags
      const allTagNames = new Set();
      Object.values(parsed.paths || {}).forEach((pathItem) => {
        Object.values(pathItem || {}).forEach((op) => {
          if (op && Array.isArray(op.tags)) op.tags.forEach((t) => allTagNames.add(t));
        });
      });
      parsed.tags = Array.from(allTagNames).map((name) => ({ name }));

      setOpenapi(parsed);
      const nextYaml = yaml.dump(parsed);
      setYamlSpec((prev) => (prev === nextYaml ? prev : nextYaml));
    } catch (e) {
      console.error("Failed to parse or update YAML", e);
    }
  }, [
    blocks,
    schemas,
    defaultTagsText,
    reusableParams,
    reusableResponses,
    reusableRequestBodies,
    reusableHeaders,
    reusableExamples,
    reusableSecurity,
    // yamlSpec,
  ]);

  return (
    <div className={styles.canvasContainer}>
      {/* TOP ROW */}
      <div className={styles.topRowGrid}>
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
            duplicateBlock={duplicateBlock}
            reusableParams={reusableParams} // for $ref parameter dropdowns
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
              <label
                className={styles.addBtn}
                style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
              >
                Import
                <input
                  type="file"
                  accept=".yaml,.yml,.json"
                  onChange={onImportFile}
                  style={{ display: "none" }}
                />
              </label>
              <button onClick={downloadYaml} className={styles.downloadBtn}>
                Download
              </button>
              <button onClick={clearWorkspace} className={styles.deleteEndpointBtn}>
                Clear
              </button>
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

      {/* BOTTOM: tabbed Components panel */}
      <div
        className={`${styles.bottomRow} ${componentsCollapsed ? styles.collapsed : ""}`}
        style={{ height: componentsCollapsed ? 0 : componentsHeight }}
      >
        {/* drag handle */}
        <div className={styles.resizeHandle} onMouseDown={onResizeStart}>
          <div className={styles.resizeGrip} />
        </div>

        {/* toolbar */}
        <div className={styles.componentsToolbar}>
          <div className={styles.componentsToolbarLeft}>
            <strong>Components</strong>
          </div>
          <div className={styles.componentsToolbarRight}>
            <button
              type="button"
              className={styles.toolbarBtn}
              onClick={resetHeight}
              title="Reset panel height to default"
            >
              Reset height
            </button>
            <button
              type="button"
              className={styles.toolbarBtn}
              onClick={toggleCollapsed}
              title={componentsCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {componentsCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>

        <div className={styles.componentsInner}>
          <ComponentsPanel
            schemaProps={{
              schemas,
              editingSchemas,
              updateSchemaName,
              addField,
              updateField,
              deleteField,
              submitSchema,
              startNewSchema,
              startEditSchema,
              duplicateSchema,
              deleteSchemaById,
              cancelDraft,
            }}
            parameterProps={{
              reusableParams,
              setReusableParams,
              editingParams,
              setEditingParams,
            }}
            responseProps={{
              reusableResponses,
              setReusableResponses,
              editingResponses,
              setEditingResponses,
              schemas,
              reusableHeaders,
            }}
            requestBodyProps={{
              reusableRequestBodies,
              setReusableRequestBodies,
              editingRequestBodies,
              setEditingRequestBodies,
              schemas,
            }}
            headerProps={{
              reusableHeaders,
              setReusableHeaders,
              editingHeaders,
              setEditingHeaders,
            }}
            exampleProps={{
              reusableExamples,
              setReusableExamples,
              editingExamples,
              setEditingExamples,
              // for form-building:
              schemas,
              reusableResponses,
              reusableRequestBodies,
              reusableParams: reusableParams,
              reusableHeaders,
            }}
            // if you already have security schemes tab, pass those props here too

            securityProps={{
              reusableSecurity,
              setReusableSecurity,
              editingSecurity,
              setEditingSecurity,
            }}
          />
        </div>
      </div>
    </div>
  );
}
