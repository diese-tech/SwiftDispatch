import jwt from "jsonwebtoken";

type QuoteApprovalPayload = {
  quoteId: string;
};

function getSecret(): string {
  const secret = (process.env.QUOTE_TOKEN_SECRET ?? process.env.TECH_TOKEN_SECRET)?.trim();
  if (!secret) throw new Error("QUOTE_TOKEN_SECRET is not set");
  return secret;
}

export function generateQuoteApprovalToken(quoteId: string): string {
  return jwt.sign({ quoteId }, getSecret(), { expiresIn: "7d" });
}

export function verifyQuoteApprovalToken(token: string): QuoteApprovalPayload {
  return jwt.verify(token, getSecret()) as QuoteApprovalPayload;
}

export function decodeQuoteApprovalToken(token: string): QuoteApprovalPayload | null {
  const decoded = jwt.decode(token);
  if (decoded && typeof decoded === "object" && "quoteId" in decoded) {
    return decoded as QuoteApprovalPayload;
  }
  return null;
}
