// src/components/ComponentsPanel.jsx
import { useState } from "react";
import styles from "./Canvas.module.css";
import SchemaBuilder from "./SchemaBuilder";
import ParameterBuilder from "./ParameterBuilder";
import ResponseBuilder from "./ResponseBuilder";
import RequestBodyBuilder from "./RequestBodyBuilder";

const TABS = [
  { key: "schemas", label: "Schemas" },
  { key: "parameters", label: "Parameters" },
  { key: "responses", label: "Responses" },
  { key: "requestBodies", label: "Request Bodies" },
  // Later: headers, examples, links, callbacks, securitySchemes
];

export default function ComponentsPanel(props) {
  const [tab, setTab] = useState("schemas");

  return (
    <div className={styles.schemaPanel}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? styles.saveBtn : styles.addBtn}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "schemas" && (
        <SchemaBuilder {...props.schemaProps} />
      )}

      {tab === "parameters" && (
        <ParameterBuilder {...props.parameterProps} />
      )}

      {tab === "responses" && (
        <ResponseBuilder {...props.responseProps} />
      )}

      {tab === "requestBodies" && (
        <RequestBodyBuilder {...props.requestBodyProps} />
      )}
    </div>
  );
}
