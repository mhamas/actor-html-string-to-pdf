import Apify from 'apify';
import { PDFOptions }  from 'puppeteer';

Apify.main(async () => {
    const { htmlString }: any = await Apify.getInput();

    const browser = await Apify.launchPuppeteer({headless: true} as any);
    const page = await browser.newPage();
    await page.setContent(htmlString);

    const pdfOptions: PDFOptions = {
        "format": "A4",
        displayHeaderFooter: true,
        headerTemplate: "<div/>",
        footerTemplate: "<div style=\"text-align: right;width: 297mm;font-size: 8px;\"><span style=\"margin-right: 1cm\">Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></span></div>",
        margin: {  top: "1cm", bottom: "1cm" }
    }

    const pdfBuffer = await page.pdf(pdfOptions);

    await Apify.setValue('OUTPUT', pdfBuffer, { contentType: 'application/pdf' });

    const storeId = process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID;

    // NOTE: Adding disableRedirect=1 param, because for some reason Chrome doesn't allow pasting URLs to PDF
    // that redirect into the browser address bar
    Apify.utils.log.info('PDF file has been stored to:');
    Apify.utils.log.info(`https://api.apify.com/v2/key-value-stores/${storeId}/records/OUTPUT?disableRedirect=1`);
});
