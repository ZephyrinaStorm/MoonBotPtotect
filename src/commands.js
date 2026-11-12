import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
export const categories = {
 moderation:['ban','unban','kick','timeout','untimeout','warn','warnings','clearwarnings','purge','slowmode'],
 blacklist:['add','remove','list','check','reason','import','export','enable','disable','status'],
 antiraid:['enable','disable','status','threshold','window','lockdown','unlockdown','whitelist','unwhitelist','list'],
 antinuke:['enable','disable','status','limit','window','whitelist','unwhitelist','list','audit','reset'],
 antialt:['enable','disable','status','minage','scan','review','allow','deny','list','reset'],
 antibot:['enable','disable','status','allow','deny','list','scan','kick','policy','reset'],
 backup:['create','list','inspect','restore','delete','rename','export','schedule','disable','status'],
 logs:['enable','disable','status','channel','events','recent','clear','export','test','reset'],
 verify:['enable','disable','status','role','channel','start','approve','reject','agegate','reset'],
 config:['status','help','ping','server','bot','prefix','language','alerts','dashboard','reset']
};
export const descriptions={moderation:'Moderate server members',blacklist:'Manage persistent member blacklist',antiraid:'Configure raid detection',antinuke:'Configure destructive action detection',antialt:'Configure suspicious account checks',antibot:'Configure bot admission',backup:'Back up server configuration',logs:'Configure security logging',verify:'Manage verification workflow',config:'Bot information and settings'};
export const commands=Object.entries(categories).map(([name,subs])=>{
 const c=new SlashCommandBuilder().setName(name).setDescription(descriptions[name]);
 for(const sub of subs){c.addSubcommand(s=>s.setName(sub).setDescription(`${sub} — ${descriptions[name]}`)
 .addStringOption(o=>o.setName('value').setDescription('Target ID, parameter, or value').setRequired(false))
 .addStringOption(o=>o.setName('extra').setDescription('Additional value or reason').setRequired(false)));}
 return c.setDefaultMemberPermissions(name==='config'?null:PermissionFlagsBits.ManageGuild).toJSON();
});
export const commandCount=Object.values(categories).reduce((n,a)=>n+a.length,0);
