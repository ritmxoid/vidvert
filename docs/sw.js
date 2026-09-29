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
    "revision": "f475f328864bcae730790507cf1a68c8"
  }, {
    "url": "pwa-192x192.png",
    "revision": "edd8322dd3b975a60e3349fa2a54ae62"
  }, {
    "url": "index.html",
    "revision": "e80ce68a02062955154ea070d2de0699"
  }, {
    "url": "icon.svg",
    "revision": "bd9e5a1956643590e74a22d5373bf649"
  }, {
    "url": "favicon.ico",
    "revision": "862bf0b5b8d8ca5aa798bfce57a9ed87"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "3ca33497be81ed03f39d73da9985dea3"
  }, {
    "url": "assets/index-DH_n3X3s.css",
    "revision": null
  }, {
    "url": "assets/index-7p2i3C1y.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "3ca33497be81ed03f39d73da9985dea3"
  }, {
    "url": "favicon.ico",
    "revision": "862bf0b5b8d8ca5aa798bfce57a9ed87"
  }, {
    "url": "icon.svg",
    "revision": "bd9e5a1956643590e74a22d5373bf649"
  }, {
    "url": "pwa-192x192.png",
    "revision": "edd8322dd3b975a60e3349fa2a54ae62"
  }, {
    "url": "pwa-512x512.png",
    "revision": "f475f328864bcae730790507cf1a68c8"
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
