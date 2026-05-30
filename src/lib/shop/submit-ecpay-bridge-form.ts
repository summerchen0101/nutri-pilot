import type { EcpaySubmitBridgePayload } from '@/lib/shop/ecpay-bridge-types';

export function submitEcpayBridgeInDocument(bridge: EcpaySubmitBridgePayload): void {
  if ('redirectUrl' in bridge) {
    window.location.href = bridge.redirectUrl;
    return;
  }

  const form = document.createElement('form');
  form.method = 'post';
  form.action = bridge.action;

  for (const [name, value] of Object.entries(bridge.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
