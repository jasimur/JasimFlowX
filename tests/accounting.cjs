const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync,readdirSync } = require('node:fs');
const path = require('node:path');
const root=process.env.HISAB_TEST_BUILD;
if(!root) throw new Error('HISAB_TEST_BUILD must point to the compiled ledger/service directory');
const service=require(path.join(root,'service.js'));
const ledger=require(path.join(root,'ledger.js'));
const sqlite=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(path.join('drizzle',f),'utf8'));
const db={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},_execute(){const q=sqlite.prepare(sql);if(/^SELECT/i.test(sql))return {results:q.all(...args)};const r=q.run(...args);return {results:[],meta:{changes:Number(r.changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s._execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const owner='test-owner',date='2026-08-01';
const payload=(kind,amount,extra={})=>({id:crypto.randomUUID(),kind,amount:String(amount),category:kind==='income'?'Work':'Food',account:'Cash',date,person:'Rahim',...extra});
async function add(kind,amount,extra={}){const b=payload(kind,amount,extra);await service.saveEntry(db,owner,b);return b;}
async function state(){return service.readState(db,owner);}
let checks=0;
function check(condition){assert.ok(condition);checks++;}
(async()=>{
  assert.equal(ledger.amountToMinor('0.10')+ledger.amountToMinor('0.20'),30);checks++;
  for(const bad of ['0','-1','NaN','1e6','1.001','1000000001']){assert.throws(()=>ledger.amountToMinor(bad));checks++;}
  await add('opening',1000);const income=await add('income',2000);
  const debt=await add('borrow',500);await add('expense',100);
  const paid=await add('repay',200,{parent_id:debt.id});
  const lent=await add('lend',400,{person:'Nadim'});await add('collect',150,{parent_id:lent.id});
  await add('transfer',100,{to_account:'bKash'});
  const credit=await add('credit',300);await add('repay',50,{parent_id:credit.id});
  await add('old_borrow',250);await add('old_lend',200,{person:'Nadim'});
  let s=await state(),totals=ledger.summarize(s.entries);
  assert.deepEqual({balance:totals.balance,income:totals.income,expense:totals.expense,payable:totals.payable,receivable:totals.receivable},{balance:290000,income:200000,expense:40000,payable:80000,receivable:45000});checks++;
  assert.equal(ledger.accountBalance(s.entries,'Cash'),280000);assert.equal(ledger.accountBalance(s.entries,'bKash'),10000);checks+=2;
  await service.saveEntry(db,owner,paid);assert.equal((await state()).entries.length,s.entries.length);checks++;
  await assert.rejects(()=>add('repay',301,{parent_id:debt.id}));checks++;
  await assert.rejects(()=>add('collect',1,{parent_id:debt.id}));checks++;
  await assert.rejects(()=>add('repay',1,{parent_id:debt.id,date:'2026-07-31'}));checks++;
  await assert.rejects(()=>service.saveEntry(db,owner,{...debt,edit:true,amount:'100'}));checks++;
  await assert.rejects(()=>service.saveEntry(db,owner,{...debt,edit:true,date:'2026-08-02'}));checks++;
  await service.trashEntry(db,owner,debt.id);s=await state();check(!s.entries.some(e=>e.id===debt.id||e.id===paid.id));assert.equal(ledger.summarize(s.entries).balance,260000);checks++;
  await service.restoreEntry(db,owner,debt.id);assert.equal(ledger.summarize((await state()).entries).balance,290000);checks++;
  await service.trashEntry(db,owner,paid.id);const newPaid=await add('repay',500,{parent_id:debt.id});await assert.rejects(()=>service.restoreEntry(db,owner,paid.id));checks++;
  await service.trashEntry(db,owner,newPaid.id);await service.restoreEntry(db,owner,paid.id);assert.equal(ledger.summarize((await state()).entries).balance,290000);checks++;
  await service.saveEntry(db,owner,{...income,edit:true,amount:'2200'});assert.equal(ledger.summarize((await state()).entries).income,220000);checks++;
  const concurrent=await add('borrow',100,{person:'Concurrent'});const results=await Promise.allSettled([add('repay',80,{parent_id:concurrent.id}),add('repay',80,{parent_id:concurrent.id})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);checks++;
  check((await service.readState(db,'other-owner')).entries.length===0);await assert.rejects(()=>service.trashEntry(db,'other-owner',debt.id));checks++;
  await service.setPassword(db,owner,{password:'Strong-test-password'});s=await state();check(s.binConfigured);check(!JSON.stringify(s).includes('bin_hash'));check(!JSON.stringify(s).includes('Strong-test-password'));
  await assert.rejects(()=>service.requireBin(db,owner,''));checks++;
  await assert.rejects(()=>service.unlockBin(db,owner,'Wrong-password'));checks++;
  const token=await service.unlockBin(db,owner,'Strong-test-password');await service.requireBin(db,owner,token);checks++;
  await assert.rejects(()=>service.requireBin(db,'other-owner',token));checks++;
  await service.lockBin(db,owner,token);await assert.rejects(()=>service.requireBin(db,owner,token));checks++;
  const token2=await service.unlockBin(db,owner,'Strong-test-password');await service.setPassword(db,owner,{password:'Changed-test-password',oldPassword:'Strong-test-password'});await assert.rejects(()=>service.requireBin(db,owner,token2));checks++;
  for(let i=0;i<5;i++)await assert.rejects(()=>service.unlockBin(db,owner,'Wrong-password'));
  await assert.rejects(()=>service.unlockBin(db,owner,'Changed-test-password'),e=>e.status===429);checks++;
  await service.trashEntry(db,owner,debt.id);await service.purgeEntry(db,owner,debt.id);check(!sqlite.prepare('SELECT id FROM entries WHERE id=? OR parent_id=?').get(debt.id,debt.id));
  assert.deepEqual(ledger.periodBounds('week','2026-09-13'),['2026-09-12','2026-09-18']);checks++;
  assert.deepEqual(ledger.periodBounds('month','2024-02-18'),['2024-02-01','2024-02-29']);checks++;
  const queryPlan=sqlite.prepare('EXPLAIN QUERY PLAN SELECT * FROM entries WHERE owner=? AND deleted_at IS NULL ORDER BY date').all(owner);check(queryPlan.some(r=>r.detail.includes('idx_entries_owner_deleted_date')));
  console.log(`${checks} checks passed: exact money, cash vs income, transfers, old/credit debt, partial payments, idempotency, concurrent overpayment, edits, Bin cascades/restores, ownership, password hashes, session revocation, lockout, date periods, and indexes.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
