import Foundation
import Security
import Capacitor

@objc(EvergreenSessionPlugin)
public class EvergreenSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EvergreenSessionPlugin"
    public let jsName = "EvergreenSession"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "startStream", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "stopStream", returnType: CAPPluginReturnPromise)]
    private let origin = "https://evergreen-holding.vercel.app"
    private let lock = NSLock()
    private var streams: [String: URLSession] = [:]
    private struct StoredCookie: Codable { let name: String; let value: String; let expires: Date }
    private let keyQuery: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.evergreen.holdings.session", kSecAttrAccount as String: "httpOnlyCookies"]
    private func readCookies() throws -> [StoredCookie] {
        var query = keyQuery; query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?; let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return [] }
        guard status == errSecSuccess, let data = item as? Data else { throw URLError(.userAuthenticationRequired) }
        return try JSONDecoder().decode([StoredCookie].self, from: data).filter { $0.expires > Date() }
    }
    private func accept(_ response: HTTPURLResponse) throws {
        lock.lock(); defer { lock.unlock() }
        var values = try readCookies()
        var fields: [String: String] = [:]
        for (key, value) in response.allHeaderFields { fields[String(describing: key)] = String(describing: value) }
        for cookie in HTTPCookie.cookies(withResponseHeaderFields: fields, for: URL(string: origin)!) {
            guard cookie.name.hasPrefix("__Host-eg-"), cookie.isSecure, cookie.isHTTPOnly, cookie.path == "/", cookie.domain == "evergreen-holding.vercel.app" else { continue }
            values.removeAll { $0.name == cookie.name }
            if let expires = cookie.expiresDate, expires > Date() { values.append(StoredCookie(name: cookie.name, value: cookie.value, expires: expires)) }
        }
        let data = try JSONEncoder().encode(values)
        let update = SecItemUpdate(keyQuery as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if update == errSecItemNotFound {
            var add = keyQuery; add[kSecValueData as String] = data; add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else { throw URLError(.cannotWriteToFile) }
        } else if update != errSecSuccess { throw URLError(.cannotWriteToFile) }
    }
    private func makeRequest(_ path: String, method: String) throws -> URLRequest {
        guard path.hasPrefix("/api/"), !path.contains("\\"), !path.contains("\r"), !path.contains("\n"),
              let url = URL(string: path, relativeTo: URL(string: origin)!)?.absoluteURL,
              url.scheme == "https", url.host == "evergreen-holding.vercel.app", url.port == nil, url.user == nil, url.password == nil,
              url.standardized.path.hasPrefix("/api/") else { throw URLError(.badURL) }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 55)
        request.httpShouldHandleCookies = false
        request.httpMethod = method; request.setValue(origin, forHTTPHeaderField: "Origin")
        lock.lock(); defer { lock.unlock() }
        request.setValue(try readCookies().map { "\($0.name)=\($0.value)" }.joined(separator: "; "), forHTTPHeaderField: "Cookie")
        return request
    }
    private func configuration() -> URLSessionConfiguration {
        let c = URLSessionConfiguration.ephemeral; c.httpCookieStorage = nil; c.httpShouldSetCookies = false; c.urlCache = nil; return c
    }
    @objc func request(_ call: CAPPluginCall) {
        do {
            let method = call.getString("method", "GET").uppercased()
            guard ["GET","POST","PUT","PATCH","DELETE","HEAD"].contains(method) else { throw URLError(.badURL) }
            var request = try makeRequest(call.getString("path", ""), method: method)
            for (name, value) in call.getObject("headers", [:]) where ["content-type","accept","prefer","range","x-upsert","x-client-info"].contains(name.lowercased()) { if let value = value as? String { request.setValue(value, forHTTPHeaderField: name) } }
            if let body = call.getString("body") { guard let data = Data(base64Encoded: body), data.count <= 8388608 else { throw URLError(.dataLengthExceedsMaximum) }; request.httpBody = data }
            let delegate = NoRedirectDelegate(); let session = URLSession(configuration: configuration(), delegate: delegate, delegateQueue: nil)
            session.dataTask(with: request) { [weak self] data, response, error in
                defer { session.finishTasksAndInvalidate() }
                do {
                    guard let self = self, error == nil, let response = response as? HTTPURLResponse, (data?.count ?? 0) <= 16777216 else { throw URLError(.cannotLoadFromNetwork) }
                    try self.accept(response); var safe: [String: String] = [:]
                    for name in ["Content-Type","Content-Range","Content-Disposition","ETag","Retry-After"] { if let value = response.value(forHTTPHeaderField: name) { safe[name] = value } }
                    call.resolve(["status": response.statusCode, "headers": safe, "body": (data ?? Data()).base64EncodedString()])
                } catch { call.reject("Não foi possível conectar com segurança. Tente novamente.", "NATIVE_NETWORK") }
            }.resume()
        } catch { call.reject("Solicitação não autorizada.", "NATIVE_REQUEST") }
    }
    @objc func startStream(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), UUID(uuidString: id) != nil else { call.reject("Conexão inválida."); return }
        do {
            let request = try makeRequest(call.getString("path", ""), method: "GET")
            lock.lock(); let capacity = streams.count < 12; lock.unlock(); guard capacity else { throw URLError(.cannotConnectToHost) }
            let delegate = EventStreamDelegate(receive: { [weak self] response in try self?.accept(response) }, event: { [weak self] line in self?.notifyListeners("stream", data: ["id": id, "line": line]) }, finish: { [weak self] in
                self?.notifyListeners("stream", data: ["id": id, "closed": true]); self?.lock.lock(); self?.streams.removeValue(forKey: id); self?.lock.unlock()
            })
            let session = URLSession(configuration: configuration(), delegate: delegate, delegateQueue: nil)
            lock.lock(); streams[id] = session; lock.unlock(); session.dataTask(with: request).resume(); call.resolve()
        } catch { call.reject("Conexão de mensagens indisponível.") }
    }
    @objc func stopStream(_ call: CAPPluginCall) {
        lock.lock(); let session = streams.removeValue(forKey: call.getString("id", "")); lock.unlock(); session?.invalidateAndCancel(); call.resolve()
    }
}

private class NoRedirectDelegate: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
private final class EventStreamDelegate: NoRedirectDelegate, URLSessionDataDelegate {
    private var buffer = Data()
    private let receive: (HTTPURLResponse) throws -> Void
    private let event: (String) -> Void
    private let finish: () -> Void
    init(receive: @escaping (HTTPURLResponse) throws -> Void, event: @escaping (String) -> Void, finish: @escaping () -> Void) { self.receive = receive; self.event = event; self.finish = finish }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        do { guard let response = response as? HTTPURLResponse, response.statusCode == 200 else { throw URLError(.badServerResponse) }; try receive(response); completionHandler(.allow) } catch { completionHandler(.cancel) }
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        buffer.append(data); if buffer.count > 262144 { session.invalidateAndCancel(); return }
        while let index = buffer.firstIndex(of: 10) { let line = String(data: buffer[..<index], encoding: .utf8) ?? ""; buffer.removeSubrange(...index); if line.hasPrefix("data: ") { event(line) } }
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) { finish(); session.finishTasksAndInvalidate() }
}

class EvergreenBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(EvergreenSessionPlugin()) }
}
