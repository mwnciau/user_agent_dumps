# Intoli User Agents

See [intoli/user-agents](https://github.com/intoli/user-agents).

> User-Agents is a JavaScript package for generating random User Agents based on how frequently they're used in the wild. A new version of the package is automatically released every day, so the data is always up to date. The generated data includes hard to find browser-fingerprint properties, and powerful filtering capabilities allow you to restrict the generated user agents to fit your exact needs.

The source data for this user-agent generation library (see `src/user-agents.json.gz` has been downloaded and aggregated into month-long chunks.

Note that the data is gzipped before committing to git as these datasets are very large.

## Downloading the latest data

Requirements:

* Node.js
* A GitHub token

To download the data for the last full calendar month, run:

```bash
GITHUB_TOKEN=... node download_and_agregate.js
```
