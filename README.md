# merch-ads
Bulk processing of Amazon ads as a csv.

Apply rules to Amazon Bulk Edit xslx files imported as csvs, with output as csv to be converted to xslx & uploaded to Amazon.

Specific rules for my own use. Use at your own risk.

Redirect the output to a text file. Open that file in VSCode, copy and paste it into a blank sheet in Excel after first formatting all cells in that sheet to Text.

## Weekly process

*Create test & performance campaigns from search term orders*

1. Download Bulk data for 30 days, including Zero Impression campaigns.
2. Save it as text as data/data.txt
3. Download Report - Sponsored Products, Daily, Last 30 Days.
4. Save it as text as data/sales.txt
5. Run node merch-ads --promote > /tmp/promote.txt
6. open /tmp/promote.txt
7. Copy & paste into a new Excel sheet that has been all formatted as Text.
8. Upload to Amazon Ads.

## Recipes

--impress
If campaign is 3 days or older
For each target that has < 50 impressions
Increase bid by 10%


TODO:

(Based on targets eg 4 targets in auto)

Boost good performers
If orders > 1 & acos < target acos, up bid by 10%

Decrease poor performers
If orders > 1 & acos > target acos, decrease bid by 10%. OR base it on how high the acos is.
    ACOS    Decrease
    30-40%  -10%
    40-50%  -15%
    50+%    -20%
    Keep changes incremental

Pause zero order campaign targets
Orders = 0 & Clicks > 20-40 -> pause. Or gradually reduce bid before pausing.

Pause single order campaigns, but wait for more clicks
Orders = 0 & Clicks > 50-80, ACOS > 80-100& (optional) -> pause. Or gradually reduce bid before pausing.
