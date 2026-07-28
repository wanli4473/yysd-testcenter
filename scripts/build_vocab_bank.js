#!/usr/bin/env node
"use strict";
/** Build / refresh vocab_bank from LIST HTML files. */
var path = require("path");
var fs = require("fs");
var serverDir = path.join(__dirname, "..", "server");
var repoRoot = path.join(__dirname, "..");
var Database = require(path.join(serverDir, "node_modules", "better-sqlite3"));
var diagnostic = require(path.join(serverDir, "diagnostic"));

var dataDir = path.join(serverDir, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
var db = new Database(path.join(dataDir, "yysd.db"));
diagnostic.ensureSchema(db);
var counts = diagnostic.rebuildVocabBank(db, repoRoot);
console.log("[vocab_bank]", counts);
db.close();
