#!/usr/bin/env node

import { writeFileSync } from 'fs'

const OUTPUT_FILE = 'user_agents.json'
const REPO = 'microlinkhq/top-user-agents'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN // optional but recommended to avoid rate limits

const FILES = [
  'src/index.json',
  'index.json'
]

function githubHeaders () {
  const headers = { Accept: 'application/vnd.github+json' }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  return headers
}

async function getCommitHashes (filePath) {
  const hashes = []
  let url = `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(filePath)}&per_page=100`

  while (url) {
    const res = await fetch(url, { headers: githubHeaders() })
    if (!res.ok) throw new Error(`Failed to list commits for ${filePath}: ${res.status} ${res.statusText}`)
    const commits = await res.json()
    for (const c of commits) hashes.push(c.sha)

    // follow Link: <...>; rel="next" pagination
    const link = res.headers.get('link') ?? ''
    const next = link.match(/<([^>]+)>;\s*rel="next"/)
    url = next ? next[1] : null
  }

  return hashes
}

async function fetchFileAtCommit (sha, filePath) {
  const url = `https://raw.githubusercontent.com/${REPO}/${sha}/${filePath}`
  const res = await fetch(url, { headers: githubHeaders() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${filePath}@${sha}`)
  return res.text()
}

async function processCommits (hashes, filePath, counts) {
  for (let i = 0; i < hashes.length; i++) {
    const sha = hashes[i]
    const short = sha.slice(0, 8)
    const prefix = `  [${i + 1}/${hashes.length}] ${short}`

    const content = await fetchFileAtCommit(sha, filePath)
    if (content === null) {
      console.log(`${prefix} — skipped (file not found)`)
      continue
    }

    let agents
    try {
      agents = JSON.parse(content)
    } catch (e) {
      console.log(`${prefix} — skipped (JSON error: ${e.message})`)
      continue
    }

    let added = 0
    for (const agent of agents) {
      if (!counts.has(agent)) added++
      counts.set(agent, (counts.get(agent) ?? 0) + 1)
    }

    console.log(`${prefix} — ${agents.length} agents, ${added} new`)
  }
}

console.log(`Fetching commit history for ${REPO} via GitHub API...`)
if (!GITHUB_TOKEN) console.warn('Warning: GITHUB_TOKEN not set — unauthenticated requests are rate-limited to 60/hour\n')

const counts = new Map()

for (const filePath of FILES) {
  console.log(`\nFetching commits for ${filePath}...`)
  const hashes = await getCommitHashes(filePath)
  console.log(`Found ${hashes.length} commits.`)
  await processCommits(hashes, filePath, counts)
}

const sorted = [...counts.entries()]
  .map(([userAgent, count]) => ({ userAgent, count }))
  .sort((a, b) => b.count - a.count)

const withMetaData = {
  description: "A weekly list of the top 100 user-agent strings most used over the Internet, aggregated into one file.",
  source: "https://github.com/microlinkhq/top-user-agents",
  license: "The MIT License (MIT)\n\nCopyright © 2020 Kiko Beats <josefrancisco.verdu@gmail.com> (kikobeats.com)\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in\nall copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\nTHE SOFTWARE.",
    userAgents: sorted,
}

writeFileSync(OUTPUT_FILE, JSON.stringify(withMetaData, null, 2))
console.log(`\nDone! ${counts.size} unique user agents written to ${OUTPUT_FILE}`)
