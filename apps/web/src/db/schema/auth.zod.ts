import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  account,
  invitation,
  member,
  organization,
  passkey,
  session,
  team,
  teamMember,
  user,
  verification,
} from "./auth";

export const insertUserSchema = createInsertSchema(user);
export const selectUserSchema = createSelectSchema(user);

export const insertSessionSchema = createInsertSchema(session);
export const selectSessionSchema = createSelectSchema(session);

export const insertAccountSchema = createInsertSchema(account);
export const selectAccountSchema = createSelectSchema(account);

export const insertVerificationSchema = createInsertSchema(verification);
export const selectVerificationSchema = createSelectSchema(verification);

export const insertPasskeySchema = createInsertSchema(passkey);
export const selectPasskeySchema = createSelectSchema(passkey);

export const insertOrganizationSchema = createInsertSchema(organization);
export const selectOrganizationSchema = createSelectSchema(organization);

export const insertMemberSchema = createInsertSchema(member);
export const selectMemberSchema = createSelectSchema(member);

export const insertInvitationSchema = createInsertSchema(invitation);
export const selectInvitationSchema = createSelectSchema(invitation);

export const insertTeamSchema = createInsertSchema(team);
export const selectTeamSchema = createSelectSchema(team);

export const insertTeamMemberSchema = createInsertSchema(teamMember);
export const selectTeamMemberSchema = createSelectSchema(teamMember);

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional(),
});

export const createInvitationSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]).optional(),
  expiresAt: z.date(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  organizationId: z.string(),
});

export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;
export type Team = typeof team.$inferSelect;
export type Invitation = typeof invitation.$inferSelect;
export type Passkey = typeof passkey.$inferSelect;
