import type { EcpayBridgePayloadResult } from '@/app/(main)/shop/actions';

export function submitEcpayBridgeInDocument(
  bridge: Extract<EcpayBridgePayloadResult, { ok: true }>,
): void {
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
