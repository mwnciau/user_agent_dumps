#!/usr/bin/env node

import fs from 'fs';
import { UAParser } from 'ua-parser-js';
import { isBot   } from 'ua-parser-js/bot-detection';

const INPUT_FILE = process.argv[2];
const OUTPUT_FILE = process.argv[3];

// Helper function to extract major version
const getMajorVersion = (versionString) => {
  return versionString ? versionString.split('.')[0] : 'Unknown';
};

function parseUserAgentsFile() {
  // 1. Read and parse the input JSON file
  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  const parsedData = JSON.parse(rawData);

  if (!parsedData.userAgents || !Array.isArray(parsedData.userAgents)) {
    throw new Error("Input file format is incorrect. Expected a hash containing a `userAgents` key` containing an array of strings.");
  }
  const userAgents = parsedData.userAgents;

  // 2. Map over the array and parse each user agent
  const processedData = userAgents.map((uaData) => {
    const userAgent = uaData.userAgent;

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Remove inconsistent Mobile prefix from browser name
    let browser = result.browser.name?.replace(/^Mobile /, '');

    return {
      ...uaData,
      browser: browser || 'Unknown',
      browserMajorVersion: getMajorVersion(result.browser.version),
      engine: result.engine.name || 'Unknown',
      engineMajorVersion: getMajorVersion(result.engine.version),
      os: result.os.name || 'Unknown',
      isBot: isBot(userAgent)
    };
  });

  parsedData.userAgents = processedData;

  // 3. Save the results back to a new JSON file (formatted with 2-space indentation)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsedData, null, 2), 'utf8');

  console.log(`Successfully processed ${processedData.length} user agents!`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
}

// Run the script
parseUserAgentsFile();
