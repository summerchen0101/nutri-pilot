'use client';

/** 以 POST 導向藍新 MPG（幕前交易）。 */
export function submitNewebpayMpgForm(
  paymentUrl: string,
  formFields: Record<string, string>,
): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;
  for (const [name, value] of Object.entries(formFields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
