/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "aef8da3cb64a2895b1076a386a813fb6"
  }, {
    "url": "pwa-512x512.png",
    "revision": "7617adc70ca272e36cfc7248d85f9a16"
  }, {
    "url": "pwa-192x192.png",
    "revision": "1a804093c4f48eb716883f66ebca4f9b"
  }, {
    "url": "index.html",
    "revision": "8ab8f7afe78b8115c877c8695da02816"
  }, {
    "url": "icon.svg",
    "revision": "bd9e5a1956643590e74a22d5373bf649"
  }, {
    "url": "favicon.png",
    "revision": "7a5ab5c244dd4f1882b65dd39ac65f99"
  }, {
    "url": "favicon.ico",
    "revision": "c24dfa96b2c7f4d66e5f7d960d1a34d9"
  }, {
    "url": "favicon-32x32.png",
    "revision": "7a5ab5c244dd4f1882b65dd39ac65f99"
  }, {
    "url": "favicon-16x16.png",
    "revision": "5025cdceeee3a21c3f1f9f60bbcf3e07"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5d6406ae858931fa746a9df4e7af6cc6"
  }, {
    "url": "assets/index-moJVzkX6.css",
    "revision": null
  }, {
    "url": "assets/index-CY-VxWIf.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5d6406ae858931fa746a9df4e7af6cc6"
  }, {
    "url": "favicon.ico",
    "revision": "c24dfa96b2c7f4d66e5f7d960d1a34d9"
  }, {
    "url": "icon.svg",
    "revision": "bd9e5a1956643590e74a22d5373bf649"
  }, {
    "url": "pwa-192x192.png",
    "revision": "1a804093c4f48eb716883f66ebca4f9b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "7617adc70ca272e36cfc7248d85f9a16"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "aef8da3cb64a2895b1076a386a813fb6"
  }, {
    "url": "manifest.webmanifest",
    "revision": "87c270d27a0977e7a0e222be2ea7973b"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
