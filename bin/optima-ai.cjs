#!/usr/bin/env node
"use strict";
import("./optima.js").catch((err) => {
  console.error(err);
  process.exit(1);
});
