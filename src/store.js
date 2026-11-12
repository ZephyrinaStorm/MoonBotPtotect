import fs from 'node:fs';import path from 'node:path';
const dir=process.env.DATA_DIR||'./data';fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'guardbot.json');
let db={guilds:{}};try{db=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
export function guild(id){return db.guilds[id]??={settings:{},blacklist:{},allow:{},warnings:{},backups:{},logs:[],pending:{}}}
export function save(){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(db,null,2));fs.renameSync(temp,file)}
export function log(id,msg){const g=guild(id);g.logs.unshift({at:new Date().toISOString(),message:msg});g.logs=g.logs.slice(0,300);save()}
export function snapshot(){return {guilds:Object.keys(db.guilds).length}}
