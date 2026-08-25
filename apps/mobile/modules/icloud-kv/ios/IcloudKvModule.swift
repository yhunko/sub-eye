import ExpoModulesCore

/// The app's iCloud key-value store, exposed as one flat `[String: String]` map.
///
/// Deliberately not a document store. `NSUbiquitousKeyValueStore` resolves a
/// conflict PER KEY, last writer wins, and that is the whole reason SubEye keeps
/// one key per record: two devices editing two different subscriptions never
/// collide, and a removed key is a deletion that propagates on its own. A single
/// blob would have made every concurrent edit a whole-document conflict and put
/// a hand-rolled merge on top of it.
///
/// The store is capped by iOS at 1 MB total and 1024 keys. The JS side owns that
/// budget; this module only reports what a write did.
public class IcloudKvModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("IcloudKv")

    // Payload: `{ reason, keys }` — `keys` is exactly what changed, so the JS
    // side folds those records in rather than rebuilding from the whole store.
    // Rebuilding would delete anything this device holds that has never been
    // pushed, which is every record created while sync was off.
    Events("onChange")

    /// Whether this app can use the key-value store at all.
    ///
    /// `synchronize()` is the only documented probe for it: it returns false
    /// when the app was not built with the right entitlement requests. It is
    /// cheap and idempotent — the system already flushes at its own convenience,
    /// so calling it here forces nothing that was not going to happen anyway.
    ///
    /// NOT `FileManager.ubiquityIdentityToken`, which this used to be and which
    /// made the toggle permanently grey on every device and in every build. That
    /// token is the iCloud *Drive Documents* identity and needs a ubiquity
    /// CONTAINER — `com.apple.developer.ubiquity-container-identifiers` plus
    /// `CloudDocuments` in `icloud-services`. SubEye has neither and wants
    /// neither: it stores no files, and an iCloud Drive folder is a wider
    /// promise than "it stays on your phone". It holds the key-value
    /// entitlement, which is the correct one for this module and the wrong one
    /// for that token, so the token was nil whether or not anyone was signed in.
    ///
    /// The cost is that this no longer proves an ACCOUNT is signed in — with
    /// none, writes are accepted and dropped. That is covered on the JS side
    /// instead: `observeCloud` switches sync off on `ACCOUNT_CHANGE`, and
    /// enabling against an empty store merges nothing.
    Function("isAvailable") { () -> Bool in
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    /// Every string value currently in the store. Non-string values are skipped
    /// rather than coerced — nothing but this module writes here, so a value of
    /// another type is a foreign key, not ours to interpret.
    Function("snapshot") { () -> [String: String] in
      var out: [String: String] = [:]
      for (key, value) in NSUbiquitousKeyValueStore.default.dictionaryRepresentation {
        if let string = value as? String {
          out[key] = string
        }
      }
      return out
    }

    /// One batched write. `synchronize` only schedules the upload — it returns
    /// false when there is no account or no entitlement, which is the one signal
    /// that separates "queued" from "went nowhere".
    Function("apply") { (sets: [String: String], removals: [String]) -> Bool in
      let store = NSUbiquitousKeyValueStore.default
      for (key, value) in sets {
        store.set(value, forKey: key)
      }
      for key in removals {
        store.removeObject(forKey: key)
      }
      return store.synchronize()
    }

    OnStartObserving {
      // `synchronize` on start is what pulls anything that landed while the app
      // was not running; the notification below only covers changes that arrive
      // while it is.
      NSUbiquitousKeyValueStore.default.synchronize()

      self.observer = NotificationCenter.default.addObserver(
        forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
        object: NSUbiquitousKeyValueStore.default,
        queue: .main
      ) { [weak self] notification in
        let info = notification.userInfo
        let reason = info?[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int ?? -1
        let keys = info?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        self?.sendEvent("onChange", ["reason": reason, "keys": keys])
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }
  }
}
