#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { gunzipSync } from 'zlib'

const REPO = 'intoli/user-agents'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN // optional but recommended to avoid rate limits

const FILE_PATH = 'src/user-agents.json.gz'

// Calculate dates for the past full calendar month
const now = new Date()
// Subtracting 1 from the month handles the year rollover automatically in JavaScript
const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
const targetYear = targetDate.getUTCFullYear()
const targetMonthIndex = targetDate.getUTCMonth()

// First day of the target month (00:00:00 UTC)
const sinceDate = new Date(Date.UTC(targetYear, targetMonthIndex, 1, 0, 0, 0))
// Last day of the target month (23:59:59 UTC, utilizing day 0 of the next month)
const untilDate = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0, 23, 59, 59, 999))

const since = sinceDate.toISOString()
const until = untilDate.toISOString()

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
const monthName = monthNames[targetMonthIndex]


function githubHeaders () {
  const headers = { Accept: 'application/vnd.github+json' }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  return headers
}


async function getCommitHashes (filePath) {
  const hashes = []
  let url = `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(filePath)}&since=${since}&until=${until}&per_page=100`

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

  // Parse the gzipped file as an arrayBuffer and decompress it via zlib
  const buffer = await res.arrayBuffer()
  return gunzipSync(Buffer.from(buffer)).toString('utf-8')
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
    for (const obj of agents) {
      // Access the user agent via the "userAgent" key
      const agent = obj.userAgent
      if (!agent) continue

      if (!counts.has(agent)) added++
      counts.set(agent, (counts.get(agent) ?? 0) + Math.round(1000000* obj.weight))
    }

    console.log(`${prefix} — ${agents.length} agent records, ${added} new unique agents`)
  }
}

console.log(`Fetching commit history for ${REPO} for ${monthName} ${targetYear}...`)
if (!GITHUB_TOKEN) console.warn('Warning: GITHUB_TOKEN not set — unauthenticated requests are rate-limited to 60/hour\n')

const counts = new Map()

console.log(`\nFetching commits for ${FILE_PATH}...`)
const hashes = await getCommitHashes(FILE_PATH)
console.log(`Found ${hashes.length} commits in ${monthName} ${targetYear}.`)
await processCommits(hashes, FILE_PATH, counts)

const sorted = [...counts.entries()]
  .map(([userAgent, count]) => ({ userAgent, count }))
  .sort((a, b) => b.count - a.count)

const withMetaData = {
  description: `A list of user-agent strings extracted from the intoli/user-agents repository for ${monthName} ${targetYear}.`,
  source: `https://github.com/${REPO}`,
  license: "2-Clause BSD License\n\nCopyright 2018-present - Intoli, LLC\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n1. Redistributions of source code must retain the above copyright notice, this\nlist of conditions and the following disclaimer.\n\n2. Redistributions in binary form must reproduce the above copyright notice,\nthis list of conditions and the following disclaimer in the documentation\nand/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\" AND\nANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\nWARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\nFOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\nDAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\nCAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\nOR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.",
  month: monthName,
  year: targetYear,
  userAgents: sorted,
}

const output_file = `user_agents_${monthName}_${targetYear}.json`.toLocaleLowerCase();

writeFileSync(output_file, JSON.stringify(withMetaData, null, 2))
console.log(`\nDone! ${counts.size} unique user agents written to ${output_file}`)
