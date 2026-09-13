import { ACCOUNTS, DEFAULT_PREFS, KIND_LABEL, amountToMinor, isDebt, isPayable, today, type Entry, type Prefs } from "./ledger";

export class AppError extends Error { constructor(message:string,public status=400){super(message);} }
const fail=(m:string,status=400):never=>{throw new AppError(m,status);};
const clean=(v:unknown,max=200)=>typeof v==="string"?v.trim().slice(0,max):"";
function validDate(v:unknown,optional=false) {const s=clean(v,10);if(optional&&!s)return "";if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+"T12:00:00Z"))||new Date(s+"T12:00:00Z").toISOString().slice(0,10)!==s)fail("সঠিক তারিখ দিন।");return s;}
const publicColumns="id,kind,amount,category,account,to_account,person,parent_id,date,due_date,note,channel,created_at,updated_at,deleted_at,delete_group";
export async function ensurePrefs(db:D1Database,owner:string) {await db.prepare("INSERT OR IGNORE INTO preferences (owner,data) VALUES (?,?)").bind(owner,JSON.stringify(DEFAULT_PREFS)).run();}
export async function readState(db:D1Database,owner:string){await ensurePrefs(db,owner);const result=await db.batch([db.prepare(`SELECT ${publicColumns} FROM entries WHERE owner=? AND deleted_at IS NULL ORDER BY date DESC,created_at DESC`).bind(owner),db.prepare("SELECT data,bin_hash IS NOT NULL AS configured FROM preferences WHERE owner=?").bind(owner)]);const pref=result[1].results[0] as {data:string;configured:number};return {ownerKey:owner,entries:result[0].results,prefs:{...DEFAULT_PREFS,...JSON.parse(pref.data)},binConfigured:!!pref.configured};}
async function getEntry(db:D1Database,owner:string,id:string,deleted=false){const row=await db.prepare(`SELECT * FROM entries WHERE id=? AND owner=? AND deleted_at IS ${deleted?"NOT ":""}NULL`).bind(id,owner).first<Entry>();return row||fail("এন্ট্রিটি পাওয়া যায়নি। হিসাব refresh করুন।",404);}

