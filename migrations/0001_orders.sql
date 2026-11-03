CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    checkout_key TEXT NOT NULL UNIQUE,
    request_hash TEXT NOT NULL,
    customer_json TEXT NOT NULL,
    items_json TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    shipping_fee INTEGER CHECK (shipping_fee >= 0),
    total INTEGER CHECK (total >= 0),
    ip_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent')),
    email_sent_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_pending_email ON orders(email_status, created_at);
CREATE INDEX IF NOT EXISTS orders_rate_limit ON orders(ip_hash, created_at);
CREATE TRIGGER IF NOT EXISTS orders_rate_limit_insert
BEFORE INSERT ON orders
WHEN NOT EXISTS (SELECT 1 FROM orders WHERE checkout_key = NEW.checkout_key)
AND (SELECT COUNT(*) FROM orders WHERE ip_hash = NEW.ip_hash AND julianday(created_at) >= julianday('now', '-15 minutes')) >= 10
BEGIN
    SELECT RAISE(ABORT, 'order_rate_limited');
END;
