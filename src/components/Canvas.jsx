import { useDrop } from "react-dnd";
import { useState } from "react";
import styles from "./Canvas.module.css";

export default function Canvas() {
  const [endpoints, setEndpoints] = useState([]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "method",
    drop: (item) => {
      const newEndpoint = {
        method: item.method,
        path: "/new-path",
      };
      setEndpoints((prev) => [...prev, newEndpoint]);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const updatePath = (index, newPath) => {
    setEndpoints((prev) =>
      prev.map((ep, i) =>
        i === index ? { ...ep, path: newPath } : ep
      )
    );
  };

  return (
    <div
      ref={drop}
      className={styles.canvas}
      style={{ backgroundColor: isOver ? "#eef" : "#fdfdfd" }}
    >
      <h2>Drop here to create endpoints</h2>
      {endpoints.map((ep, idx) => (
        <div key={idx} className={styles.endpoint}>
          <input
            className={styles.pathInput}
            value={ep.path}
            onChange={(e) => updatePath(idx, e.target.value)}
          />
          <span className={styles.method}>{ep.method}</span>
        </div>
      ))}
    </div>
  );
}
