import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const creditCards=sqliteTable('credit_cards',{id:text('id').notNull(),owner:text('owner').notNull(),data:text('data').notNull()},t=>[uniqueIndex('idx_credit_cards_owner_id').on(t.owner,t.id)]);
export const creditPurchases=sqliteTable('credit_purchases',{id:text('id').notNull(),owner:text('owner').notNull(),data:text('data').notNull()},t=>[uniqueIndex('idx_credit_purchases_owner_id').on(t.owner,t.id)]);
export const profileRevisions=sqliteTable('profile_revisions',{id:text('id').primaryKey(),owner:text('owner').notNull(),data:text('data').notNull(),created_at:text('created_at').notNull()},t=>[index('idx_profile_revisions_owner').on(t.owner,t.created_at)]);
export const fixedExpenses=sqliteTable('fixed_expenses',{id:text('id').notNull(),owner:text('owner').notNull(),data:text('data').notNull()},t=>[uniqueIndex('idx_fixed_owner_id').on(t.owner,t.id)]);
export const movements = sqliteTable('movements', {
 id:text('id').primaryKey(), owner:text('owner').notNull(), description:text('description').notNull(),
 amount:integer('amount').notNull(), kind:text('kind').notNull(), category:text('category').notNull(),
 date:text('date').notNull(), account:text('account').notNull(), source:text('source').notNull(),
}, t=>[index('idx_movements_owner_date').on(t.owner,t.date)]);
export const preferences = sqliteTable('preferences', {owner:text('owner').primaryKey(), data:text('data').notNull()});
export const profiles = sqliteTable('profiles',{owner:text('owner').primaryKey(),data:text('data').notNull(),updated_at:text('updated_at').notNull()});
export const reports = sqliteTable('reports',{id:text('id').primaryKey(),owner:text('owner').notNull(),start:text('start').notNull(),end:text('end').notNull(),type:text('type').notNull(),created_at:text('created_at').notNull(),data:text('data').notNull()},t=>[uniqueIndex('idx_reports_owner_start_type').on(t.owner,t.start,t.type)]);
export const inbox = sqliteTable('inbox',{id:text('id').primaryKey(),owner:text('owner').notNull(),content:text('content').notNull(),sender:text('sender').notNull(),created_at:text('created_at').notNull(),status:text('status').notNull(),fingerprint:text('fingerprint').notNull()},t=>[uniqueIndex('idx_inbox_owner_fingerprint').on(t.owner,t.fingerprint)]);
