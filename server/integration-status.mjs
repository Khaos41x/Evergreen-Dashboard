import {HttpError} from './security.mjs'
import {encryptionKey} from './credentials.mjs'
export function integrationReadiness(config){
 let encryption=false;try{encryptionKey(config.env);encryption=true}catch{/* Report readiness, never return secret material. */}
 const storage=!!config.env.INTEGRATIONS_STORAGE_SERVICE_KEY
 return {ready:encryption&&storage,encryption,storage,scheduled:!!config.env.CRON_SECRET,providers:['cloudflare','vercel','supabase','asaas']}
}
export function requireIntegrationReadiness(config){const status=integrationReadiness(config);if(!status.ready)throw new HttpError(503,'INTEGRATION_CONFIGURATION','As integrações aguardam configuração do servidor. Peça ao responsável para concluir a preparação antes de conectar sua credencial.');return status}
