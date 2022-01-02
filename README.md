# Carnival cruise ships scraping

## Commands

### Launch page scraping limited
```
npm run scraping
```

### Launch page scraping unlimited
```
npm run scraping:unlimited
```

## Arguments
```
--limit
```

# How to start?

1. Use "npm install --save" in order to install al project dependencies.

2. You can use "npm run scraping" or "npm run scraping:unlimited" commands to execute index.js file. This project has an restriction to open multiple pages to get its data, it is limited to 1. You can disable this restriction using "npm run scraping:unlimited" and all pages will be open at same time and the process will be faster. However, it could fail if your internet or your machine is no good enough. Also, you can set a fixed limit by using the argument "--limit=LimitNumber" an example could be "npm run scraping -- --limit=20".

3. You can find all data founded in a file named "data.json" that will be created after all process is finished.
