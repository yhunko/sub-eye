const PADDLE_TRANSACTION_ID_REGEX = /^txn_[a-z0-9]+$/;

export const parsePaddleTransactionId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const transactionId = value.trim();

  if (!transactionId || !PADDLE_TRANSACTION_ID_REGEX.test(transactionId)) {
    return null;
  }

  return transactionId;
};
