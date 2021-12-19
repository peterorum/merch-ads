const { log } = require("console");
const fs = require("fs");
const { exit, argv } = require("process");

// tab-separated file
const dataFile = "data/data.txt";

// load data exported from Excel as a tsv

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

  const [headings, ...data1] = data;

  outputRecord(headings);

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
  // TODO: don't do this - keep flat

  // campaigns.forEach((c) => {
  //   c.adGroups = data.filter(
  //     (d) => d.campaign === c.campaign && d.recordType == "Ad Group"
  //   );
  // });

  return campaigns;
};

// lower auto bids

const lowerAutoBids = (db, bid) => {
  console.log("TODO: Treat as flat");
  exit(1);

  // find all auto campaigns
  const autoCampaigns = db.filter((d) => d.campaignTargetingType === "Auto");

  // set maxBid to new bid if smaller

  autoCampaigns.forEach((c) => {
    c.adGroups.forEach((ag) => {
      ag.maxBid = Math.min(ag.maxBid, bid);
    });
  });

  return autoCampaigns;
};

//--------- dump as text for Excel

const outputRecord = (d) => {
  // prettier-ignore
  const s = `${d.recordId}\t${d.recordType}\t${d.campaignId}\t${d.campaign}\t${d.campaignDailyBudget}\t${d.portfolioId}\t${d.campaignStartDate}\t${d.campaignEndDate}\t${d.campaignTargetingType}\t${d.adGroup}\t${d.maxBid}\t${d.keywordOrProductTargeting}\t${d.productTargetingId}\t${d.matchType}\t${d.asin}\t${d.campaignStatus}\t${d.adGroupStatus}\t${d.status}\t${d.impressions}\t${d.clicks}\t${d.spend}\t${d.orders}\t${d.totalUnits}\t${d.sales}\t${d.acos}\t${d.biddingStrategy}\t${d.placementType}\t${d.increaseBidsByPlacement}\t`

  console.log(s);
};
const outputRecords = (db) => {

  // db.forEach((d) => {
  //   d.adGroups.forEach((ag) => {
  //     outputRecord(ag);
  //   });
  // });

  db.forEach((d) => {
    outputRecord(d);
  });
};

//--------- add negative keywords

const addNegativeKeywords = (data, niche,  wordFile) => {
  const campaigns = data.filter((d) => d.recordType === "Campaign");
  let autoCampaigns = db.filter((d) => d.campaignTargetingType === "Auto");

  if (niche) {
    autoCampaigns = autoCampaigns.filter(c => c.campaign.startsWith(niche));
  }

  if (!autoCampaigns.length) {
    console.log(`No campaigns found for ${niche}`);
    exit(1);
  }
  const words = fs.readFileSync(wordFile).toString().split("\n");

  // for each campaign, create a negative record

  let negativeRecords = [];

  autoCampaigns.forEach((campaign) => {
    words.forEach((word) => {
      const keywordRecord = {
        recordId: "",
        recordType: "Keyword",
        campaignId: campaign.campaignId,
        campaign: campaign.campaign,
        campaignDailyBudget: "",
        portfolioId: "",
        campaignStartDate: "",
        campaignEndDate: "",
        campaignTargetingType: "",
        adGroup: "",
        maxBid: "",
        keywordOrProductTargeting: word,
        productTargetingId: "",
        matchType: "campaign negative exact",
        asin: "",
        campaignStatus: "enabled",
        adGroupStatus: "",
        status: "enabled",
        impressions: 0,
        clicks: 0,
        spend: 0,
        orders: 0,
        totalUnits: 0,
        sales: 0,
        acos: "0%",
        biddingStrategy: "",
        placementType: "",
        increaseBidsByPlacement: "",
      };

      negativeRecords = [...negativeRecords, keywordRecord];
    });
  });

  outputRecords(negativeRecords);

};

//---------

const data = loadData();

const db = createDb(data);

switch (argv[2]) {
  case "--auto-bid": {
    const db2 = lowerAutoBids(db, 0.2);

    outputRecords(db2);

    break;
  }

  case "--neg": {
    // addNegativeKeywords(data, "", "data/negative/all.txt");

    const niches = [
      // "Bridge", "Cats", 
      // "Martial Karate", 
      "Psychology", 
      // "Pizza", "Art Sketch", "Vego", "Write"
    ];

    niches.forEach(niche => {
      addNegativeKeywords(data, niche, `data/negative/${niche.toLowerCase()}.txt`);
    })
    

    break;
  }

  default: {
    console.log("--neg\t\tAdd negative keywords");
    console.log("--auto-bid\tSet bid for auto campaigns");
  }
}
