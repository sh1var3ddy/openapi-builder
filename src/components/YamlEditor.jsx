// src/components/YamlEditor.jsx
import Editor from "@monaco-editor/react";

export default function YamlEditor({ yamlText, onChange }) {
  return (
    <div style={{ height: "600px", border: "1px solid #ccc", borderRadius: "6px" }}>
      <Editor
        height="100%"
        language="yaml"
        value={yamlText}
        onChange={(value) => onChange(value)}
        theme="vs-dark"
        options={{ fontSize: 14 }}
      />
    </div>
  );
}
