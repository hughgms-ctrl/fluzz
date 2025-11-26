-- Fix search_path for calculate_next_due_date function
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  _current_date date,
  _recurrence_type text,
  _recurrence_config jsonb
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE _recurrence_type
    WHEN 'daily' THEN
      RETURN _current_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN _current_date + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN _current_date + INTERVAL '1 month';
    WHEN 'yearly' THEN
      RETURN _current_date + INTERVAL '1 year';
    WHEN 'custom' THEN
      -- Custom recurrence logic will be handled in the application
      RETURN _current_date + INTERVAL '1 day';
    ELSE
      RETURN _current_date + INTERVAL '1 day';
  END CASE;
END;
$$;