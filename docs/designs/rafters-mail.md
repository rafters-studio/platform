# @rafters/mail -- Email Inbox Framework for the Edge

Design document for extracting the ezmode.games email system into a set of open-source packages under the @rafters scope.

**Status:** Draft
**Author:** Sean Silvius
**Date:** 2026-03-20

---

## Context

There is no open-source email inbox framework for edge/serverless runtimes. The closest precedent is Rails ActionMailbox, which only covers inbound email ingestion -- roughly 15% of the feature surface needed for a production inbox. ActionMailbox does not handle outbound sending, threading, classification, folder/label management, team collaboration, or blob storage for raw email content.

Chatwoot, the most prominent open-source customer communication platform, has an open GitHub issue requesting Cloudflare Email Workers support. They cannot add it because their architecture assumes a traditional server runtime.

The gap is clear: teams building on Cloudflare Workers, Deno Deploy, Vercel Edge, or any other edge runtime have no framework for email. They either build it from scratch (as we did at ezmode.games) or bolt on a third-party SaaS inbox that owns their data.

**Positioning:** ActionMailbox for the edge. Inbound ingestion, outbound sending, threading, classification, folder/label management, team collaboration, and blob storage -- all designed for SQLite-based edge databases (D1, Turso, libSQL) with blob storage (R2, S3).

---

## Package Architecture

Six packages. The core has zero vendor dependencies. Every external concern is an adapter that can be swapped.

### 1. `@rafters/mail` -- Core

Zero vendor dependencies. Defines the schema, types, service interfaces, and threading logic.

**Drizzle schema (10 tables):**

| Table                 | Purpose                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `mailbox`             | Email addresses that can send/receive. Personal (one owner) or shared (team).                                                                  |
| `inbox_folder`        | System folders (inbox, sent, drafts, spam, trash, archive) + custom folders. Per-mailbox.                                                      |
| `inbox_label`         | System, AI-generated, and user-created labels. Per-mailbox. Many-to-many on messages and threads.                                              |
| `inbox_thread`        | Conversation grouping. Subject, snippet, participants, folder, status (open/pending/resolved/closed), priority.                                |
| `inbox_message`       | Individual email messages. RFC 5322 headers (Message-ID, In-Reply-To, References), envelope data, AI classification fields, blob storage keys. |
| `inbox_message_label` | Many-to-many: message <-> label. Tracks who/what applied the label.                                                                            |
| `inbox_thread_label`  | Many-to-many: thread <-> label. For thread-level filtering.                                                                                    |
| `inbox_attachment`    | Attachment metadata. Content stored in blob storage. Supports inline (Content-ID) and regular attachments.                                     |
| `thread_assignment`   | Thread-level assignment for shared mailbox collaboration. Status: active/completed/reassigned.                                                 |
| `thread_note`         | Internal notes on threads. Markdown content. Not visible to external parties.                                                                  |

**Schema design decisions from the existing codebase:**

- `mailbox.ownerId` and `mailbox.organizationId` are plain `text` columns. In the ezmode codebase they have foreign key references to `user` and `organization` tables. In the extracted package, these become plain text columns with no FK constraints. The auth adapter resolves user/organization identity at runtime.
- `inbox_message_label.appliedBy`, `inbox_thread_label.appliedBy`, `thread_assignment.assigneeId`, `thread_assignment.assignedBy`, and `thread_note.authorId` are all plain text columns referencing user IDs. No FK to external auth tables.
- All IDs use UUIDv7 via `$defaultFn`.
- All timestamps use `integer` with `mode: 'timestamp_ms'` and `unixepoch('subsecond') * 1000` defaults. This is the D1/SQLite pattern.
- Soft delete via `deletedAt` on all tables.
- JSON columns (`participants`, `ccEmails`, `bccEmails`) use SQLite text with `mode: 'json'`.

**Zod schemas (source of truth for all types):**

Every table gets a corresponding Zod schema. Types are inferred from schemas, never written first. The package exports:

- Insert schemas (for creating records)
- Select schemas (for reading records)
- Update schemas (for partial updates)
- Enum schemas: `mailboxTypeSchema` (personal/shared), `threadStatusSchema` (open/pending/resolved/closed), `threadPrioritySchema` (low/normal/high/urgent), `aiCategorySchema` (support/feedback/abuse/partnership/spam/billing/legal/other), `systemFolderSchema` (inbox/sent/drafts/spam/trash/archive)

