import 'dotenv/config';
import express from 'express';import helmet from 'helmet';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Client,GatewayIntentBits,PermissionsBitField,REST,Routes} from 'discord.js';
import {commands,commandCount,categories} from './commands.js';import {guild,save,log,snapshot} from './store.js';
const app=express();app.use(helmet({contentSecurityPolicy:false}));app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)),'../public')));
let clientReady=false;let client=null;let incidents=0;const joinBuckets=new Map();const destructiveBuckets=new Map();
app.get('/health',(_,r)=>r.json({ok:true,botReady:clientReady}));
app.get('/api/status',(_,r)=>r.json({name:'GuardBot Pro',botReady:clientReady,servers:clientReady?client.guilds.cache.size:0,commands:commandCount,groups:Object.keys(categories).length,incidents,uptime:Math.floor(process.uptime())}));
app.get('/api/commands',(_,r)=>r.json(categories));
app.get('/api/invite',(_,r)=>r.json({url:process.env.DISCORD_CLIENT_ID?`https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(process.env.DISCORD_CLIENT_ID)}&permissions=268446742&scope=bot%20applications.commands`:null}));
const port=Number(process.env.PORT||3000);app.listen(port,'0.0.0.0',()=>console.log(`Website listening on ${port}`));
const required=['DISCORD_TOKEN','DISCORD_CLIENT_ID'];
if(required.some(x=>!process.env[x]))console.warn('Discord bot disabled: missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
else{
client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildModeration]});
client.once('ready',async()=>{clientReady=true;console.log(`Bot logged in as ${client.user.tag}`);try{const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);const route=process.env.DISCORD_GUILD_ID?Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID,process.env.DISCORD_GUILD_ID):Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);await rest.put(route,{body:commands});console.log(`Registered ${commandCount} slash subcommands`)}catch(e){console.error('Registration failed',e)}});
client.on('guildMemberAdd',async member=>{const g=guild(member.guild.id),s=g.settings;try{
 if(g.blacklist[member.id]){await member.ban({reason:'GuardBot blacklist: '+g.blacklist[member.id]});incidents++;log(member.guild.id,`Blacklisted member ${member.id} banned`);return}
 if(member.user.bot&&s['antibot.enable']&&!g.allow[member.id]){await member.kick('GuardBot: unauthorized bot');incidents++;log(member.guild.id,`Unauthorized bot ${member.id} removed`);return}
 if(!member.user.bot&&s['antialt.enable']&&!g.allow[member.id]){const ageDays=(Date.now()-member.user.createdTimestamp)/86400000;if(ageDays<Number(s['antialt.minage']||7)){g.pending[member.id]='new account';save();log(member.guild.id,`New account ${member.id} flagged for review`)}}
 if(s['antiraid.enable']){const now=Date.now(),windowMs=Number(s['antiraid.window']||30)*1000,threshold=Number(s['antiraid.threshold']||8);const bucket=(joinBuckets.get(member.guild.id)||[]).filter(t=>now-t<windowMs);bucket.push(now);joinBuckets.set(member.guild.id,bucket);if(bucket.length===threshold){incidents++;log(member.guild.id,`Raid alert: ${bucket.length} joins in ${windowMs/1000}s`)}}
 }catch(e){console.error('Member security handler',e)}});
