import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEcpayReturnPath } from '@/lib/capacitor/resolve-ecpay-return-path';

test('resolveEcpayReturnPath accepts nutriguard logistics return', () => {
  assert.equal(
    resolveEcpayReturnPath(
      'nutriguard://shop?checkout=1&orderId=oid&logisticsDone=1&vendorId=vid',
    ),
    '/shop?checkout=1&orderId=oid&logisticsDone=1&vendorId=vid',
  );
});

test('resolveEcpayReturnPath accepts nutriguard payment return', () => {
  assert.equal(
    resolveEcpayReturnPath(
      'nutriguard://shop?checkout=1&orderId=oid&paymentDone=1&rtnCode=1',
    ),
    '/shop?checkout=1&orderId=oid&paymentDone=1&rtnCode=1',
  );
});

test('resolveEcpayReturnPath rejects unrelated scheme', () => {
  assert.equal(
    resolveEcpayReturnPath('nutriguard://auth/callback?code=abc'),
    null,
  );
});