**Service interfaces:**

```typescript
// Inbox email operations (outbound from inbox)
interface InboxEmailService {
  replyToThread(params: ReplyToThreadParams): Promise<{ messageId: string }>;
  composeEmail(params: ComposeEmailParams): Promise<{ threadId: string; messageId: string }>;
}

// Thread management
interface ThreadService {
  getThread(threadId: string): Promise<Thread>;
  listThreads(mailboxId: string, folderId?: string): Promise<Thread[]>;
  moveToFolder(threadId: string, folderId: string): Promise<void>;
  updateStatus(threadId: string, status: ThreadStatus): Promise<void>;
  updatePriority(threadId: string, priority: ThreadPriority): Promise<void>;
  archive(threadId: string): Promise<void>;
  trash(threadId: string): Promise<void>;
}

// Folder operations
interface FolderService {
  createFolder(mailboxId: string, name: string): Promise<Folder>;
  listFolders(mailboxId: string): Promise<Folder[]>;
  deleteFolder(folderId: string): Promise<void>;
  initSystemFolders(mailboxId: string): Promise<void>;
}

// Label operations
interface LabelService {
  createLabel(mailboxId: string, name: string): Promise<Label>;
  listLabels(mailboxId: string): Promise<Label[]>;
  applyToMessage(messageId: string, labelId: string, appliedBy?: string): Promise<void>;
  applyToThread(threadId: string, labelId: string, appliedBy?: string): Promise<void>;
  removeFromMessage(messageId: string, labelId: string): Promise<void>;
  removeFromThread(threadId: string, labelId: string): Promise<void>;
}

// Assignment operations (shared mailboxes)
interface AssignmentService {
  assign(threadId: string, assigneeId: string, assignedBy?: string): Promise<void>;
  reassign(threadId: string, newAssigneeId: string, assignedBy?: string): Promise<void>;
  complete(threadId: string): Promise<void>;
  getActiveAssignment(threadId: string): Promise<Assignment | null>;
}

// Note operations (internal thread notes)
interface NoteService {
  addNote(threadId: string, authorId: string, content: string): Promise<Note>;
  listNotes(threadId: string): Promise<Note[]>;
  deleteNote(noteId: string): Promise<void>;
}
```

**Threading logic:**

Extracted from `inbox-email.service.ts`. RFC 5322 compliant:

- `generateMessageId()`: `<uuidv7@domain>` format
- `buildReferences(existingReferences, inReplyTo)`: appends In-Reply-To to References chain
- Thread matching on inbound: look up existing thread by In-Reply-To or References headers
- Snippet generation: first 200 characters of plain text body

**Migration SQL export:**

The package exports raw SQL strings for each table creation statement. Apps copy these into their own wrangler migration files. The package never runs migrations itself.

```typescript
// Usage in app:
// 1. wrangler d1 migrations create add-mail-tables
// 2. Copy SQL from @rafters/mail into the generated file
import { migrationSQL } from "@rafters/mail/migrations";
console.log(migrationSQL); // Paste into wrangler migration file
```

**Auth adapter interface:**

Defined as Zod schemas. The package does not depend on any auth library.

```typescript
const inboxUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

const inboxRoleSchema = z.enum(["owner", "admin", "agent", "viewer"]);

interface AuthAdapter {
  getCurrentUser(): Promise<InboxUser>;
  getUserById(id: string): Promise<InboxUser | null>;
  hasMailboxAccess(userId: string, mailboxId: string): Promise<boolean>;
  getUserRole(userId: string, mailboxId: string): Promise<InboxRole | null>;
}
```

### 2. `@rafters/mail-resend` -- Outbound Adapter

Wraps the Resend API using `fetch` directly. No Resend SDK dependency.

**What it contains (extracted from `resend.service.ts` and `resend.provider.ts`):**

- `ResendService` class: low-level Resend API wrapper with Zod-validated requests and responses
- `ResendProvider` class: implements the `EmailProvider` interface from core, translating platform vocabulary (MailingList, Subscriber, Campaign) to Resend vocabulary (Audience, Contact, Broadcast)
- `MockEmailProvider` class: in-memory mock for testing (extracted from `mock.provider.ts`)
- All Resend API type schemas (extracted from `resend.types.ts`): `resendAudienceSchema`, `resendContactSchema`, `resendBroadcastSchema`, `resendBroadcastDetailSchema`, `sendTransactionalRequestSchema`, etc.

