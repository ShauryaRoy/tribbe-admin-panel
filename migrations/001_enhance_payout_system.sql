-- Migration: Enhance payout system with robust tracking and safety features
-- This migration updates the payouts and payout_transactions tables to support
-- a comprehensive host payout workflow with double-payment prevention

-- Add new columns to payouts table
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payout_method VARCHAR(10);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paid_by VARCHAR(255);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS event_count INTEGER;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS last_event_date TIMESTAMP WITH TIME ZONE;

-- Rename column for consistency (if needed)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'payouts' AND column_name = 'created_by') THEN
        -- Column exists, no action needed
        NULL;
    END IF;
END $$;

-- Update payout_transactions table structure
ALTER TABLE payout_transactions ADD COLUMN IF NOT EXISTS event_id INTEGER;
ALTER TABLE payout_transactions ADD COLUMN IF NOT EXISTS gross_amount INTEGER;
ALTER TABLE payout_transactions ADD COLUMN IF NOT EXISTS platform_fee INTEGER;
ALTER TABLE payout_transactions ADD COLUMN IF NOT EXISTS net_amount INTEGER;
ALTER TABLE payout_transactions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- Rename column for consistency
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'payout_transactions' AND column_name = 'host_share_amount') THEN
        -- Migrate data from old column to new column
        UPDATE payout_transactions SET net_amount = host_share_amount WHERE net_amount IS NULL;
    END IF;
END $$;

-- Create unique constraint to prevent double payouts
-- A transaction can only appear once in paid payout items
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_txn_paid_unique 
ON payout_transactions (transaction_id) 
WHERE is_paid = TRUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_host_id ON payouts(host_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_payout_id ON payout_transactions(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_transaction_id ON payout_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_event_id ON payout_transactions(event_id);

-- Add foreign key constraints (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payouts_host_id' 
        AND table_name = 'payouts'
    ) THEN
        ALTER TABLE payouts 
        ADD CONSTRAINT fk_payouts_host_id 
        FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payout_transactions_payout_id' 
        AND table_name = 'payout_transactions'
    ) THEN
        ALTER TABLE payout_transactions 
        ADD CONSTRAINT fk_payout_transactions_payout_id 
        FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payout_transactions_transaction_id' 
        AND table_name = 'payout_transactions'
    ) THEN
        ALTER TABLE payout_transactions 
        ADD CONSTRAINT fk_payout_transactions_transaction_id 
        FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payout_transactions_event_id' 
        AND table_name = 'payout_transactions'
    ) THEN
        ALTER TABLE payout_transactions 
        ADD CONSTRAINT fk_payout_transactions_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Migrate existing data
-- Update status values to new format (PENDING, PAID, ON_HOLD)
UPDATE payouts SET status = 'PENDING' WHERE status = 'pending';
UPDATE payouts SET status = 'PAID' WHERE status = 'paid';
UPDATE payouts SET status = 'ON_HOLD' WHERE status = 'on_hold';

-- Mark existing payout items as paid if their payout is paid
UPDATE payout_transactions pt
SET is_paid = TRUE
FROM payouts p
WHERE pt.payout_id = p.id AND p.status = 'PAID' AND pt.is_paid = FALSE;

-- Backfill event_id in payout_transactions from payment_transactions
UPDATE payout_transactions pt
SET event_id = payment.event_id
FROM payment_transactions payment
WHERE pt.transaction_id = payment.id AND pt.event_id IS NULL;

-- Backfill gross_amount, platform_fee, net_amount
UPDATE payout_transactions pt
SET 
    gross_amount = COALESCE(pt.gross_amount, payment.amount),
    platform_fee = COALESCE(pt.platform_fee, payment.platform_fee),
    net_amount = COALESCE(pt.net_amount, payment.host_share)
FROM payment_transactions payment
WHERE pt.transaction_id = payment.id 
AND (pt.gross_amount IS NULL OR pt.platform_fee IS NULL OR pt.net_amount IS NULL);

-- Backfill event_count and last_event_date in payouts
UPDATE payouts p
SET 
    event_count = COALESCE(p.event_count, (
        SELECT COUNT(DISTINCT pt.event_id)
        FROM payout_transactions pt
        WHERE pt.payout_id = p.id
    )),
    last_event_date = COALESCE(p.last_event_date, (
        SELECT MAX(e.datetime)
        FROM payout_transactions pt
        JOIN events e ON pt.event_id = e.id
        WHERE pt.payout_id = p.id
    ))
WHERE p.event_count IS NULL OR p.last_event_date IS NULL;

-- Comments for documentation
COMMENT ON TABLE payouts IS 'Host payout batches - represents money owed to hosts';
COMMENT ON TABLE payout_transactions IS 'Individual payment items within a payout batch';
COMMENT ON COLUMN payouts.payout_method IS 'Payment method: UPI or BANK';
COMMENT ON COLUMN payouts.status IS 'Payout status: PENDING, PAID, or ON_HOLD';
COMMENT ON COLUMN payouts.payment_reference IS 'Transaction reference ID when marked as paid';
COMMENT ON COLUMN payouts.paid_by IS 'Admin ID who marked the payout as paid';
COMMENT ON COLUMN payout_transactions.is_paid IS 'Prevents double payment - locked when payout is paid';
COMMENT ON COLUMN payout_transactions.net_amount IS 'Amount paid to host (gross - platform fee)';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON payouts TO admin_panel_user;
-- GRANT SELECT, INSERT, UPDATE ON payout_transactions TO admin_panel_user;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Payout system enhanced with safety features and audit trail';
END $$;
