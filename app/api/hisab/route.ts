import { getDatabase } from "@/lib/database";
import { AppError, readState, saveEntry, trashEntry, restoreEntry, purgeEntry, savePrefs, setPassword, unlockBin, lockBin, requireBin, readBin, syncEntry } from "@/lib/service";
export const dynamic="force-dynamic";
const cookieName="hisab_bin";
const cookie=(v:string,age=600)=>`${cookieName}=${v}; HttpOnly; Secure; SameSite=Strict; Path=/api/hisab; Max-Age=${age}`;
function token(req:Request){return req.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(cookieName+"="))?.slice(cookieName.length+1)||"";}
function json(body:unknown,status=200,extra:Record<string,string>={}){return Response.json(body,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff",...extra}});}
async function handle(req:Request){try{
  const owner=req.headers.get("x-jasimflow-owner");if(!owner||!req.headers.get("x-jasimflow-email"))throw new AppError("Cloudflare Access দিয়ে সাইন ইন করো।",401);
  const db=getDatabase();
  if(req.method==="GET"){if(new URL(req.url).searchParams.get("view")==="bin"){await requireBin(db,owner,token(req));return json(await readBin(db,owner));}return json(await readState(db,owner));}
  if(!req.headers.get("content-type")?.startsWith("application/json"))throw new AppError("Invalid request",415);
  const origin=req.headers.get("origin");if((origin&&origin!==new URL(req.url).origin)||req.headers.get("sec-fetch-site")==="cross-site")throw new AppError("Invalid origin",403);
  const raw=await req.text();if(raw.length>24000)throw new AppError("Request too large",413);const b=JSON.parse(raw);if(!b||typeof b!=="object")throw new AppError("Invalid request");
  if(b.action==="sync")return json(await syncEntry(db,owner,b));
  if(b.action==="save")return json(await saveEntry(db,owner,b));
  if(b.action==="trash")return json(await trashEntry(db,owner,String(b.id)));
  if(b.action==="prefs")return json(await savePrefs(db,owner,b));
  if(b.action==="set-password")return json(await setPassword(db,owner,b),200,{"Set-Cookie":cookie("",0)});
  if(b.action==="unlock"){const t=await unlockBin(db,owner,b.password);return json({ok:true},200,{"Set-Cookie":cookie(t)});}
  if(b.action==="lock"){await lockBin(db,owner,token(req));return json({ok:true},200,{"Set-Cookie":cookie("",0)});}
  if(b.action==="restore"||b.action==="purge"){await requireBin(db,owner,token(req));return json(await (b.action==="restore"?restoreEntry:purgeEntry)(db,owner,String(b.id)));}
  throw new AppError("Unknown action");
}catch(e){if(e instanceof AppError)return json({error:e.message},e.status);if(e instanceof SyntaxError)return json({error:"Invalid request"},400);if(e instanceof Error&&e.message.includes("পরিমাণ"))return json({error:e.message},400);console.error("Hisab request failed",e instanceof Error?e.name:"unknown");return json({error:"হিসাব লোড বা সেভ করা যায়নি। একটু পরে আবার চেষ্টা করুন।"},503);}}
export const GET=handle;
export const POST=handle;
