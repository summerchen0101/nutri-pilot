/**
 * @deprecated 綠界 V1 改由 ecpay-logistics-map-return（ServerReplyURL）處理選店回傳
 */
Deno.serve(() => {
  return new Response(
    "ecpay-logistics-client-return is deprecated; use ecpay-logistics-map-return",
    { status: 410 },
  );
});
