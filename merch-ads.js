const { log } = require("console");
const fs = require("fs");
const { exit, argv } = require("process");

if (!argv[2]) {
  console.log("Missing command");
  exit(1);
}

// tab-separated file
const dataFile = "data/data.txt";

const loadData = () => {
  const dataText = fs.readFileSync(dataFile).toString().split("\r\n");

  const [, ...dataTab] = dataText;

  const data = dataTab
    .map((d) => d.split('\t'))
    .map(
      (d  => {
        const [
          recordId,
          recordType,
          campaignId,
          campaign,
          campaignDailyBudget,
          portfolioId,
          campaignStartDate,
          campaignEndDate,
          campaignTargetingType,
          adGroup,
          maxBid,
          keywordOrProductTargeting,
          productTargetingId,
          matchType,
          asin,
          campaignStatus,
          adGroupStatus,
          status,
          impressions,
          clicks,
          spend,
          orders,
          totalUnits,
          sales,
          acos,
          biddingStrategy,
          placementType,
          increaseBidsByPlacement,
        ] = d;

        return {
          recordId,
          recordType,
          campaignId,
          campaign,
          campaignDailyBudget,
          portfolioId,
          campaignStartDate,
          campaignEndDate,
          campaignTargetingType,
          adGroup,
          maxBid,
          keywordOrProductTargeting,
          productTargetingId,
          matchType,
          asin,
          campaignStatus,
          adGroupStatus,
          status,
          impressions,
          clicks,
          spend,
          orders,
          totalUnits,
          sales,
          acos,
          biddingStrategy,
          placementType,
          increaseBidsByPlacement,
        };
      })
    );

  return data;
};

const data = loadData();


