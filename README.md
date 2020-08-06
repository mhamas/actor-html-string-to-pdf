# Apify Actor - Website Backup

## Description

The purpose of this actor is to enable creation of website backups by recursively crawling them. For example, we’d use it to make regular backups of https://blog.apify.com/, so that we don’t lose any content by accident. Although such backup cannot be automatically restored, it’s better than losing data completely.

Given URL entry points, the actors recursively crawls the links found on the pages using a provided CSS selector and create a separate [`MHTML`](https://en.wikipedia.org/wiki/MHTML) snapshot of each page. Each snapshot is taken after the full page is rendered with [Puppeteer crawler](https://sdk.apify.com/docs/examples/puppeteer-crawler) and includes all the content such as images and CSS. Hence, it can be used on any HTML / JS / Wordpress web sites which don't require authentication.

## Input parameters
| Field  | Type  | Description  |
|---|---|---|
| startURLs  |  array | List of URL entry points  |
| linkSelector  | string  | CSS selector matching elements with 'href' attributes that should be enqueued  |
| maxRequestsPerCrawl  |  integer |  The maximum number of pages that the scraper will load. The scraper will stop when this limit is reached. It's always a good idea to set this limit in order to prevent excess platform usage for misconfigured scrapers. Note that the actual number of pages loaded might be slightly higher than this value.If set to <code>0</code>, there is no limit. |
| maxCrawlingDepth | integer | Defines how many links away from the StartURLs will the scraper descend. 0 means unlimited. |
maxConcurrency | integer | Defines how many pages can be processed by the scraper in parallel. The scraper automatically increases and decreases concurrency based on available system resources. Use this option to set a hard limit. |
customKeyValueStore | string | Use custom named key value store for saving results. If the key value store with this name doesn't yet exist, it's created. The snapshots of the pages will be saved in the key value store. |
customDataset | string | Use custom named dataset for saving metadata. If the dataset with this name doesn't yet exist, it's created. The metadata about the snapshots of the pages will be saves in the dataset. |
proxyConfiguration | object | Choose to use no proxy, Apify Proxy, or provide custom proxy URLs. |
sameOrigin | boolean | Only backup URLs with the same origin as any of the start URL origins. E.g. when turned on for a single start URL <code>https://blog.apify.com</code>, only links with prefix <code>https://blog.apify.com</code> will be backed up recursively. |
timeoutForSingleUrlInSeconds | integer | Timeout in seconds for doing a backup of a single URL. Try to increase this timeout in case you see an error <code> Error: handlePageFunction timed out after X seconds. </code>. |
navigationTimeoutInSeconds | integer | Timeout in seconds in which the navigation needs to finish. Try to increase this if you see an error <code>Navigation timeout of XXX ms exceeded </code>| 
searchParamsToIgnore | array | Names of URL search parameters (such as 'source', 'sourceid', etc.) that should be ignored in the URLs when crawling. |


## Output

Single zip file containing `MHTML` snapshot and its metadata is stored in a key value store (`default` or `named` depending on the input argument) for each URL visited. The key for each zip file includes a timestamp, URL hash and the URL in a human readable form. Note that the Apify platform only supports certain characters and limits the length of the key to 256 characters (that is why e.g. `/` is removed). Apart from the key value store, metadata for the crawled webpages are also stored in a dataset (`default` or `named`).

## Compute unit consumption
An example run which did a backup of 323 webpages under <a href='blog.apify.com'>blog.apify.com</a>, configured with 8192 Mb of memory and lasting 12 minutes consumed 1.6617 compute units.

