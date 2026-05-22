import { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: 'trigger-1', type: 'input', position: { x: 60, y: 80 }, data: { label: 'Trigger: Contact Signs Up' }, style: { background: '#dbeafe', border: '1px solid #2563eb', borderRadius: 8, padding: 8 } },
  { id: 'action-1', position: { x: 320, y: 80 }, data: { label: 'Action: Send Welcome Email' }, style: { background: '#dcfce7', border: '1px solid #16a34a', borderRadius: 8, padding: 8 } },
  { id: 'action-2', position: { x: 580, y: 80 }, data: { label: 'Action: Wait 3 Days' }, style: { background: '#fef9c3', border: '1px solid #ca8a04', borderRadius: 8, padding: 8 } },
  { id: 'action-3', position: { x: 840, y: 80 }, data: { label: 'Action: Send Discount Offer' }, style: { background: '#dcfce7', border: '1px solid #16a34a', borderRadius: 8, padding: 8 } },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'trigger-1', target: 'action-1', animated: true },
  { id: 'e2', source: 'action-1', target: 'action-2', animated: true },
  { id: 'e3', source: 'action-2', target: 'action-3', animated: true },
];

let nodeSeq = 4;

export default function WorkflowBuilder() {
  const [name, setName] = useState('Welcome Drip');
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((ns) => applyNodeChanges(c, ns)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((es) => applyEdgeChanges(c, es)), []);
  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, animated: true }, es)), []);

  const addNode = (kind: 'trigger' | 'action') => {
    const id = `${kind}-${nodeSeq++}`;
    const label = kind === 'trigger' ? 'Trigger: Custom Event' : 'Action: New Step';
    setNodes((ns) => [
      ...ns,
      {
        id,
        position: { x: 60 + (ns.length * 30) % 600, y: 220 + (ns.length * 18) % 200 },
        data: { label },
        style: {
          background: kind === 'trigger' ? '#dbeafe' : '#dcfce7',
          border: `1px solid ${kind === 'trigger' ? '#2563eb' : '#16a34a'}`,
          borderRadius: 8,
          padding: 8,
        },
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSavedId(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/custom-views/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, nodes, edges }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSavedId(data.workflow_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="workflow-builder">
      <h2 className="text-xl font-bold text-gray-900 mb-3">Workflow Builder</h2>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="Workflow name"
          data-testid="wf-name"
        />
        <button onClick={() => addNode('trigger')} className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200">+ Trigger</button>
        <button onClick={() => addNode('action')} className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200">+ Action</button>
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 disabled:opacity-50"
          data-testid="wf-save"
        >
          {saving ? 'Saving…' : 'Save Workflow'}
        </button>
        {savedId && <span className="text-sm text-green-700" data-testid="wf-saved-id">Saved as {savedId}</span>}
        {error && <span className="text-sm text-red-600">Error: {error}</span>}
      </div>
      <div style={{ width: '100%', height: 420, border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <p className="text-xs text-gray-500 mt-2">Drag nodes to rearrange. Drag from a node handle to another to connect.</p>
    </div>
  );
}
