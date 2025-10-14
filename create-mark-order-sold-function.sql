-- Create or replace the mark_order_sold RPC function
-- This function handles marking orders as sold with proper quantity tracking

CREATE OR REPLACE FUNCTION mark_order_sold(
  p_order_id UUID,
  p_sell_date DATE,
  p_sell_price_cents INTEGER,
  p_sell_quantity INTEGER,
  p_sell_location TEXT DEFAULT NULL,
  p_sell_fees_cents INTEGER DEFAULT 0,
  p_sell_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_current_quantity_sold INTEGER;
  v_total_quantity INTEGER;
  v_new_quantity_sold INTEGER;
  v_total_cost_cents INTEGER;
  v_price_per_item_cents INTEGER;
BEGIN
  -- Get current order details
  SELECT 
    COALESCE(quantity_sold, 0),
    quantity,
    total_cost_cents,
    price_per_item_cents
  INTO 
    v_current_quantity_sold,
    v_total_quantity,
    v_total_cost_cents,
    v_price_per_item_cents
  FROM orders
  WHERE id = p_order_id;

  -- Validate that we're not selling more than available
  v_new_quantity_sold := v_current_quantity_sold + p_sell_quantity;
  
  IF v_new_quantity_sold > v_total_quantity THEN
    RAISE EXCEPTION 'Cannot sell % items. Only % items remaining (% already sold)',
      p_sell_quantity,
      v_total_quantity - v_current_quantity_sold,
      v_current_quantity_sold;
  END IF;

  -- Calculate sale values
  DECLARE
    v_sale_total_cents INTEGER;
    v_sale_net_cents INTEGER;
    v_cost_per_item_cents INTEGER;
    v_cost_of_sold_items INTEGER;
    v_profit_cents INTEGER;
  BEGIN
    -- Calculate sale total
    v_sale_total_cents := p_sell_price_cents * p_sell_quantity;
    
    -- Calculate net after fees
    v_sale_net_cents := v_sale_total_cents - COALESCE(p_sell_fees_cents, 0);
    
    -- Calculate cost of items being sold (proportional to quantity)
    v_cost_per_item_cents := v_price_per_item_cents;
    v_cost_of_sold_items := v_cost_per_item_cents * p_sell_quantity;
    
    -- Calculate profit for this sale
    v_profit_cents := v_sale_net_cents - v_cost_of_sold_items;

    -- Update the order with sale information
    UPDATE orders
    SET
      quantity_sold = v_new_quantity_sold,
      sale_date = p_sell_date,
      sale_price_per_item_cents = p_sell_price_cents,
      sale_total_cents = v_sale_total_cents,
      sale_fees_cents = COALESCE(p_sell_fees_cents, 0),
      sale_net_cents = v_sale_net_cents,
      sale_retailer_name = p_sell_location,
      updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Note: net_profit_cents is calculated in the view, not stored
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_order_sold(UUID, DATE, INTEGER, INTEGER, TEXT, INTEGER, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION mark_order_sold IS 'Marks an order (or portion of it) as sold. Supports partial sales by tracking quantity_sold. Can be called multiple times to sell items incrementally.';