export async function saveEntry(db:D1Database,owner:string,b:Record<string,unknown>,sync?:SyncMeta){
  const id=clean(b.id,80);if(!/^[a-zA-Z0-9-]{8,80}$/.test(id))fail("এন্ট্রি ID সঠিক নয়।");
  const editing=b.edit===true, prior=editing?await getEntry(db,owner,id):null;
  const kind=clean(b.kind) as Entry["kind"];if(!Object.prototype.hasOwnProperty.call(KIND_LABEL,kind))fail("লেনদেনের ধরন সঠিক নয়।");if(prior&&prior.kind!==kind)fail("সংশোধনের সময় লেনদেনের ধরন বদলানো যাবে না।");
  const amount=amountToMinor(b.amount), date=validDate(b.date);if(date>today())fail("ভবিষ্যতের লেনদেন এখন সেভ করা যাবে না।");
  const account=clean(b.account), toAccount=kind==="transfer"?clean(b.to_account):"";if(!ACCOUNTS.includes(account)||(kind==="transfer"&&(!ACCOUNTS.includes(toAccount)||toAccount===account)))fail("সঠিক অ্যাকাউন্ট বেছে নিন।");
  const dueDate=validDate(b.due_date,true);if(dueDate&&dueDate<date)fail("পরিশোধের তারিখ লেনদেনের তারিখের আগে হতে পারে না।");
  let category=clean(b.category,60),person=clean(b.person,100),parentId:string|null=null;
  if(["income","expense","credit"].includes(kind)){if(!category)fail("ক্যাটাগরি বেছে নিন।");}else category=KIND_LABEL[kind];
  if(["borrow","lend","credit","old_borrow","old_lend"].includes(kind)&&!person)fail("ব্যক্তির নাম দিন।");
  if(["repay","collect"].includes(kind)){
    parentId=clean(b.parent_id,80);const parent=await getEntry(db,owner,parentId);if(!isDebt(parent)||(isPayable(parent)?"repay":"collect")!==kind)fail("ঋণের ধরন মিলছে না।");if(prior&&prior.parent_id!==parentId)fail("পরিশোধের সঙ্গে যুক্ত ব্যক্তি পরিবর্তন করা যাবে না।");person=parent.person;if(date<parent.date)fail("পরিশোধের তারিখ ঋণ নেওয়ার আগে হতে পারে না।");
  }
  const now=new Date(Math.max(Date.now(),prior?Date.parse(prior.updated_at)+1:0)).toISOString(), note=clean(b.note,1000), channel=clean(b.channel,50);
  // The guard is part of the write, so concurrent repayments cannot overpay a loan.
  const paymentGuard="EXISTS (SELECT 1 FROM entries p WHERE p.id=? AND p.owner=? AND p.deleted_at IS NULL AND p.date<=? AND p.amount >= ? + COALESCE((SELECT SUM(c.amount) FROM entries c WHERE c.parent_id=p.id AND c.owner=p.owner AND c.deleted_at IS NULL AND c.id<>?),0))";
  const rootGuard="? >= COALESCE((SELECT SUM(c.amount) FROM entries c WHERE c.parent_id=entries.id AND c.owner=entries.owner AND c.deleted_at IS NULL),0) AND NOT EXISTS (SELECT 1 FROM entries c WHERE c.parent_id=entries.id AND c.owner=entries.owner AND c.deleted_at IS NULL AND c.date<?)";
  if(editing){
    const guard=parentId?paymentGuard:isDebt(prior!)?rootGuard:"1=1";
    const args:unknown[]=[amount,category,account,toAccount,person,date,dueDate,note,channel,now,id,owner];if(parentId)args.push(parentId,owner,date,amount,id);else if(isDebt(prior!))args.push(amount,date);if(sync)args.push(sync.baseUpdatedAt,owner,sync.operationId);
    const statement=db.prepare(`UPDATE entries SET amount=?,category=?,account=?,to_account=?,person=?,date=?,due_date=?,note=?,channel=?,updated_at=? WHERE id=? AND owner=? AND deleted_at IS NULL AND ${guard} ${sync?"AND updated_at=? AND NOT EXISTS (SELECT 1 FROM sync_receipts WHERE owner=? AND operation_id=?)":""}`).bind(...args);
    const child=isDebt(prior!)?db.prepare("UPDATE entries SET person=? WHERE parent_id=? AND owner=? AND EXISTS (SELECT 1 FROM entries p WHERE p.id=? AND p.owner=? AND p.updated_at=?)").bind(person,id,owner,id,owner,now):undefined;
    const changed=await writeWithReceipt(db,owner,statement,sync,child,now);if(!changed)fail("এন্ট্রিটি অন্য জায়গায় বদলেছে, অথবা পরিমাণ/তারিখ পরিশোধের সঙ্গে মিলছে না। সর্বশেষ হিসাব দেখে আবার সেভ করুন।",409);
  }else{
    const duplicate=await db.prepare("SELECT id FROM entries WHERE id=? AND owner=?").bind(id,owner).first();if(duplicate){if(sync)fail("এই ID-তে আগে একটি এন্ট্রি আছে। সর্বশেষ হিসাব দেখুন।",409);return {id,alreadySaved:true};}
    const args:unknown[]=[id,owner,kind,amount,category,account,toAccount,person,parentId,date,dueDate,note,channel,now,now];if(parentId)args.push(parentId,owner,date,amount,id);if(sync)args.push(owner,sync.operationId);
    const statement=db.prepare(`INSERT OR IGNORE INTO entries (id,owner,kind,amount,category,account,to_account,person,parent_id,date,due_date,note,channel,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${parentId?paymentGuard:"1=1"} ${sync?"AND NOT EXISTS (SELECT 1 FROM sync_receipts WHERE owner=? AND operation_id=?)":""}`).bind(...args);const changed=await writeWithReceipt(db,owner,statement,sync,undefined,now);if(!changed)fail("বাকি টাকার বেশি পরিশোধ করা যাবে না। সর্বশেষ হিসাব দেখে পরিমাণ ঠিক করুন।",409);
  }
  return {id};
}

export async function trashEntry(db:D1Database,owner:string,id:string){const row=await getEntry(db,owner,id);const now=new Date().toISOString(), group=crypto.randomUUID();await db.prepare("UPDATE entries SET deleted_at=?,delete_group=?,updated_at=? WHERE owner=? AND deleted_at IS NULL AND (id=? OR parent_id=?)").bind(now,group,now,owner,id,isDebt(row)?id:"__none__").run();return {ok:true};}
export async function restoreEntry(db:D1Database,owner:string,id:string){const row=await getEntry(db,owner,id,true);if(row.parent_id){
    const root=await getEntry(db,owner,row.parent_id);const r=await db.prepare("UPDATE entries SET deleted_at=NULL,delete_group=NULL,updated_at=? WHERE owner=? AND id=? AND deleted_at IS NOT NULL AND EXISTS (SELECT 1 FROM entries p WHERE p.id=? AND p.owner=? AND p.deleted_at IS NULL AND p.date<=? AND p.amount >= ? + COALESCE((SELECT SUM(c.amount) FROM entries c WHERE c.parent_id=p.id AND c.owner=p.owner AND c.deleted_at IS NULL),0))").bind(new Date().toISOString(),owner,id,root.id,owner,row.date,row.amount).run();if(!r.meta.changes)fail("এই পরিশোধ ফেরালে ঋণের পরিমাণ ছাড়িয়ে যাবে। আগে বর্তমান পরিশোধের হিসাব ঠিক করুন।",409);
  }else await db.prepare("UPDATE entries SET deleted_at=NULL,delete_group=NULL,updated_at=? WHERE owner=? AND delete_group=?").bind(new Date().toISOString(),owner,row.delete_group).run();return {ok:true};}
