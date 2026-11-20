import {database} from '../db/raw';
import type {FinancialProfile} from './profile';
export async function saveProfile(owner:string,data:FinancialProfile){const db=database(),updated_at=new Date().toISOString();await db.batch([
 db.prepare('INSERT INTO profile_revisions (id,owner,data,created_at) SELECT ?,owner,data,? FROM profiles WHERE owner = ?').bind(crypto.randomUUID(),updated_at,owner),
 db.prepare('INSERT INTO profiles (owner,data,updated_at) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(owner,JSON.stringify(data),updated_at),
 db.prepare('DELETE FROM profile_revisions WHERE owner = ? AND id NOT IN (SELECT id FROM profile_revisions WHERE owner = ? ORDER BY created_at DESC,rowid DESC LIMIT 10)').bind(owner,owner)
 ]);return updated_at;}
