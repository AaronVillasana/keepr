import {dev} from 'astro';
const args=process.argv.slice(2);const at=key=>args.indexOf(key);
const port=at('--port')>=0?Number(args[at('--port')+1]):4321;
const host=at('--host')>=0?args[at('--host')+1]:'127.0.0.1';
const server=await dev({server:{port,host}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.stop();process.exit(0);});