export async function purgeEntry(db:D1Database,owner:string,id:string){const row=await getEntry(db,owner,id,true);await db.prepare("DELETE FROM entries WHERE owner=? AND deleted_at IS NOT NULL AND (id=? OR parent_id=?)").bind(owner,id,isDebt(row)?id:"__none__").run();return {ok:true};}

export async function savePrefs(db:D1Database,owner:string,b:Record<string,unknown>){await ensurePrefs(db,owner);const p=b.prefs as Prefs;if(!p||!ACCOUNTS.includes(p.defaultAccount)||!Number.isSafeInteger(p.budget)||p.budget<0||p.budget>100000000000)fail("সেটিংস সঠিক নয়।");for(const key of ["inCategories","outCategories","favorites"] as const){if(!Array.isArray(p[key])||p[key].length>60||p[key].some(v=>typeof v!=="string"||!v.trim()||v.length>60))fail("ক্যাটাগরির নাম সঠিক নয়।");}if(!p.inCategories.length||!p.outCategories.length)fail("অন্তত একটি ক্যাটাগরি রাখতে হবে।");const data:Prefs={defaultAccount:p.defaultAccount,budget:p.budget,favorites:[...new Set(p.favorites)],inCategories:[...new Set(p.inCategories.map(v=>v.trim()))],outCategories:[...new Set(p.outCategories.map(v=>v.trim()))]};await db.prepare("UPDATE preferences SET data=? WHERE owner=?").bind(JSON.stringify(data),owner).run();return {ok:true};}

const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,"0")).join("");
async function hashPassword(password:string,salt:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:100000},key,256));}
async function digest(s:string){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));}
function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function validPassword(v:unknown){if(typeof v!=="string"||v.length<8||v.length>128)fail("Password অন্তত ৮ এবং সর্বোচ্চ ১২৮ অক্ষরের হতে হবে।");return v as string;}
interface Secret {bin_hash:string|null;bin_salt:string|null;failures:number;locked_until:number}
async function verifyPassword(db:D1Database,owner:string,password:string){const s=await db.prepare("SELECT bin_hash,bin_salt,failures,locked_until FROM preferences WHERE owner=?").bind(owner).first<Secret>();if(!s?.bin_hash||!s.bin_salt)throw new AppError("আগে Bin password সেট করুন।",403);const now=Date.now();if(s.locked_until>now)fail("কয়েকবার ভুল password দেওয়া হয়েছে। ৫ মিনিট পরে চেষ্টা করুন।",429);
  const claim=await db.prepare("UPDATE preferences SET failures=CASE WHEN locked_until>0 AND locked_until<=? THEN 1 ELSE failures+1 END, locked_until=CASE WHEN (CASE WHEN locked_until>0 AND locked_until<=? THEN 0 ELSE failures END)>=4 THEN ? ELSE 0 END WHERE owner=? AND locked_until<=?").bind(now,now,now+300000,owner,now).run();if(!claim.meta.changes)fail("৫ মিনিট পরে চেষ্টা করুন।",429);
  if(!equal(await hashPassword(password,s.bin_salt),s.bin_hash))fail("Password সঠিক নয়।",403);await db.prepare("UPDATE preferences SET failures=0,locked_until=0 WHERE owner=?").bind(owner).run();
}
export async function setPassword(db:D1Database,owner:string,b:Record<string,unknown>){await ensurePrefs(db,owner);const password=validPassword(b.password);const s=await db.prepare("SELECT bin_hash FROM preferences WHERE owner=?").bind(owner).first<{bin_hash:string|null}>();if(s?.bin_hash)await verifyPassword(db,owner,validPassword(b.oldPassword));const salt=crypto.randomUUID(), hash=await hashPassword(password,salt);const r=await db.prepare(`UPDATE preferences SET bin_hash=?,bin_salt=?,failures=0,locked_until=0 WHERE owner=? ${s?.bin_hash?"AND bin_hash=?":"AND bin_hash IS NULL"}`).bind(...(s?.bin_hash?[hash,salt,owner,s.bin_hash]:[hash,salt,owner])).run();if(!r.meta.changes)fail("Password পরিবর্তিত হয়েছে। আবার চেষ্টা করুন।",409);await db.prepare("DELETE FROM bin_sessions WHERE owner=?").bind(owner).run();return {ok:true};}
export async function unlockBin(db:D1Database,owner:string,password:unknown){await ensurePrefs(db,owner);await verifyPassword(db,owner,validPassword(password));const token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);await db.batch([db.prepare("DELETE FROM bin_sessions WHERE expires_at<?").bind(Date.now()),db.prepare("INSERT INTO bin_sessions (token_hash,owner,expires_at) VALUES (?,?,?)").bind(await digest(token),owner,Date.now()+600000)]);return token;}
export async function requireBin(db:D1Database,owner:string,token:string){if(!token)fail("Bin খুলতে password দিন।",403);const session=await db.prepare("SELECT owner FROM bin_sessions WHERE token_hash=? AND owner=? AND expires_at>?").bind(await digest(token),owner,Date.now()).first();if(!session)fail("Bin লক হয়েছে। আবার password দিন।",403);}
export async function lockBin(db:D1Database,owner:string,token:string){if(token)await db.prepare("DELETE FROM bin_sessions WHERE token_hash=? AND owner=?").bind(await digest(token),owner).run();}
export async function readBin(db:D1Database,owner:string){const rows=await db.prepare(`SELECT ${publicColumns} FROM entries WHERE owner=? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`).bind(owner).all();return {entries:rows.results};}


