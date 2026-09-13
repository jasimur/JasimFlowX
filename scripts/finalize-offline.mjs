import {readdir,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
const root=path.resolve("dist/client"),assets=[];
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())await walk(p);else if(/\.(js|css|woff2?|png|svg|webmanifest)$/.test(f.name)&&!["sw.js","sw-precache.js"].includes(f.name))assets.push("/"+path.relative(root,p).split(path.sep).join("/"));}}
await walk(root);assets.sort();const hash=createHash("sha256");for(const a of assets)hash.update(await readFile(path.join(root,a.slice(1))));hash.update(await readFile("public/sw.js"));
await writeFile(path.join(root,"sw-precache.js"),`self.__JF_CACHE_VERSION=${JSON.stringify("jasimflow-shell-"+hash.digest("hex").slice(0,16))};\nself.__JF_PRECACHE=${JSON.stringify(assets)};\n`);
console.log(`JasimFlow offline package: ${assets.length} assets.`);
