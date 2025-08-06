import {useDrop} from 'react-dnd';
import styles from './Canvas.module.css';
import { useState } from 'react';

export default function Canvas() {
    const [endpoints, setEndpoints] = useState([]);
    const [{ isOver }, drop] = useDrop({
        accept: 'method',
        drop: (item) => {
            setEndpoints((prev) => [...prev, item.method]);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <div
            ref={drop}
            className={styles.canvas}
            style={{ backgroundColor: isOver ? "#eef" : "#546c77ff" }}
        >
        <h2>Drop here to create endpoints</h2>
        {endpoints.map((ep, idx) => (
            <div key={idx} className={styles.endpoint}>
            /new-path → <strong>{ep.method}</strong>
            </div>
        ))}
        </div>
    );
}