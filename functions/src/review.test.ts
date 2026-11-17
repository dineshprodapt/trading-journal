import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responseText } from './review';
test('handles completed provider output and rejects incomplete, refused and empty output', () => {
  assert.equal(responseText({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{"findings":[]}' }] }] }), '{"findings":[]}');
  for (const body of [ { status: 'incomplete' }, { status: 'completed', output: [] },
    { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] } ]) {
    assert.throws(() => responseText(body));
  }
});
