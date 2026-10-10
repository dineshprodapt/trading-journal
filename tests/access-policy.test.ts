import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedAccount } from '../src/app/core/access-policy';

test('temporary allowlist requires the verified approved Google account', () => {
  assert.equal(isAllowedAccount('dineshmick@gmail.com', true, 'google.com'), true);
  assert.equal(isAllowedAccount('DineshMick@gmail.com', true, 'google.com'), true);
  assert.equal(isAllowedAccount('other@gmail.com', true, 'google.com'), false);
  assert.equal(isAllowedAccount('dineshmick@gmail.com', false, 'google.com'), false);
  assert.equal(isAllowedAccount('dineshmick@gmail.com', true, 'password'), false);
  assert.equal(isAllowedAccount(null, true, 'google.com'), false);
});
