ALTER TABLE wallet_entries
  MODIFY COLUMN reason ENUM(
    'topup',
    'purchase',
    'earning',
    'withdraw_hold',
    'withdraw_done',
    'withdraw_refund',
    'refund_in',
    'refund_clawback',
    'admin_adjust',
    'platform_fee'
  ) NOT NULL;

INSERT INTO system_settings (
  setting_key,
  setting_value,
  value_type,
  description
)
SELECT
  'platform_admin_account_id',
  CAST(id AS CHAR),
  'number',
  'Tài khoản admin chính nhận phí nền tảng'
FROM accounts
WHERE role IN ('admin', 'super_admin')
  AND status = 'active'
  AND deleted_at IS NULL
ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, id ASC
LIMIT 1
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_purchase_chapter;

CREATE PROCEDURE sp_purchase_chapter(
  IN  p_buyer_id   BIGINT UNSIGNED,
  IN  p_chapter_id BIGINT UNSIGNED,
  OUT p_result     VARCHAR(50),
  OUT p_txn_id     BIGINT UNSIGNED
)
sp: BEGIN
  DECLARE v_book_id BIGINT UNSIGNED;
  DECLARE v_seller_id BIGINT UNSIGNED;
  DECLARE v_platform_admin_id BIGINT UNSIGNED;
  DECLARE v_price DECIMAL(15,2);
  DECLARE v_is_free TINYINT(1);
  DECLARE v_status VARCHAR(20);
  DECLARE v_balance DECIMAL(15,2);
  DECLARE v_seller_bal DECIMAL(15,2);
  DECLARE v_admin_bal DECIMAL(15,2);
  DECLARE v_fee_percent DECIMAL(5,2);
  DECLARE v_fee DECIMAL(15,2);
  DECLARE v_seller_amt DECIMAL(15,2);
  DECLARE v_exists INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_result = 'ERROR';
  END;

  SELECT COALESCE(
    (
      SELECT CAST(setting_value AS DECIMAL(5,2))
      FROM system_settings
      WHERE setting_key = 'platform_fee_percent'
    ),
    5.00
  )
  INTO v_fee_percent;

  START TRANSACTION;

  SELECT COALESCE(
    (
      SELECT account.id
      FROM accounts AS account
      JOIN system_settings AS setting
        ON setting.setting_key = 'platform_admin_account_id'
       AND CAST(setting.setting_value AS UNSIGNED) = account.id
      WHERE account.role IN ('admin', 'super_admin')
        AND account.status = 'active'
        AND account.deleted_at IS NULL
      LIMIT 1
    ),
    (
      SELECT account.id
      FROM accounts AS account
      WHERE account.role IN ('admin', 'super_admin')
        AND account.status = 'active'
        AND account.deleted_at IS NULL
      ORDER BY CASE WHEN account.role = 'super_admin' THEN 0 ELSE 1 END,
               account.id ASC
      LIMIT 1
    )
  )
  INTO v_platform_admin_id;

  IF v_platform_admin_id IS NULL THEN
    ROLLBACK;
    SET p_result = 'PLATFORM_ADMIN_NOT_CONFIGURED';
    LEAVE sp;
  END IF;

  SELECT chapter.book_id, book.owner_id, chapter.price,
         chapter.is_free, chapter.status
    INTO v_book_id, v_seller_id, v_price, v_is_free, v_status
    FROM chapters AS chapter
    JOIN books AS book ON book.id = chapter.book_id
   WHERE chapter.id = p_chapter_id
     AND chapter.deleted_at IS NULL
   FOR UPDATE;

  IF v_book_id IS NULL THEN
    ROLLBACK;
    SET p_result = 'CHAPTER_NOT_FOUND';
    LEAVE sp;
  END IF;

  IF v_status <> 'published' THEN
    ROLLBACK;
    SET p_result = 'CHAPTER_NOT_AVAILABLE';
    LEAVE sp;
  END IF;

  IF v_is_free = 1 THEN
    ROLLBACK;
    SET p_result = 'FREE_CHAPTER';
    LEAVE sp;
  END IF;

  IF p_buyer_id = v_seller_id THEN
    ROLLBACK;
    SET p_result = 'OWNER_CANNOT_BUY';
    LEAVE sp;
  END IF;

  SELECT COUNT(*)
    INTO v_exists
    FROM purchases
   WHERE account_id = p_buyer_id
     AND chapter_id = p_chapter_id
     AND is_revoked = 0;

  IF v_exists > 0 THEN
    ROLLBACK;
    SET p_result = 'ALREADY_PURCHASED';
    LEAVE sp;
  END IF;

  SELECT balance
    INTO v_balance
    FROM wallets
   WHERE account_id = p_buyer_id
   FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_price THEN
    ROLLBACK;
    SET p_result = 'INSUFFICIENT_BALANCE';
    LEAVE sp;
  END IF;

  SET v_fee = ROUND(v_price * v_fee_percent / 100, 2);
  SET v_seller_amt = v_price - v_fee;

  SELECT balance
    INTO v_seller_bal
    FROM wallets
   WHERE account_id = v_seller_id
   FOR UPDATE;

  SELECT balance
    INTO v_admin_bal
    FROM wallets
   WHERE account_id = v_platform_admin_id
   FOR UPDATE;

  IF v_seller_bal IS NULL OR v_admin_bal IS NULL THEN
    ROLLBACK;
    SET p_result = 'PLATFORM_ADMIN_WALLET_NOT_FOUND';
    LEAVE sp;
  END IF;

  INSERT INTO transactions (
    code,
    transaction_type,
    buyer_id,
    seller_id,
    book_id,
    chapter_id,
    amount,
    platform_fee,
    seller_amount,
    fee_percent,
    payment_method,
    status,
    completed_at
  )
  VALUES (
    CONCAT(
      'TXN',
      DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
      LPAD(FLOOR(RAND() * 100000), 5, '0')
    ),
    'purchase',
    p_buyer_id,
    v_seller_id,
    v_book_id,
    p_chapter_id,
    v_price,
    v_fee,
    v_seller_amt,
    v_fee_percent,
    'wallet',
    'success',
    NOW()
  );
  SET p_txn_id = LAST_INSERT_ID();

  UPDATE wallets
     SET balance = balance - v_price,
         total_spent = total_spent + v_price,
         version = version + 1
   WHERE account_id = p_buyer_id;

  INSERT INTO wallet_entries (
    account_id,
    transaction_id,
    direction,
    amount,
    balance_before,
    balance_after,
    reason
  )
  VALUES (
    p_buyer_id,
    p_txn_id,
    'debit',
    v_price,
    v_balance,
    v_balance - v_price,
    'purchase'
  );

  UPDATE wallets
     SET balance = balance + v_seller_amt,
         total_earned = total_earned + v_seller_amt,
         version = version + 1
   WHERE account_id = v_seller_id;

  INSERT INTO wallet_entries (
    account_id,
    transaction_id,
    direction,
    amount,
    balance_before,
    balance_after,
    reason
  )
  VALUES (
    v_seller_id,
    p_txn_id,
    'credit',
    v_seller_amt,
    v_seller_bal,
    v_seller_bal + v_seller_amt,
    'earning'
  );

  UPDATE wallets
     SET balance = balance + v_fee,
         total_earned = total_earned + v_fee,
         version = version + 1
   WHERE account_id = v_platform_admin_id;

  INSERT INTO wallet_entries (
    account_id,
    transaction_id,
    direction,
    amount,
    balance_before,
    balance_after,
    reason,
    note
  )
  VALUES (
    v_platform_admin_id,
    p_txn_id,
    'credit',
    v_fee,
    v_admin_bal,
    v_admin_bal + v_fee,
    'platform_fee',
    'Phí nền tảng từ giao dịch mua chương'
  );

  INSERT INTO purchases (
    account_id,
    book_id,
    chapter_id,
    transaction_id,
    price_paid
  )
  VALUES (
    p_buyer_id,
    v_book_id,
    p_chapter_id,
    p_txn_id,
    v_price
  );

  UPDATE chapters
     SET purchase_count = purchase_count + 1
   WHERE id = p_chapter_id;

  UPDATE books
     SET purchase_count = purchase_count + 1,
         total_revenue = total_revenue + v_seller_amt
   WHERE id = v_book_id;

  COMMIT;
  SET p_result = 'SUCCESS';
END$$

DELIMITER ;
