"use client";

import { useState } from "react";

type Props = {
  quoteId: string;
  initialStatus: string;
};

export default function AcceptQuoteButton({ quoteId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function acceptQuote() {
    setLoading(true);
    const response = await fetch(`/api/quotes/${quoteId}/accept`, {
      method: "PATCH",
    });
    setLoading(false);

    if (response.ok) {
      setStatus("accepted");
    }
  }

  if (status === "accepted") {
    return (
      <p className="mt-5 rounded-md bg-teal-50 px-4 py-3 font-semibold text-teal-800">
        Quote accepted
      </p>
    );
  }

  return (
    <button
      className="mt-5 w-full rounded-md bg-teal-700 px-5 py-4 text-base font-semibold text-white disabled:opacity-60"
      disabled={loading}
      onClick={acceptQuote}
      type="button"
    >
      {loading ? "Accepting..." : "Mark as Accepted"}
    </button>
  );
}