**EmailProvider interface (the outbound adapter contract):**

```typescript
interface EmailProvider {
  // Mailing lists
  createMailingList(name: string): Promise<MailingList>;
  getMailingList(id: string): Promise<MailingList>;
  deleteMailingList(id: string): Promise<void>;

  // Subscribers
  addSubscriber(listId: string, email: string, data?: SubscriberData): Promise<Subscriber>;
  removeSubscriber(listId: string, subscriberId: string): Promise<void>;
  updateSubscriber(subscriberId: string, updates: SubscriberUpdates): Promise<Subscriber>;
  listSubscribers(listId: string): Promise<Subscriber[]>;

  // Campaigns (one-shot and two-step draft flow)
  sendCampaign(params: CampaignParams): Promise<{ id: string }>;
  getCampaign(id: string): Promise<{ id: string; subject: string; sentAt: Date }>;
  createCampaignDraft(params: CampaignParams): Promise<{ id: string }>;
  sendCampaignDraft(campaignId: string): Promise<{ id: string }>;
  getCampaignStatus(campaignId: string): Promise<CampaignStatus>;

  // Audiences (for UI listing)
  listAudiences(): Promise<Audience[]>;

  // Transactional emails
  sendEmail(params: EmailParams): Promise<{ id: string }>;
}
```

**Domain vocabulary mapping:**

| @rafters/mail term | Resend term |
| ------------------ | ----------- |
| MailingList        | Audience    |
| Subscriber         | Contact     |
| Campaign           | Broadcast   |

The provider translates at the boundary. Internal code uses the platform vocabulary.

**Error handling:**

- `ResendError` class with `statusCode` and `resendMessage` fields
- Rate limit detection (HTTP 429) with `Retry-After` header parsing
- Zod validation on all inputs before sending to API
- Zod validation on all API responses

**Configuration:**

```typescript
// ResendService takes a generic env object, not Cloudflare.Env
interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  baseUrl?: string; // Defaults to https://api.resend.com
}
```

### 3. `@rafters/mail-cloudflare` -- Inbound Adapter

Cloudflare Email Routing worker for receiving inbound email.

**What it contains:**

- Email Routing worker handler: receives `EmailMessage` from Cloudflare, parses headers, stores in R2 + D1
- R2 storage adapter: implements `BlobStorage` interface for raw email (.eml), parsed HTML, parsed plain text
- RFC 5322 email parsing: extracts From, To, CC, Subject, Message-ID, In-Reply-To, References, Date
- Thread matching: looks up existing thread by In-Reply-To/References headers, creates new thread if none found
- Queue dispatch: sends message to classification queue after storage

**R2 key format (from existing code):**

```
emails/{year}/{month}/{sha256-first-16-chars}.{eml|html|txt}
```

**BlobStorage interface:**

```typescript
interface BlobStorage {
  putRaw(
    key: string,
    content: string | ArrayBuffer,
    metadata?: Record<string, string>,
  ): Promise<void>;
  putText(key: string, content: string): Promise<void>;
  putHtml(key: string, content: string): Promise<void>;
  get(
    key: string,
    options?: { range?: { offset: number; length: number } },
  ): Promise<BlobObject | null>;
  generateKey(contentHash: string, extension: "eml" | "html" | "txt"): string;
}
```

### 4. `@rafters/mail-react-email` -- Renderer Adapter

React Email templates with a renderer interface. Templates are branded via props, not hardcoded.

**What it contains (extracted from `templates/base.tsx` and `templates/otp.tsx`):**

- `BaseEmail` component: header with configurable logo, content area, footer with configurable links, optional unsubscribe link (uses Resend `{{{RESEND_UNSUBSCRIBE_URL}}}` placeholder)
- `OtpEmail` component: verification code display with configurable expiry
- `WelcomeEmail` component: new (not in current codebase, but listed for extraction)
- Renderer interface implementation

**BaseEmail props (configurable, not hardcoded):**

