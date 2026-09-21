#!/usr/bin/env node
/**
 * CJS bin shim — npm publish rejects ESM .js bins when package.json has "type":"module".
 */
"use strict";
import("./optima.js").catch((err) => {
  console.error(err);
  process.exit(1);
});
