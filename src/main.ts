import Apify from 'apify';
import JSZip from 'jszip';
import CryptoJS from 'crypto-js';

const DEPTH_KEY = 'depth';

function uidFromURL(urlString: string, timestamp: string): string {
    // Only following characters are allowed in keys by Apify platform
    const allowedCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!-_.\'()/';

    const url = new URL(urlString);
    const hash = CryptoJS.MD5(urlString).toString(CryptoJS.enc.Base64);

    // Replace all '/' by '_' and prefix with timestamp
    let uid = `${timestamp}__${hash}__${url.href}`.replace(/\//g, '');

    // Filter out characters that are not allowed
    uid = uid.split('').filter((char) => allowedCharacters.includes(char)).join('');

    // Return first 256 characters of uid as it's the limit of the Apify platform
    return uid.slice(0, 256);
}

function removeSearchParamsFromUrl(urlString: string, paramsToRemove: string[]): string {
    const url = new URL(urlString);
    for (const param of paramsToRemove) {
        url.searchParams.delete(param);
    }
    return url.toString();
}

Apify.main(async () => {
    const {
        startURLs,
        maxRequestsPerCrawl,
        maxCrawlingDepth,
        maxConcurrency,
        linkSelector,
        customKeyValueStore,
        customDataset,
        sameOrigin,
        timeoutForSingleUrlInSeconds,
        navigationTimeoutInSeconds,
        searchParamsToIgnore,
        proxyConfiguration,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any = await Apify.getInput();
    const requestQueue = await Apify.openRequestQueue();
    for (const startURL of startURLs) {
        await requestQueue.addRequest(startURL);
    }

    // We use pseudoURLs feature of Pupeteer crawler to enforce sameOrigin
    const pseudoURLs: string[] = [];
    if (sameOrigin) {
        for (const startURL of startURLs) {
            const url = new URL(startURL.url);
            pseudoURLs.push(`${url.origin}/[.*]`);
        }
    }

    const handlePageFunction: Apify.PuppeteerHandlePage = async ({ request, page }: Apify.PuppeteerHandlePageInputs) => {
        const timestamp = `${new Date().toISOString()}`;

        const uid = uidFromURL(request.url, timestamp);
        Apify.utils.log.info(`Creating backup of ${request.url} under id ${uid}`);

        // Create mhtml snapshot of the current URL and store in into key value store
        const session = await page.target().createCDPSession();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: snapshot } = await session.send('Page.captureSnapshot', { format: 'mhtml' }) as any;

        const filename = `${uid}.mhtml`;
        const metadata = {
            name: filename,
            url: request.url,
            timestamp,
        };

        // Store backup and metadata into a zip file
        const zip = new JSZip();
        const folder = zip.folder(uid);
        folder!.file(filename, snapshot);
        folder!.file('metadata.json', JSON.stringify(metadata));

        const zipDataToWrite = await zip.generateAsync({ type: 'nodebuffer' });

        const store = customKeyValueStore
            ? await Apify.openKeyValueStore(customKeyValueStore)
            : await Apify.openKeyValueStore();

        await store.setValue(
            uid,
            zipDataToWrite,
            { contentType: 'application/zip' },
        );

        const dataset = customDataset
            ? await Apify.openDataset(customDataset)
            : await Apify.openDataset();

        await dataset.pushData({
            name: filename,
            url: request.url,
            timestamp,
        });

        const currentDepth = request.userData[DEPTH_KEY] || 1;
        if (maxCrawlingDepth && maxCrawlingDepth > 0 && currentDepth >= maxCrawlingDepth) {
            return;
        }
        await Apify.utils.enqueueLinks({
            page,
            selector: linkSelector,
            requestQueue,
            pseudoUrls: pseudoURLs,
            transformRequestFunction: (req: Apify.RequestOptions) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (req.userData as any)[DEPTH_KEY] = currentDepth + 1;
                if (searchParamsToIgnore.length > 0) {
                    req.url = removeSearchParamsFromUrl(req.url, searchParamsToIgnore);
                }
                return req;
            },
        });
    };

    const proxyConfigurationObject = await Apify.createProxyConfiguration(proxyConfiguration);
    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        handlePageFunction,
        proxyConfiguration: proxyConfigurationObject,
        maxRequestsPerCrawl,
        maxConcurrency,
        handlePageTimeoutSecs: timeoutForSingleUrlInSeconds,
        gotoTimeoutSecs: navigationTimeoutInSeconds,
    });

    await crawler.run();
});