interface SyncMeta {operationId:string;payloadHash:string;baseUpdatedAt:string|null}
async function writeWithReceipt(db:D1Database,owner:string,statement:D1PreparedStatement,sync?:SyncMeta,child?:D1PreparedStatement,entryUpdatedAt=""){
  if(!sync){const r=await db.batch([statement,...(child?[child]:[])]);return !!r[0].meta.changes;}
  const receipt=db.prepare("INSERT OR IGNORE INTO sync_receipts (operation_id,owner,payload_hash,created_at,entry_updated_at) SELECT ?,?,?,?,? WHERE changes()>0").bind(sync.operationId,owner,sync.payloadHash,new Date().toISOString(),entryUpdatedAt);
  const result=await db.batch([statement,receipt,...(child?[child]:[])]);
  if(result[0].meta.changes)return true;
  const existing=await db.prepare("SELECT payload_hash,entry_updated_at FROM sync_receipts WHERE operation_id=? AND owner=?").bind(sync.operationId,owner).first<{payload_hash:string;entry_updated_at:string}>();
  return existing?.payload_hash===sync.payloadHash;
}
export async function syncEntry(db:D1Database,owner:string,b:Record<string,unknown>){
  if(b.ownerKey!==owner)throw new AppError("এই ফোনের হিসাব যে অ্যাকাউন্টের, সেটি দিয়ে সাইন ইন করুন।",403);
  const op=b.operation as {id?:string;payload?:Record<string,unknown>;baseUpdatedAt?:string|null};
  if(!op||typeof op.id!=="string"||!/^[a-zA-Z0-9-]{8,80}$/.test(op.id)||!op.payload||op.payload.action!=="save")throw new AppError("Sync request সঠিক নয়।");
  const base=typeof op.baseUpdatedAt==="string"?op.baseUpdatedAt:null;
  const payloadHash=await digest(JSON.stringify({payload:op.payload,baseUpdatedAt:base}));
  const existing=await db.prepare("SELECT payload_hash,entry_updated_at FROM sync_receipts WHERE operation_id=? AND owner=?").bind(op.id,owner).first<{payload_hash:string;entry_updated_at:string}>();
  if(existing){if(existing.payload_hash!==payloadHash)throw new AppError("একই sync ID-তে আলাদা তথ্য পাঠানো হয়েছে।",409);return {ok:true,alreadySaved:true,entryUpdatedAt:existing.entry_updated_at};}
  if(op.payload.edit===true&&!base)throw new AppError("সংশোধনের আগের তথ্য পাওয়া যায়নি।",409);
  await saveEntry(db,owner,op.payload,{operationId:op.id,payloadHash,baseUpdatedAt:base});const receipt=await db.prepare("SELECT entry_updated_at FROM sync_receipts WHERE operation_id=? AND owner=?").bind(op.id,owner).first<{entry_updated_at:string}>();return {ok:true,entryUpdatedAt:receipt?.entry_updated_at};
}
