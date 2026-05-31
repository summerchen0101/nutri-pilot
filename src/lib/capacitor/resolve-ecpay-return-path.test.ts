import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEcpayReturnPath } from '@/lib/capacitor/resolve-ecpay-return-path';

test('resolveEcpayReturnPath maps native paymentDone to payment-complete', () => {
  assert.equal(
    resolveEcpayReturnPath(
      'nutriguard://shop?checkout=1&orderId=oid&paymentDone=1&rtnCode=1',
    ),
    '/shop/payment-complete?orderId=oid&rtnCode=1',
  );
});

test('resolveEcpayReturnPath accepts payment-complete deep link', () => {
  assert.equal(
    resolveEcpayReturnPath(
      'nutriguard://shop/payment-complete?orderId=oid&rtnCode=1',
    ),
    '/shop/payment-complete?orderId=oid&rtnCode=1',
  );
});

test('resolveEcpayReturnPath accepts nutriguard logistics return', () => {
  assert.equal(
    resolveEcpayReturnPath(
      'nutriguard://shop?checkout=1&orderId=oid&logisticsDone=1&vendorId=vid',
    ),
    '/shop?checkout=1&orderId=oid&logisticsDone=1&vendorId=vid',
  );
});

test('resolveEcpayReturnPath rejects unrelated scheme', () => {
  assert.equal(
    resolveEcpayReturnPath('nutriguard://auth/callback?code=abc'),
    null,
  );
});
