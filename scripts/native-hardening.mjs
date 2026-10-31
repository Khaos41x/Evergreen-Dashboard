import {readFileSync,writeFileSync} from 'node:fs'
// Applied only to packaged copies; Vercel dist/index.html and its headers are untouched.
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://dlxsakabwtpdimolsmgd.supabase.co; connect-src 'self' https://dlxsakabwtpdimolsmgd.supabase.co; object-src 'none'; base-uri 'none'; form-action 'none'"
for(const path of ['android/app/src/main/assets/public/index.html','ios/App/App/public/index.html']){
 let html=readFileSync(path,'utf8');html=html.replace(/<meta name="eg-native-csp"[^>]*>/g,'');html=html.replace('<head>','<head>\n<meta name="eg-native-csp" http-equiv="Content-Security-Policy" content="'+csp+'">');writeFileSync(path,html)
}
console.log('CSP applied to Android/iOS packaged HTML only.')
