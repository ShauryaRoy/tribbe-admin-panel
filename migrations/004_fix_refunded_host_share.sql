-- Fix refunded transactions to have host_share = 0
UPDATE payment_transactions
SET host_share = 0
WHERE refunded_at IS NOT NULL OR status = 'refunded';

-- Verify the fix
SELECT 
  status,
  refunded_at IS NOT NULL as is_refunded,
  COUNT(*) as count,
  SUM(amount)/100 as total_amount,
  SUM(host_share)/100 as total_host_share
FROM payment_transactions 
WHERE event_id = 301
GROUP BY status, refunded_at IS NOT NULL
ORDER BY status;
