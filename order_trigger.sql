CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.order_code := 'ORD-' || LPAD(NEW.id::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_order_code
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION generate_order_code();

-- Reset ENQ-00004 back to Confirmed so Convert to Order button shows
UPDATE enquiries SET status = 'Confirmed' WHERE enquiry_code = 'ENQ-00004';

SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'orders';
