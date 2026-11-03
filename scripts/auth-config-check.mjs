import {loadEnv} from 'vite'
import {authOrigin,emailRedirect} from '../server/auth-config.mjs'
const env={...loadEnv(process.env.VERCEL_ENV||'production',process.cwd(),''),...process.env}
// An ordinary local/native bundle has no server environment. Vercel builds do.
if(env.VERCEL==='1'||env.AUTH_ENVIRONMENT){
 try {
  if(env.AUTH_ENVIRONMENT&&!['development','staging','production'].includes(env.AUTH_ENVIRONMENT))throw Error('AUTH_ENVIRONMENT inv�lido.')
  const origin=authOrigin(env.APP_ORIGIN,env.VERCEL==='1'||env.AUTH_ENVIRONMENT!=='development')
  if(env.VERCEL_ENV==='production'&&origin!=='https://evergreen-holding.vercel.app')throw Error('APP_ORIGIN não corresponde ao domínio oficial verificado da Evergreen.')
  console.log('Auth configuration valid: '+emailRedirect({origin,production:true}))
 } catch(error){console.error('Auth configuration rejected: '+error.message);process.exit(1)}
}else console.log('Local/native bundle: server auth origin is validated at runtime; hosted deployment check not applicable.')
