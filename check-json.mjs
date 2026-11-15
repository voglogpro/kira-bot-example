// Dependency-free structural check of this exact published teaching artifact.
// It does not execute KIRA runtime or contact any external service.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expectedSha256 = 'b290b63c8d81ec1c10634950ea86e64cea3b808391b150f45550661c78476943';
const bytes = await readFile(new URL('./bot-lead-example.json', import.meta.url));
const sha256 = createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256, expectedSha256, 'The file differs from the original published example.');
const flow = JSON.parse(bytes.toString('utf8'));
assert.equal(flow.schemaVersion, 1);
assert.equal(flow.nodes.length, 6);
assert.equal(flow.edges.length, 5);

const nodes = new Map(flow.nodes.map(node => [node.id, node]));
assert.equal(nodes.size, 6, 'Node IDs must be unique.');
assert.equal(new Set(flow.edges.map(edge => edge.id)).size, 5, 'Edge IDs must be unique.');
const outgoing = new Map();
for (const edge of flow.edges) {
  assert(nodes.has(edge.from) && nodes.has(edge.to), 'An edge points to a missing node.');
  assert(!outgoing.has(edge.from), 'This teaching example has one route without branches.');
  outgoing.set(edge.from, edge);
}
const starts = flow.nodes.filter(node => node.type === 'start');
assert.equal(starts.length, 1);
const route = [];
const seen = new Set();
let current = starts[0];
while (current) {
  assert(!seen.has(current.id), 'The example must not contain a cycle.');
  seen.add(current.id);
  route.push(current);
  const edge = outgoing.get(current.id);
  if (edge) {
    const handles = current.type === 'message'
      ? current.props.buttons.filter(button => button.kind === 'next').map(button => button.id)
      : ['next'];
    assert(handles.includes(edge.fromHandle), 'An edge uses an unknown exit handle.');
  }
  current = edge ? nodes.get(edge.to) : undefined;
}
assert.equal(seen.size, 6, 'All six steps must be reachable from the start.');
assert.deepEqual(route.map(node => node.type), ['start', 'message', 'question', 'question', 'lead', 'message']);
assert.equal(route[2].props.variable, 'name');
assert.equal(route[3].props.variable, 'contact');
assert.equal(route[3].props.expects, 'email');
assert.deepEqual(route[4].props.fields.map(field => field.variable), ['name', 'contact']);

console.log(JSON.stringify({
  passed: true,
  sha256,
  nodes: nodes.size,
  edges: flow.edges.length,
  reachable: seen.size,
  route: route.map(node => node.type),
  scope: 'Structural artifact check only; no KIRA runtime, messenger or CRM delivery was executed.',
}, null, 2));
