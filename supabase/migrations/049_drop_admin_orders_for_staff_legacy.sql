-- 047 已擴充 admin_orders_for_staff（含篩選參數與 DEFAULT），
-- 040 的單參數 overload 與之並存時，僅傳 p_limit 會觸發 PostgREST 無法選擇候選函式。

DROP FUNCTION IF EXISTS public.admin_orders_for_staff(int);
