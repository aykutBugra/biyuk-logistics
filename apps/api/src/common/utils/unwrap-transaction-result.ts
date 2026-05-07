type TransactionSuccess = {
  ok: true;
};

type TransactionFailure<Reason extends string> = {
  ok: false;
  reason: Reason;
};

export function unwrapTransactionResult<
  Success extends TransactionSuccess,
  Reason extends string,
>(
  result: Success | TransactionFailure<Reason>,
  toError: (reason: Reason) => Error
): Success {
  if (!result.ok) {
    throw toError(result.reason);
  }

  return result;
}