client.on('guildAuditLogEntryCreate',async(entry,guildObj)=>{const g=guild(guildObj.id);if(!g.settings['antinuke.enable'])return;const types=[10,12,20,22,30,32,50,52];if(!types.includes(entry.action)||!entry.executorId||entry.executorId===client.user.id||g.allow[entry.executorId])return;const key=guildObj.id+':'+entry.executorId,now=Date.now(),windowMs=Number(g.settings['antinuke.window']||30)*1000,limit=Number(g.settings['antinuke.limit']||3);const bucket=(destructiveBuckets.get(key)||[]).filter(t=>now-t<windowMs);bucket.push(now);destructiveBuckets.set(key,bucket);if(bucket.length===limit){incidents++;log(guildObj.id,`Anti-nuke alert: executor ${entry.executorId}, ${limit} destructive actions. Manual review required.`)}});
client.on('interactionCreate',async i=>{if(!i.isChatInputCommand()||!i.guildId)return;try{await i.deferReply({flags:64});const group=i.commandName,sub=i.options.getSubcommand(),value=i.options.getString('value'),extra=i.options.getString('extra');const g=guild(i.guildId),settings=g.settings;const admin=i.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);if(group!=='config'&&!admin)return i.editReply('Manage Server permission required.');const need=()=>{if(!value)throw Error('Provide a value (user ID, setting, or channel ID).');return value};const isId=x=>/^\d{17,22}$/.test(x);let reply='';
if(group==='moderation'){
 if(['ban','kick','timeout','untimeout','warn','warnings','clearwarnings','unban'].includes(sub)){const id=need();if(!isId(id))throw Error('Provide a valid Discord user ID.');const member=await i.guild.members.fetch(id).catch(()=>null);if(['ban','kick','timeout','untimeout'].includes(sub)&&!member&&sub!=='ban')throw Error('Member is not in this server.');if(member&&member.roles.highest.position>=i.guild.members.me.roles.highest.position)throw Error('Target is above my role.');
 if(sub==='ban'){await i.guild.members.ban(id,{reason:extra||'GuardBot moderation'});reply=`Banned ${id}`}
 if(sub==='unban'){await i.guild.members.unban(id);reply=`Unbanned ${id}`}
 if(sub==='kick'){await member.kick(extra||'GuardBot moderation');reply=`Kicked ${id}`}
 if(sub==='timeout'){await member.timeout(Math.min(28*86400000,Math.max(60000,Number(extra||10)*60000)),'GuardBot timeout');reply=`Timed out ${id}`}
 if(sub==='untimeout'){await member.timeout(null);reply=`Timeout removed for ${id}`}
 if(sub==='warn'){(g.warnings[id]??=[]).push({reason:extra||'No reason',by:i.user.id,date:new Date().toISOString()});save();reply=`Warned ${id}`}
 if(sub==='warnings')reply=JSON.stringify(g.warnings[id]||[]).slice(0,1700)||'No warnings';
 if(sub==='clearwarnings'){delete g.warnings[id];save();reply=`Cleared warnings for ${id}`}
 }else if(sub==='purge'){const count=Math.min(100,Math.max(1,Number(value||10)));if(!i.channel?.bulkDelete)throw Error('This channel does not support bulk deletion.');const removed=await i.channel.bulkDelete(count,true);reply=`Deleted ${removed.size} recent messages`}
 else if(sub==='slowmode'){await i.channel.setRateLimitPerUser(Math.min(21600,Math.max(0,Number(value||0))));reply='Slowmode updated'}
}else if(group==='blacklist'){
 if(sub==='add'){const id=need();if(!isId(id))throw Error('Invalid user ID');g.blacklist[id]=extra||'Blacklisted';save();reply=`Blacklisted ${id}`}
 else if(sub==='remove'){delete g.blacklist[need()];save();reply='Removed from blacklist'}
 else if(sub==='check')reply=g.blacklist[need()]||'Not blacklisted';
 else if(sub==='reason'){g.blacklist[need()]=extra||'No reason';save();reply='Reason updated'}
 else if(sub==='list'||sub==='export')reply=JSON.stringify(g.blacklist).slice(0,1700);
 else if(sub==='import'){const entries=need().split(',').map(x=>x.trim()).filter(isId);entries.forEach(id=>g.blacklist[id]='Imported');save();reply=`Imported ${entries.length} IDs`}
 else if(['enable','disable'].includes(sub)){settings['blacklist.enable']=sub==='enable';save();reply=`Blacklist setting ${sub}`}
 else reply=`${Object.keys(g.blacklist).length} blacklisted IDs`;
}else if(group==='backup'){
 if(sub==='create'){const name=value||`backup-${Date.now()}`;if(g.backups[name])throw Error('Backup name already exists');g.backups[name]={at:new Date().toISOString(),roles:i.guild.roles.cache.filter(r=>!r.managed&&r.id!==i.guild.id).map(r=>({name:r.name,color:r.color,permissions:r.permissions.bitfield.toString(),hoist:r.hoist,mentionable:r.mentionable})),channels:i.guild.channels.cache.map(c=>({name:c.name,type:c.type,parent:c.parent?.name||null}))};save();reply=`Created backup ${name}`}
 else if(sub==='list'||sub==='status')reply=Object.keys(g.backups).join(', ')||'No backups';
 else if(sub==='inspect'||sub==='export')reply=JSON.stringify(g.backups[need()]||null).slice(0,1700);
 else if(sub==='delete'){delete g.backups[need()];save();reply='Backup deleted'}
 else if(sub==='rename'){const old=need();if(!g.backups[old]||!extra)throw Error('Provide existing name and new name as extra');g.backups[extra]=g.backups[old];delete g.backups[old];save();reply='Renamed backup'}
 else if(sub==='restore')reply='Restore is intentionally disabled in this starter: review backup first and implement a confirmed, permission-safe restore before enabling.';
 else reply='Automatic backup scheduling is not enabled in this starter.';
}else if(group==='verify'){
 if(sub==='start'){g.pending[i.user.id]='self-request';save();reply='Verification request recorded for review'}
 else if(['approve','reject'].includes(sub)){const id=need();if(!g.pending[id])throw Error('No pending request');delete g.pending[id];if(sub==='approve'&&settings['verify.role']){const member=await i.guild.members.fetch(id);await member.roles.add(settings['verify.role'])}save();reply=`Request ${sub}d for ${id}`}
 else if(sub==='status')reply=`Pending: ${Object.keys(g.pending).length}; enabled: ${!!settings['verify.enable']}`;
 else if(sub==='reset'){g.pending={};save();reply='Pending requests cleared'}
 else if(sub==='agegate')reply='Age verification requires a privacy-safe external process; no age or identity documents are collected by this bot.';
 else {if(['role','channel'].includes(sub)&&!isId(need()))throw Error('Expected Discord ID');settings[`verify.${sub}`]=['enable','disable'].includes(sub)?sub==='enable':need();save();reply=`Verification ${sub} updated`}
}else if(group==='config'){
 if(sub==='ping')reply=`Pong! ${client.ws.ping}ms`;else if(sub==='help')reply='Commands: /moderation /blacklist /antiraid /antinuke /antialt /antibot /backup /logs /verify /config';
 else if(sub==='server')reply=`${i.guild.name} (${i.guildId})`;else if(sub==='bot')reply='GuardBot Pro — 100 slash subcommands';
 else if(sub==='dashboard')reply=process.env.PUBLIC_URL||'Website URL not configured';
 else if(sub==='status')reply=`Settings: ${JSON.stringify(settings).slice(0,1500)}`;
 else if(sub==='reset'){g.settings={};save();reply='Settings reset'}
 else {settings[`config.${sub}`]=need();save();reply=`Config ${sub} updated`}
}else if(group==='logs'){
 if(sub==='recent'||sub==='export')reply=JSON.stringify(g.logs.slice(0,12)).slice(0,1700)||'No logs';
 else if(sub==='clear'){g.logs=[];save();reply='Logs cleared'}
 else if(sub==='test'){log(i.guildId,'Test log from '+i.user.id);reply='Test logged'}
 else if(sub==='status')reply=JSON.stringify(Object.fromEntries(Object.entries(settings).filter(([k])=>k.startsWith('logs.'))));
 else if(sub==='reset'){Object.keys(settings).filter(k=>k.startsWith('logs.')).forEach(k=>delete settings[k]);save();reply='Log settings reset'}
 else {settings[`logs.${sub}`]=['enable','disable'].includes(sub)?sub==='enable':need();save();reply=`Logs ${sub} updated`}
}else{
 const key=`${group}.${sub}`;
 if(sub==='status')reply=JSON.stringify(Object.fromEntries(Object.entries(settings).filter(([k])=>k.startsWith(group+'.'))))||'Not configured';
 else if(sub==='list')reply=JSON.stringify(g.allow).slice(0,1700);
 else if(sub==='reset'){Object.keys(settings).filter(k=>k.startsWith(group+'.')).forEach(k=>delete settings[k]);save();reply=`${group} settings reset`}
 else if(['whitelist','allow'].includes(sub)){const id=need();if(!isId(id))throw Error('Invalid ID');g.allow[id]=true;save();reply=`Allowed ${id}`}
 else if(['unwhitelist','deny'].includes(sub)){delete g.allow[need()];save();reply='Removed from allowlist'}
 else if(['scan','review','audit'].includes(sub))reply='Review mode: examine audit logs and flagged accounts manually. No automatic mass punishments are performed.';
 else {settings[key]=sub==='enable'?true:sub==='disable'?false:need();save();reply=`${group} ${sub} saved`}
}
 if(reply)log(i.guildId,`${i.user.id}: /${group} ${sub}`);await i.editReply(String(reply||'Done').slice(0,1900));
 }catch(e){console.error('Command error',e);await i.editReply(`Error: ${e.message}`.slice(0,1900)).catch(()=>{})}});
client.login(process.env.DISCORD_TOKEN).catch(e=>console.error('Discord login failed',e));
}
