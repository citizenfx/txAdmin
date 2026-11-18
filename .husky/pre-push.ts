#!/usr/bin/env bun
import { readFileSync } from 'node:fs';

//MARK: Configs
const protectedBranchPrefixRegex = /^(experiments?|mock(up)?s?|private)\//;
const allowedRemoteName = 'git.fivem.net';

//MARK: Parsing push data
const remoteName = process.argv[2] ?? '';
const remoteUrl = process.argv[3] ?? '';

//No restrictions on the allowed remote
if (remoteName === allowedRemoteName) {
    process.exit(0);
}

// Read refs being pushed from stdin.
const stdin = readFileSync(0, 'utf8');
const lines = stdin.split('\n').map((l) => l.trim()).filter(Boolean);

const blocked: string[] = [];
for (const line of lines) {
    //Parse line
    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;
    const [localRef, localSha, remoteRef, remoteSha] = parts;

    // Check branches
    if (!localRef.startsWith('refs/heads/')) continue;
    const branch = localRef.slice('refs/heads/'.length);
    if (protectedBranchPrefixRegex.test(branch)) {
        blocked.push(branch);
    }
}

//MARK: Output
if (!blocked.length) {
    process.exit(0);
}

//Oh noooo :(
const msg = [
    `❌ Push blocked: these branches may only be pushed to ${allowedRemoteName}.`,
    `Remote: ${remoteName} (${remoteUrl})`,
    `Blocked branches:`,
    ...blocked.map((b) => `  - ${b}`),
    ``,
    `Fix: push to ${allowedRemoteName}.`
].join('\n');
process.stderr.write(msg);
process.exit(1);
