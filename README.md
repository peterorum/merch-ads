# merch-ads
Bulk processing of Amazon ads as a csv.

Apply rules to Amazon Bulk Edit xslx files imported as csvs, with output as csv to be converted to xslx & uploaded to Amazon.

Specific rules for my own use. Use at your own risk.

Redirect the output to a text file. Open that file in VSCode, copy and paste it into a blank sheet in Excel after first formatting all cells in that sheet to Text.

## Weekly process

*Create test & performance campaigns from search term orders*

--promote

1. Download Bulk data for 60 days, including Zero Impression campaigns.
2. Save it as text as data/data.txt
3. Download Report - Sponsored Products, Daily, Last 30 Days.
4. Save it as text as data/sales.txt
5. Run node merch-ads --promote
6. open /tmp/results.txt
7. Copy & paste into a new Excel sheet that has been all formatted as Text.
8. Upload to Amazon Ads.

## Recipes

These use Bulk data for 60 days, including Zero Impression campaigns

--impress
If campaign is 3 days or older
For each target that has < 50 impressions
Increase bid by 10%

--unsold
Reduce bids on targets that have had many clicks but zero or one sale

--performers
Increase or decrease bids for good sellers pased on ACoS.

--clickless
Decrease bids for low CTR

# TODO

If all targets in a campaign are paused, look at deleting product.