// Explicit one-time local key creation. Never overwrites or prints a private key.
import {generateKeyPairSync} from 'node:crypto'
import {existsSync,writeFileSync} from 'node:fs'
const privatePath='.mobile-update-signing.local.pem',publicPath='src/mobile/live-update-key.json'
if(process.argv[2]!=='--init'||existsSync(privatePath)||existsSync(publicPath))throw Error('Key initialization requires --init and no existing key files. Never rotate a published key implicitly.')
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048})
writeFileSync(privatePath,privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600})
writeFileSync(publicPath,JSON.stringify({pkcs1:publicKey.export({type:'pkcs1',format:'pem'}),spki:publicKey.export({type:'spki',format:'der'}).toString('base64')},null,2)+'\n',{flag:'wx'})
console.log('Local signing key created; public verification key prepared. No private material printed.')
