# User Agent Dumps

A repository that aggregates useful user agent dumps into one place.

This additional code in this repository is MIT licensed. See license files in each directory for licenses related to the data.

## Parse output

The `parse_ua.js` script can be used to parse the user agent dumps and add additional details using the `ua-parser-js` library: the browser name, its major version, the browser engine, its major version, the OS and whether it is a bot.

```shell
# Install the `ua-parser-js` dependency
npm install

# Run the parse script against the top user agents dump
./parse_ua.js top_user_agents/user_agents.json top_user_agents/user_agents_parsed.json
```
