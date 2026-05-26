import { createR2Storage, hashContent, parseEmailHeaders } from "@rafters/mail-cloudflare";
import { inboxMessage, inboxThread, mailbox } from "@rafters/mail-drizzle";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { uuidv7 } from "uuidv7";

const SYSTEM_MAILBOX_ID = "00000000-0000-0000-0000-000000000001";

function parseRawHeaders(rawText: string): Record<string, string> {
  const headerBlock = rawText.split(/\r?\n\r?\n/, 1)[0] ?? "";
  const headers: Record<string, string> = {};
  for (const line of headerBlock.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    headers[line.slice(0, idx).toLowerCase().trim()] = line.slice(idx + 1).trim();
  }
  return headers;
}

export async function ingestInboundEmail(
  message: ForwardableEmailMessage,
  env: Env,
): Promise<{ status: "stored" | "duplicate" | "parse-failed"; messageId?: string }> {
  const db = drizzle(env.DB);
  const storage = createR2Storage({ bucket: env.rafters_email });

  const rawBuffer = await new Response(message.raw).arrayBuffer();
  const raw = new Uint8Array(rawBuffer);
  const hash = await hashContent(rawBuffer);
  const rawText = new TextDecoder().decode(raw);

  let headers;
  try {
    headers = parseEmailHeaders(parseRawHeaders(rawText));
  } catch (_err) {
    await storage.put(`parse-failed/${hash}/raw.eml`, rawBuffer);
    return { status: "parse-failed" };
  }

  const messageIdHeader = headers.messageId ?? `<no-message-id-${hash}@rafters.studio>`;

  const existing = await db
    .select({ id: inboxMessage.id })
    .from(inboxMessage)
    .where(eq(inboxMessage.messageId, messageIdHeader))
    .get();
  if (existing) {
    return { status: "duplicate", messageId: existing.id };
  }

  const targetMailbox = await db
    .select({ id: mailbox.id })
    .from(mailbox)
    .where(eq(mailbox.id, SYSTEM_MAILBOX_ID))
    .get();
  if (!targetMailbox) {
    throw new Error(
      `system mailbox ${SYSTEM_MAILBOX_ID} missing -- migration 0003_mail_inbox not applied`,
    );
  }

  const blobKeyRaw = `messages/${hash}/raw.eml`;
  await storage.put(blobKeyRaw, rawBuffer);

  const subject = headers.subject || "(no subject)";
  const fromEmail = headers.from || message.from;
  const toEmail = headers.to || message.to;
  const referencesHeader = headers.references.length > 0 ? headers.references.join(" ") : null;

  const threadId = uuidv7();
  await db.insert(inboxThread).values({
    id: threadId,
    mailboxId: SYSTEM_MAILBOX_ID,
    subject,
  });

  const newMessageId = uuidv7();
  await db.insert(inboxMessage).values({
    id: newMessageId,
    mailboxId: SYSTEM_MAILBOX_ID,
    threadId,
    messageId: messageIdHeader,
    inReplyTo: headers.inReplyTo,
    references: referencesHeader,
    fromEmail,
    toEmail,
    subject,
    blobKeyRaw,
    sizeBytes: raw.byteLength,
    sentAt: headers.date ?? new Date(),
  });

  return { status: "stored", messageId: newMessageId };
}