```typescript
interface BaseEmailProps {
  preview: string;
  children: ReactNode;
  includeUnsubscribe?: boolean;
  logoUrl?: string; // No default -- must be provided by app
  websiteUrl?: string; // No default -- must be provided by app
  brandName?: string; // No default -- must be provided by app
  copyrightHolder?: string;
}
```

The existing code hardcodes `ezmode.games` URLs and branding. The extracted version makes all of these required or configurable props with no defaults that reference ezmode.

**TemplateRenderer interface:**

```typescript
interface TemplateRenderer {
  render(
    template: string,
    props: Record<string, unknown>,
  ): Promise<{ html: string; text?: string }>;
}
```

### 5. `@rafters/mail-workers-ai` -- Classifier Adapter

AI-powered email classification using Cloudflare Workers AI.

**What it contains (extracted from `classifier.ts`, `classify-email.ts`, `email-classify.ts`):**

- `classifyEmail()` function: zero-shot classification using `@cf/microsoft/deberta-v3-base-zeroshot-v1.1-all-33`
- 8 categories: `support`, `feedback`, `abuse`, `partnership`, `spam`, `billing`, `legal`, `other`
- Priority determination from keyword matching + category rules:
  - `abuse` and `legal` always `high`
  - Urgent keywords (`urgent`, `emergency`, `asap`, `immediately`, `critical`, `broken`, `down`, `outage`) -> `urgent`
  - High keywords (`important`, `priority`, `help`, `issue`, `problem`, `error`, `bug`, `crash`) -> `high`
  - `support` and `billing` default to `normal`
  - `feedback` and `partnership` default to `normal`
  - Everything else defaults to `low`
- Auto-tagging via regex patterns:

  | Pattern                               | Tag               |
  | ------------------------------------- | ----------------- |
  | `install\|setup\|download`            | `installation`    |
  | `crash\|error\|bug\|broken`           | `bug-report`      |
  | `feature\|request\|suggest`           | `feature-request` |
  | `account\|login\|password\|auth`      | `account`         |
  | `payment\|billing\|subscribe\|refund` | `billing`         |
  | `mod\|nexus\|vortex\|mo2`             | `modding`         |
  | `creator\|upload\|publish`            | `creator`         |
  | `dmca\|copyright\|takedown`           | `legal`           |

  The `modding` and `creator` patterns are ezmode-specific. The extracted package should ship a default set and allow apps to add custom patterns.

- `ClassifyEmailWorkflow`: Cloudflare Workflow implementation (durable, step-based)
  1. Fetch email content from blob storage (first 4KB)
  2. Classify with Workers AI
  3. Update message in D1 with category, confidence, spam score
  4. Update R2 metadata with classification
  5. Move spam to spam folder
  6. Apply AI-generated labels (find-or-create)

- Queue consumer: `handleEmailClassifyQueue()` -- same logic as workflow but driven by Queue messages with ack/retry semantics

**EmailClassifier interface:**

```typescript
interface EmailClassification {
  category: EmailCategory;
  confidence: number; // 0-100
  tags: string[];
  priority: EmailPriority;
}

interface EmailClassifier {
  classify(from: string, subject: string, body: string): Promise<EmailClassification>;
}

// Legitimate vs filtered category check
function isLegitimateCategory(category: EmailCategory): boolean;
```

**Configuration:**

```typescript
interface ClassifierConfig {
  // Custom tag patterns (merged with defaults)
  tagPatterns?: Array<{ pattern: RegExp; tag: string }>;
  // Custom priority keywords (merged with defaults)
  urgentKeywords?: string[];
  highPriorityKeywords?: string[];
  // Override classification labels (defaults to the 8 standard categories)
  classificationLabels?: string[];
  // Max input length for classification (defaults to 4000 chars)
  maxInputLength?: number;
}
```

### 6. `@rafters/better-auth-resend` -- better-auth Glue

Wires `@rafters/mail-resend` and `@rafters/mail-react-email` into better-auth's `emailOTP` plugin.

**What it provides:**

```typescript
import { resendOTP } from "@rafters/better-auth-resend";

// In better-auth config:
emailOTP({
  sendVerificationOTP: resendOTP(env),
});
```

Under the hood, `resendOTP` creates a `ResendService` instance, renders the OTP template with `@rafters/mail-react-email`, and sends via the Resend transactional API.

