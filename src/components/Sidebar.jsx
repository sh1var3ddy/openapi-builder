import {useDrag} from 'react-dnd';
import styles from './Sidebar.module.css';

const methods = ["GET", "POST", "PUT", "DELETE"];

function DraggableMethod({method}) {
  const [{isDragging}, drag] = useDrag({
    type: 'method',
    item: {method},
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`${styles.method} ${isDragging ? styles.dragging : ''}`}
    >
      {method}
    </div>
  );
}

export default function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <h2>HTTP Methods</h2>
      <div className={styles.methods}>
        {methods.map((method) => (
          <DraggableMethod key={method} method={method} />
        ))}
      </div>
    </div>
  );
}