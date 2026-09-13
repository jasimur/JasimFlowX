import {offlineEngine,scheduleSync,rememberDevice} from "./offline-client";
export class RequestError extends Error {constructor(message:string,public status:number){super(message);}}
async function onlineRequest(action?:Record<string,unknown>,view?:string){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch("/api/hisab"+(view?"?view="+view:""),{method:action?"POST":"GET",headers:action?{"Content-Type":"application/json"}:{},body:action?JSON.stringify(action):undefined,cache:"no-store",credentials:"same-origin",redirect:"manual",signal:controller.signal});if(r.type==="opaqueredirect")throw new RequestError("আবার নিজের অ্যাকাউন্টে সাইন ইন করো।",401);if(!r.headers.get("content-type")?.includes("application/json"))throw new RequestError("ইন্টারনেট সংযোগ দিয়ে আবার চেষ্টা করো।",503);const data=await r.json() as {error?:string};if(!r.ok)throw new RequestError(data.error||"আবার চেষ্টা করো।",r.status);return data;}finally{clearTimeout(timer);}}
export async function api<T=import("./ledger").AppData>(action?:Record<string,unknown>,view?:string):Promise<T>{
  const engine=offlineEngine();
  if(!action&&!view){let cached;try{cached=await engine.read();}catch{throw new RequestError("ফোনে তথ্য সেভ করার অনুমতি পাওয়া যায়নি। Private browsing বন্ধ করে আবার চেষ্টা করো।",503);}if(cached)return cached as T;await engine.sync();cached=await engine.read();if(cached)return cached as T;const s=await engine.status();throw new RequestError(s.error||"প্রথমবার অনলাইনে নিজের খাতা খোলো।",s.locked?401:503);}
  if(action?.action==="save"){const result=await engine.enqueue(action);void rememberDevice();void scheduleSync();return result as T;}
  if(action&&["trash","prefs","restore","purge","set-password","unlock"].includes(String(action.action))){if(!navigator.onLine)throw new RequestError("এই কাজটি করতে ইন্টারনেট লাগবে। নতুন এন্ট্রি ও সংশোধন offline-এ সেভ করতে পারবে।",503);await engine.sync();const state=await engine.status();if(state.locked)throw new RequestError(state.error,401);if(state.pending)throw new RequestError("আগে ফোনের বাকি এন্ট্রিগুলো sync শেষ করো।",409);}
  let result;try{result=await onlineRequest(action,view);}catch(e){if(e instanceof RequestError)throw e;throw new RequestError("ইন্টারনেট সংযোগ দিয়ে আবার চেষ্টা করো।",503);}
  if(action&&["trash","prefs"].includes(String(action.action)))await engine.acknowledge(action);
  if(action&&["trash","prefs","restore","purge","set-password"].includes(String(action.action)))await engine.sync();
  return result as T;
}