This package depends on `@rafters/mail-resend` and `@rafters/mail-react-email`. It is the only package that has an opinion about auth (better-auth specifically).

---

## Adapter Interfaces

All adapter interfaces are defined as Zod schemas in `@rafters/mail`. Types are inferred from these schemas. Adapter packages implement the interfaces.

### InboundAdapter

Receives email from an external source and stores it in the inbox.

```typescript
const inboundEmailSchema = z.object({
  raw: z.instanceof(ArrayBuffer),
  from: z.string().email(),
  to: z.string().email(),
  headers: z.record(z.string()),
});

interface InboundAdapter {
  handleIncoming(email: InboundEmail): Promise<{ messageId: string; threadId: string }>;
}
```

**Implementations:** `@rafters/mail-cloudflare` (Cloudflare Email Routing)

### OutboundAdapter (EmailProvider)

Sends email via an external provider. Defined in `provider.schema.ts` as Zod schemas.

```typescript
const emailParamsSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  from: z.string().email().optional(),
  replyTo: z.string().email().optional(),
});

interface EmailProvider {
  sendEmail(params: EmailParams): Promise<{ id: string }>;
  // + mailing list, subscriber, campaign methods
}
```

**Implementations:** `@rafters/mail-resend` (Resend API)

### TemplateRenderer

Renders email templates to HTML/text.

```typescript
interface TemplateRenderer {
  render(
    template: string,
    props: Record<string, unknown>,
  ): Promise<{ html: string; text?: string }>;
}
```

**Implementations:** `@rafters/mail-react-email` (React Email)

### EmailClassifier

Classifies email content into categories with confidence scores.

```typescript
const emailClassificationSchema = z.object({
  category: z.enum([
    "support",
    "feedback",
    "abuse",
    "partnership",
    "spam",
    "billing",
    "legal",
    "other",
  ]),
  confidence: z.number().min(0).max(100),
  tags: z.array(z.string()),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

interface EmailClassifier {
  classify(from: string, subject: string, body: string): Promise<EmailClassification>;
}
```

**Implementations:** `@rafters/mail-workers-ai` (Workers AI DeBERTa-v3)

### BlobStorage

Stores and retrieves raw email content and parsed bodies.

```typescript
interface BlobObject {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

interface BlobStorage {
  put(key: string, content: string | ArrayBuffer, options?: BlobPutOptions): Promise<void>;
  get(key: string, options?: BlobGetOptions): Promise<BlobObject | null>;
  delete(key: string): Promise<void>;
  generateKey(contentHash: string, extension: string): string;
}
```

**Implementations:** `@rafters/mail-cloudflare` (R2). Community could add S3, GCS, etc.

### AuthAdapter

Resolves user identity and access control. The core package defines the interface; the app provides the implementation.

```typescript
const inboxUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

const inboxRoleSchema = z.enum(["owner", "admin", "agent", "viewer"]);

interface AuthAdapter {
  getCurrentUser(): Promise<InboxUser>;
  getUserById(id: string): Promise<InboxUser | null>;
  hasMailboxAccess(userId: string, mailboxId: string): Promise<boolean>;
  getUserRole(userId: string, mailboxId: string): Promise<InboxRole | null>;
}
```

**Implementations:** App-specific. No default implementation shipped. `@rafters/better-auth-resend` is glue for the OTP flow only, not a full auth adapter.

---

## Design Principles

1. **Zod is source of truth for all types.** Types are inferred via `z.infer<>`, never written as TypeScript interfaces first. This enables runtime validation at system boundaries and mock generation with Zocker.

2. **Zero vendor lock-in in core.** `@rafters/mail` has no dependency on Resend, Cloudflare, React Email, or Workers AI. Every external concern is an adapter in a separate package.

3. **Drizzle for schema and query building. Wrangler owns migrations.** The package exports Drizzle table definitions for type-safe queries and raw SQL for migrations. It never runs `drizzle-kit push` or `drizzle-kit migrate`. Apps copy migration SQL into wrangler-managed migration files.

4. **Schema references user_id as plain text, no FK to external auth tables.** The `ownerId`, `assigneeId`, `assignedBy`, `authorId`, and `appliedBy` columns are all `text` with no foreign key constraints. The auth adapter resolves identity at runtime. This means the mail schema can be used with any auth system.

