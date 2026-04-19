-- 依名稱／別名 ILIKE 搜尋 food_cache（供 app searchFoods 第一層）
-- 須已套用 004_food_cache_multi_source.sql（is_verified、alias）

CREATE OR REPLACE FUNCTION public.match_food_cache(p_query text)
RETURNS SETOF food_cache
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT *
  FROM food_cache
  WHERE length(trim(p_query)) >= 2
    AND (
      name ILIKE '%' || trim(p_query) || '%'
      OR EXISTS (
        SELECT 1
        FROM unnest(coalesce(alias, '{}')) AS a(txt)
        WHERE a.txt ILIKE '%' || trim(p_query) || '%'
      )
    )
  ORDER BY is_verified DESC NULLS LAST, name ASC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.match_food_cache(text) TO authenticated;
