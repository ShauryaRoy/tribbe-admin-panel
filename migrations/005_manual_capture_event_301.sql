-- Manually capture the 2 pending transactions for Event 301 based on admin confirmation
UPDATE payment_transactions
SET 
  status = 'captured',
  updated_at = NOW()
WHERE 
  event_id = 301 
  AND status = 'created'
  AND id IN (73, 77);

-- Verify the new count
SELECT 
  COUNT(*) FILTER (WHERE status = 'captured' AND refunded_at IS NULL) as captured_count,
  SUM(host_share) FILTER (WHERE status = 'captured' AND refunded_at IS NULL) / 100 as host_earnings
FROM payment_transactions 
WHERE event_id = 301;