5. **We ship what we use.** The initial adapter packages cover Cloudflare Workers + Resend + React Email + Workers AI because that is what runs in production at ezmode.games. Community contributors can add adapters for Postmark, Mailgun, SendGrid, AWS SES, Deno KV, etc.

6. **No emoji in code or docs.**

7. **Platform vocabulary over vendor vocabulary.** The codebase uses MailingList (not "audience"), Subscriber (not "contact"), Campaign (not "broadcast"). Vendor terms only appear inside adapter implementations.

---

## Email Schema Design

### Inbound Flow

1. Cloudflare Email Routing delivers email to the worker
2. Worker parses RFC 5322 headers
3. Raw `.eml` stored in blob storage (R2)
4. Parsed HTML and plain text stored separately in blob storage
5. Metadata row inserted into `inbox_message` (D1) with blob storage keys
6. Thread matching: look up existing thread by In-Reply-To/References headers. Create new thread if none found.
7. Classification dispatched to queue or workflow

The raw email is the source of truth. D1 stores parsed metadata for fast queries. If metadata is ever wrong, it can be re-derived from the raw email in blob storage.

### Threading

RFC 5322 References/In-Reply-To headers, Gmail-style:

- Inbound: match `In-Reply-To` against existing `inbox_message.messageId`. If no match, check `References` header. If no match, create new thread.
- Outbound: generate `<uuidv7@domain>` Message-ID, set `In-Reply-To` to the latest message in the thread, append to `References` chain.
- Thread subject is from the first message. Thread snippet is from the latest message.
- Thread `participants` is a JSON array of all email addresses that have participated.

### Folders

System folders (cannot be renamed or deleted):

| Slug      | Purpose                                  |
| --------- | ---------------------------------------- |
| `inbox`   | Default landing folder for inbound email |
| `sent`    | Outbound emails                          |
| `drafts`  | Unsent drafts                            |
| `spam`    | AI-classified or manually flagged spam   |
| `trash`   | Soft-deleted (auto-purge after 30 days)  |
| `archive` | Archived conversations                   |

Custom folders can be created per-mailbox for additional organization.

Folders are per-mailbox. Each mailbox has its own set of system + custom folders.

### Labels

Three types:

- **System labels**: `important`, `starred`, `unread`. Cannot be renamed or deleted.
- **AI-generated labels**: Created by the classifier. `isAiGenerated = true`. Based on regex tag patterns (e.g., `bug-report`, `feature-request`, `billing`, `account`).
- **User-created labels**: Custom tags created by staff.

Labels are many-to-many on both messages (`inbox_message_label`) and threads (`inbox_thread_label`). The junction tables track who applied the label and when (null `appliedBy` means system/AI).

### Assignments

Thread-level, for shared mailbox team collaboration:

- A thread can have one active assignment at a time
- Assignments track who assigned it, status (active/completed/reassigned), and optional notes
- When an agent replies to a thread, the thread status changes from `open` to `pending` (awaiting customer response)
- Assignment history is preserved via soft delete for audit trail

### Notes

Internal thread notes, not visible to external parties:

- Markdown content
- Author tracked by user ID
- Used for team collaboration on shared mailbox threads
- Soft delete for audit trail

### Outbound Newsletter Schema

Separate from the inbox schema. Covers audience management and broadcast auditing:

| Table                 | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `platform_audience`   | Platform-wide mailing lists (e.g., "Newsletter", "Creator News")          |
| `platform_subscriber` | User subscriptions to platform audiences                                  |
| `broadcast_audit`     | Compliance trail: who sent what, when, to which audience, recipient count |

Design principle: the email provider (Resend) is source of truth for subscriber data. We only store:

- Which audiences exist (registry)
- Which users are subscribed to which audiences (mapping)
- Provider identifiers for sync (`providerListId`, `providerSubscriberId`)
- Minimal audit trail for compliance

We do NOT store subscriber email addresses, unsubscribe status, or campaign content. The provider has all of that.

---

## What Gets Extracted vs What Stays App-Specific

### Extracted into @rafters/mail packages

