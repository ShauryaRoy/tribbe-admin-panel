-- Remove platform fees and set host_share equal to amount
-- This fixes the issue where hosts were only getting 95% of ticket prices

UPDATE payment_transactions
SET 
  platform_fee = 0,
  host_share = amount
WHERE platform_fee > 0 OR host_share != amount;

-- Verify the changes
SELECT 
  COUNT(*) as updated_count,
  SUM(amount) / 100 as total_amount_rupees,
  SUM(host_share) / 100 as total_host_share_rupees,
  SUM(platform_fee) / 100 as total_platform_fee_rupees
FROM payment_transactions;
