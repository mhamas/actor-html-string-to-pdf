import Apify from 'apify';
import { triggerAsyncId } from 'async_hooks';

Apify.main(async () => {
    const { htmlString }: { htmlString: string } = await Apify.getInput();

    const browser = await Apify.launchPuppeteer();
    const page = await browser.newPage();
    page.content.setHTML(htmlString);

    const pdfOptions = {
        "format": "a4"
    }

    const pdfBuffer = await page.pdf(pdfOptions);

    await Apify.setValue('OUTPUT', pdfBuffer, { contentType: 'application/pdf' });

    const storeId = process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID;
    
    // NOTE: Adding disableRedirect=1 param, because for some reason Chrome doesn't allow pasting URLs to PDF
    // that redirect into the browser address bar
    Apify.utils.log('PDF file has been stored to:');
    Apify.utils.log(`https://api.apify.com/v2/key-value-stores/${storeId}/records/OUTPUT?disableRedirect=1`);
});