- All 10 inbox tables (mailbox through thread_note)
- Platform audience tables (platform_audience, platform_subscriber, broadcast_audit)
- All Zod schemas and inferred types
- EmailProvider interface and ResendProvider implementation
- ResendService (fetch-based API wrapper)
- MockEmailProvider (in-memory mock for testing)
- All Resend API type schemas (resend.types.ts)
- InboxEmailService (reply-to-thread, compose-email)
- Threading logic (Message-ID generation, References building)
- Email classifier (classifyEmail function, priority determination, tag extraction)
- ClassifyEmailWorkflow (Cloudflare Workflow)
- Queue consumer (handleEmailClassifyQueue)
- BaseEmail template (with configurable branding)
- OTP template
- R2 storage key generation
- Raw email RFC822 generation for outbound storage

### NOT extracted (stays in ezmode.games)

- `modAudience` and `modAudienceSubscriber` tables -- these reference the `mod` table which is domain-specific to ezmode.games
- App-specific tag patterns: `mod|nexus|vortex|mo2` -> `modding` and `creator|upload|publish` -> `creator`
- App-specific environment bindings (e.g., `env.EZMODE_EMAIL` for the R2 bucket name)
- App-specific templates beyond base/OTP (welcome emails with ezmode branding, etc.)
- `EMAIL_DOMAIN` constant (`ezmode.games`) -- becomes configurable
- Hardcoded branding in BaseEmail (`ezmode.games` URLs, logo, copyright)

---

## Open Questions for Team

1. **Should the newsletter/audience schema be in core or a separate package?** The inbox schema and the newsletter schema serve different purposes (receiving/managing mail vs sending broadcasts). They could be `@rafters/mail` and `@rafters/mail-broadcast` respectively. Counter-argument: they share the same EmailProvider adapter and keeping them together reduces coordination.

2. **How do we handle the R2 storage adapter for non-Cloudflare runtimes?** The current code uses R2 directly. The `BlobStorage` interface abstracts this, but we need to decide whether `@rafters/mail-cloudflare` is the only place blob storage lives or if we need a separate `@rafters/mail-s3` package. For now, shipping only R2 and letting community add others seems right.

3. **Should the classifier ship default tag patterns or require apps to configure all of them?** The current patterns include domain-specific ones (`mod|nexus|vortex|mo2`). Options: (a) ship a generic default set and let apps extend, (b) ship no defaults and require configuration, (c) ship the generic ones and document that apps should add domain-specific patterns. Leaning toward (a).

4. **Should the mock provider live in `@rafters/mail-resend` or in a separate `@rafters/mail-test-utils` package?** The mock is useful for testing any app that uses the EmailProvider interface, not just Resend users. But shipping it in the resend package keeps things simple. If we add more provider adapters later, the mock should probably move.

5. **How much of the ClassifyEmailWorkflow is extractable?** The workflow references `this.env.AI` and `this.env.EZMODE_EMAIL` which are Cloudflare-specific bindings. The step structure (fetch -> classify -> update D1 -> update R2 -> move spam -> apply labels) is generic. We could extract a `createClassificationWorkflow(config)` factory that takes bindings as parameters, or we could ship the workflow class with generic env types and let apps configure bindings.

6. **Should `@rafters/mail` export a `createMailService(db, blobStorage, emailProvider)` factory that wires everything together?** The current code has separate service creation functions. A single factory would be more ergonomic for apps but less flexible. Both patterns could coexist.

7. **Do we need a `@rafters/mail-ui` package for inbox React components?** The existing codebase does not have inbox UI components extracted yet, but they exist in the ezmode frontend. This is a future consideration and out of scope for the initial extraction.

8. **What is the migration story for apps upgrading @rafters/mail?** When we add columns or tables in a new version, apps need to generate new wrangler migrations. Should the package export migration diffs between versions, or just the full schema and let apps diff manually?

9. **Should the `EmailProvider` interface include the mailing list/subscriber/campaign methods, or should those be a separate `BroadcastProvider` interface?** The current interface combines transactional email sending with audience management. These are different concerns. An app that only needs transactional email (OTP, notifications) should not need to implement campaign methods. Splitting would add another interface but improve single-responsibility.

10. **Should we publish the Cloudflare Workflow and Queue consumer as separate entrypoints from `@rafters/mail-workers-ai`, or as configuration helpers?** Apps need to register these in their `wrangler.jsonc`. The question is whether the package exports the class directly (app extends or uses it) or exports a factory function that returns the handler.
