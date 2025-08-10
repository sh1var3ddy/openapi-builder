// src/components/ComponentsPanel.jsx
import { useState } from "react";
import styles from "./Canvas.module.css";
import SchemaBuilder from "./SchemaBuilder";
import ParameterBuilder from "./ParameterBuilder";
import ResponseBuilder from "./ResponseBuilder";
import RequestBodyBuilder from "./RequestBodyBuilder";
import HeaderBuilder from "./HeaderBuilder";
import ExamplesBuilder from "./ExamplesBuilder";
import SecuritySchemesBuilder from "./SecuritySchemesBuilder";

export default function ComponentsPanel({
  schemaProps,
  parameterProps,
  responseProps,
  requestBodyProps,
  headerProps,
  exampleProps,
  securityProps,
}) {
  const [activeTab, setActiveTab] = useState("schemas");

  const tabs = [
    { key: "schemas", label: "Schemas" },
    { key: "parameters", label: "Parameters" },
    { key: "responses", label: "Responses" },
    { key: "requestBodies", label: "Request Bodies" },
    { key: "headers", label: "Headers" },
    { key: "examples", label: "Examples" },
    { key: "security", label: "Security Schemes" },
  ];

  return (
    <div className={styles.componentsPanel}>
      {/* Tab buttons */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.activeTab : ""}`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === "schemas" && <SchemaBuilder {...schemaProps} />}
        {activeTab === "parameters" && <ParameterBuilder {...parameterProps} />}
        {activeTab === "responses" && <ResponseBuilder {...responseProps} />}
        {activeTab === "requestBodies" && <RequestBodyBuilder {...requestBodyProps} />}
        {activeTab === "headers" && <HeaderBuilder {...headerProps} />}
        {activeTab === "examples" && <ExamplesBuilder {...exampleProps} />}
        {activeTab === "security" && <SecuritySchemesBuilder {...securityProps} />}
      </div>
    </div>
  );
}
