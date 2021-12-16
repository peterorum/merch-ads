const { log } = require("console");
const fs = require("fs");
const { exit, argv } = require("process");

// if (!argv[2]) {
//   console.log("Missing command");
//   exit(1);
// }

// tab-separated file
const dataFile = "data/data.txt";

let headings = "";

const loadData = () => {
  const dataText = fs.readFileSync(dataFile).toString().split("\r\n");

  const data = dataText
    .map((d) => d.split("\t"))
    .map((d) => {
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
    });

  const [headings1, ...data1] = data;

  headings = headings1; // global

  // convert numeric fields
  const data2 = data1.map((d) => {
    return {
      ...d,
      maxBid: d.maxBid ? parseFloat(d.maxBid) : d.maxBid,
    };
  });

  return data2;
};

// create database array indexed by campaign name

const createDb = (data) => {
  // just campaign records
  const campaigns = data.filter((d) => d.recordType === "Campaign");

  // add Ad Groups under campaigns

  campaigns.forEach((c) => {
    c.adGroups = data.filter(
      (d) => d.campaign === c.campaign && d.recordType == "Ad Group"
    );
  });

  return campaigns;
};

// lower auto bids

const lowerAutoBids = (db, bid) => {
  const autoCampaigns = db.filter((d) => d.campaignTargetingType === "Auto");

  autoCampaigns.forEach((c) => {
    // set maxBid to max 0.20
    c.adGroups.forEach((ag) => {
      ag.maxBid = Math.min(ag.maxBid, bid);
    });
  });

  // console.log(autoCampaigns.find(c => c.campaign === 'Write 20 A'));

  return autoCampaigns;
};

//--------- dump as text for Excel

const outputRecord = (d) => 
{
      // prettier-ignore
      const s = `${d.recordId}\t${d.recordType}\t${d.campaignId}\t${d.campaign}\t${d.campaignDailyBudget}\t${d.portfolioId}\t${d.campaignStartDate}\t${d.campaignEndDate}\t${d.campaignTargetingType}\t${d.adGroup}\t${d.maxBid.toString()}\t${d.keywordOrProductTargeting}\t${d.productTargetingId}\t${d.matchType}\t${d.asin}\t${d.campaignStatus}\t${d.adGroupStatus}\t${d.status}\t${d.impressions}\t${d.clicks}\t${d.spend}\t${d.orders}\t${d.totalUnits}\t${d.sales}\t${d.acos}\t${d.biddingStrategy}\t${d.placementType}\t${d.increaseBidsByPlacement}\t`

      console.log(s);
  
}
const outputAdGroups = (db) => {
  outputRecord(headings)

  db.forEach((d) => {
    d.adGroups.forEach((ag) => {
      outputRecord(ag)
    });
  });
};
//---------

const data = loadData();

const db = createDb(data);

const db2 = lowerAutoBids(db, 0.2);

outputAdGroups(db2);
