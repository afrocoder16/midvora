type FlashMessageProps = {
  error?: string;
  success?: string;
};

export function FlashMessage({ error, success }: FlashMessageProps) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
          : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
      }
    >
      {error || success}
    </div>
  );
}
