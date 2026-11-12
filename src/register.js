import 'dotenv/config';
import {REST,Routes} from 'discord.js';
import {commands,commandCount} from './commands.js';
if(!process.env.DISCORD_TOKEN||!process.env.DISCORD_CLIENT_ID) throw Error('Set DISCORD_TOKEN and DISCORD_CLIENT_ID');
const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
const route=process.env.DISCORD_GUILD_ID?Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID,process.env.DISCORD_GUILD_ID):Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
await rest.put(route,{body:commands});
console.log(`Registered ${commandCount} subcommands under ${commands.length} top-level commands`);
