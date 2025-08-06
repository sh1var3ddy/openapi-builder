// src/components/SwaggerPreview.jsx
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function SwaggerPreview({ spec }) {
  return (
    <div style={{ maxHeight: "600px", overflow: "auto", border: "1px solid #ccc", borderRadius: "6px" }}>
      <SwaggerUI spec={spec} />
    </div>
  );
}
