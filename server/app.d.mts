import type { IncomingMessage, ServerResponse } from 'node:http'
export function createHandler(env?: Record<string,string|undefined>,options?:{indexHTML?:()=>Promise<string>}):(req:IncomingMessage,res:ServerResponse)=>Promise<void>
