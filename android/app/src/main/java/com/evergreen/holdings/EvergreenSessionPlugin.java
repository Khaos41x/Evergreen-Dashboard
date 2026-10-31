package com.evergreen.holdings;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.*;

/** Private cookie transport. Never exports cookie values, headers or credentials to JS. */
@CapacitorPlugin(name="EvergreenSession")
public class EvergreenSessionPlugin extends Plugin {
    private static final String ORIGIN="https://evergreen-holding.vercel.app";
    private final ExecutorService pool=Executors.newCachedThreadPool();
    private final Map<String,HttpCookie> cookies=new HashMap<>();
    private final Map<String,Long> expires=new HashMap<>();
    private final Map<String,HttpURLConnection> streams=new ConcurrentHashMap<>();
    private boolean loaded=false;
    // CapacitorCookies installs a process-wide handler even when document.cookie
    // patching is disabled. Prevent URLConnection from mirroring API credentials
    // into that WebView/shared jar; this bridge supplies its private Cookie header.
    private static final class SessionCookieGuard extends CookieHandler {
        private final CookieHandler delegate;
        SessionCookieGuard(CookieHandler delegate){this.delegate=delegate;}
        private boolean api(URI uri){return "evergreen-holding.vercel.app".equalsIgnoreCase(uri.getHost());}
        @Override public Map<String,List<String>> get(URI uri,Map<String,List<String>> headers) throws IOException {
            return api(uri)||delegate==null?Collections.emptyMap():delegate.get(uri,headers);
        }
        @Override public void put(URI uri,Map<String,List<String>> headers) throws IOException {
            if(!api(uri)&&delegate!=null)delegate.put(uri,headers);
        }
    }
    private static synchronized void isolateCookies(){
        CookieHandler current=CookieHandler.getDefault();
        if(!(current instanceof SessionCookieGuard))CookieHandler.setDefault(new SessionCookieGuard(current));
    }
    private SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias("evergreen-session-v1")){
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder("evergreen-session-v1",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();
        }
        return (SecretKey)store.getKey("evergreen-session-v1",null);
    }
    private synchronized void loadCookies() throws Exception {
        if(loaded)return;
        String raw=getContext().getSharedPreferences("evergreen-session",Context.MODE_PRIVATE).getString("sealed",null);
        if(raw!=null){
            byte[] bytes=Base64.decode(raw,Base64.NO_WRAP);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Arrays.copyOfRange(bytes,0,12)));
            JSONArray values=new JSONArray(new String(cipher.doFinal(Arrays.copyOfRange(bytes,12,bytes.length)),StandardCharsets.UTF_8));
            for(int i=0;i<values.length();i++){JSONObject v=values.getJSONObject(i);if(v.getLong("expires")<=System.currentTimeMillis())continue;HttpCookie c=new HttpCookie(v.getString("name"),v.getString("value"));c.setPath("/");c.setSecure(true);c.setHttpOnly(true);cookies.put(c.getName(),c);expires.put(c.getName(),v.getLong("expires"));}
        }
        loaded=true;
    }
    private synchronized String cookieHeader() throws Exception {
        loadCookies();StringJoiner header=new StringJoiner("; ");
        for(HttpCookie c:cookies.values())if(expires.getOrDefault(c.getName(),0L)>System.currentTimeMillis())header.add(c.getName()+"="+c.getValue());
        return header.toString();
    }
    private synchronized void receive(HttpURLConnection connection) throws Exception {
        loadCookies();
        for(Map.Entry<String,List<String>> h:connection.getHeaderFields().entrySet())if("set-cookie".equalsIgnoreCase(h.getKey()))for(String raw:h.getValue())for(HttpCookie c:HttpCookie.parse(raw)){
            if(!c.getName().startsWith("__Host-eg-")||!c.getSecure()||!c.isHttpOnly()||!"/".equals(c.getPath())||c.getDomain()!=null)continue;
            if(c.getMaxAge()<=0){cookies.remove(c.getName());expires.remove(c.getName());}
            else{cookies.put(c.getName(),c);expires.put(c.getName(),System.currentTimeMillis()+Math.min(c.getMaxAge(),604800L)*1000);}
        }
        JSONArray values=new JSONArray();for(HttpCookie c:cookies.values())if(expires.get(c.getName())>System.currentTimeMillis())values.put(new JSONObject().put("name",c.getName()).put("value",c.getValue()).put("expires",expires.get(c.getName())));
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());ByteArrayOutputStream sealed=new ByteArrayOutputStream();sealed.write(cipher.getIV());sealed.write(cipher.doFinal(values.toString().getBytes(StandardCharsets.UTF_8)));
        if(!getContext().getSharedPreferences("evergreen-session",Context.MODE_PRIVATE).edit().putString("sealed",Base64.encodeToString(sealed.toByteArray(),Base64.NO_WRAP)).commit())throw new IOException("Session persistence unavailable");
    }
    private HttpURLConnection open(String path,String method) throws Exception {
        isolateCookies();
        if(path==null||!path.startsWith("/api/")||path.contains("\\")||path.contains("\r")||path.contains("\n"))throw new IOException("Invalid API path");
        URI url=URI.create(ORIGIN).resolve(path).normalize();
        if(!ORIGIN.equals(url.getScheme()+"://"+url.getAuthority())||!url.getPath().startsWith("/api/"))throw new IOException("Origin denied");
        HttpURLConnection c=(HttpURLConnection)url.toURL().openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(55000);c.setRequestMethod(method);c.setRequestProperty("Origin",ORIGIN);c.setRequestProperty("Cookie",cookieHeader());c.setRequestProperty("Cache-Control","no-store");return c;
    }
    @PluginMethod public void request(PluginCall call){pool.execute(()->{
        HttpURLConnection c=null;
        try{
            String method=call.getString("method","GET").toUpperCase(Locale.ROOT);
            if(!Arrays.asList("GET","POST","PUT","PATCH","DELETE","HEAD").contains(method))throw new IOException("Method denied");
            c=open(call.getString("path"),method);JSObject headers=call.getObject("headers",new JSObject());
            for(Iterator<String> i=headers.keys();i.hasNext();){String name=i.next();if(Arrays.asList("content-type","accept","prefer","range","x-upsert","x-client-info").contains(name.toLowerCase(Locale.ROOT)))c.setRequestProperty(name,headers.getString(name));}
            String body=call.getString("body");if(body!=null){byte[] bytes=Base64.decode(body,Base64.NO_WRAP);if(bytes.length>8388608)throw new IOException("Body too large");c.setDoOutput(true);try(OutputStream out=c.getOutputStream()){out.write(bytes);}}
            int status=c.getResponseCode();receive(c);JSObject safe=new JSObject();for(String name:Arrays.asList("Content-Type","Content-Range","Content-Disposition","ETag","Retry-After")){String v=c.getHeaderField(name);if(v!=null)safe.put(name,v);}
            ByteArrayOutputStream out=new ByteArrayOutputStream();InputStream input=status>=400?c.getErrorStream():c.getInputStream();
            if(input!=null)try(InputStream stream=input){byte[] buffer=new byte[8192];int n;while((n=stream.read(buffer))!=-1){if(out.size()+n>16777216)throw new IOException("Response too large");out.write(buffer,0,n);}}
            call.resolve(new JSObject().put("status",status).put("headers",safe).put("body",Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP)));
        }catch(Exception e){call.reject("Não foi possível conectar com segurança. Tente novamente.","NATIVE_NETWORK");}finally{if(c!=null)c.disconnect();}
    });}
    @PluginMethod public void startStream(PluginCall call){
        String id=call.getString("id");if(id==null||!id.matches("[a-f0-9-]{36}")||streams.size()>=12){call.reject("Limite de conexões.");return;}
        pool.execute(()->{HttpURLConnection c=null;try{
            c=open(call.getString("path"),"GET");streams.put(id,c);if(c.getResponseCode()!=200)throw new IOException();receive(c);call.resolve();
            try(BufferedReader reader=new BufferedReader(new InputStreamReader(c.getInputStream(),StandardCharsets.UTF_8))){String line;while((line=reader.readLine())!=null&&streams.get(id)==c){if(line.length()>262144)throw new IOException();if(line.startsWith("data: "))notifyListeners("stream",new JSObject().put("id",id).put("line",line));}}
        }catch(Exception e){notifyListeners("stream",new JSObject().put("id",id).put("error",true));call.reject("Conexão de mensagens indisponível.");}finally{streams.remove(id);if(c!=null)c.disconnect();notifyListeners("stream",new JSObject().put("id",id).put("closed",true));}});
    }
    @PluginMethod public void stopStream(PluginCall call){HttpURLConnection c=streams.remove(call.getString("id",""));if(c!=null)c.disconnect();call.resolve();}
    @Override protected void handleOnDestroy(){for(HttpURLConnection c:streams.values())c.disconnect();streams.clear();pool.shutdownNow();}
}
