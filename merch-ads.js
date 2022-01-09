const { log, assert } = require("console");
const fs = require("fs");
const { exit, argv } = require("process");

const { differenceInDays, parse } = require("date-fns");

// tab-separated files
const dataFile = "data/data.txt";
const salesFile = "data/sales.txt";

const missingAsins = require("./data/missing-asins.json");

// min & maximum allowable $bid
const minimumBid = 0.02;
const maximumBid = 0.6;

const defaultBid = 0.2;

const targetAcos = 25;

// results file
let resultsFile = 0;

// for ease of creating a new record using spread operator

const blank = {
  recordId: "",
  recordType: "",
  campaignId: "",
  campaign: "",
  campaignDailyBudget: "",
  portfolioId: "",
  campaignStartDate: "",
  campaignEndDate: "",
  campaignTargetingType: "",
  adGroup: "",
  maxBid: "",
  keywordOrProductTargeting: "",
  productTargetingId: "",
  matchType: "",
  asin: "",
  campaignStatus: "",
  adGroupStatus: "",
  status: "",
  impressions: 0,
  clicks: 0,
  spend: 0,
  orders: 0,
  totalUnits: 0,
  sales: 0,
  acos: "",
  biddingStrategy: "",
  placementType: "",
  increaseBidsByPlacement: "",
};

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

  // convert numeric fields
  const data2 = data1.map((d) => {
    return {
      ...d,
      maxBid: d.maxBid ? parseFloat(d.maxBid) : d.maxBid,
      impressions: d.impressions ? parseFloat(d.impressions) : d.impressions,
      clicks: d.clicks ? parseFloat(d.clicks) : d.clicks,
      orders: d.orders ? parseFloat(d.orders) : d.orders,
      spend: d.spend ? parseFloat(d.spend) : d.spend,
      acos: d.acos ? parseFloat(d.acos.replace(/\%/, "")) : d.acos,
    };
  });

  return { data: data2, headings };
};

// debug log & exit
const dump = (s) => {
  console.log(s);
  exit(0);
};

// sales term summary report
const loadSales = () => {
  const salesText = fs.readFileSync(salesFile).toString().split("\r\n");

  const sales = salesText
    .map((d) => d.split("\t"))
    .map((d) => {
      const [
        date,
        portfolioName,
        currency,
        campaignName,
        adGroupName,
        targeting,
        matchType,
        customerSearchTerm,
        impressions,
        clicks,
        clickThruRate,
        costPerClick,
        spend,
        day14TotalSales,
        acos,
        roas,
        orders,
        day14TotalUnits,
        day14ConversionRate,
        day14AdvertisedASINUnits,
        day14BrandHaloASINUnits,
        day14AdvertisedASINSales,
        day14BrandHaloASINSales,
      ] = d;

      return {
        date,
        portfolioName,
        currency,
        campaignName,
        adGroupName,
        targeting,
        matchType,
        customerSearchTerm,
        impressions,
        clicks,
        clickThruRate,
        costPerClick,
        spend,
        day14TotalSales,
        acos,
        roas,
        orders,
        day14TotalUnits,
        day14ConversionRate,
        day14AdvertisedASINUnits,
        day14BrandHaloASINUnits,
        day14AdvertisedASINSales,
        day14BrandHaloASINSales,
      };
    });

  // skip headings
  const [, ...sales1] = sales;

  // convert relevant specific numeric fields
  const sales2 = sales1.map((d) => {
    return {
      ...d,
      orders: d.orders ? parseFloat(d.orders) : d.orders,
    };
  });

  return sales2;
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
  const s = `${d.recordId}\t${d.recordType}\t${d.campaignId}\t${d.campaign}\t${d.campaignDailyBudget}\t${d.portfolioId}\t${d.campaignStartDate}\t${d.campaignEndDate}\t${d.campaignTargetingType}\t${d.adGroup}\t${d.maxBid}\t${d.keywordOrProductTargeting}\t${d.productTargetingId}\t${d.matchType}\t${d.asin}\t${d.campaignStatus}\t${d.adGroupStatus}\t${d.status}\t${d.impressions}\t${d.clicks}\t${d.spend}\t${d.orders}\t${d.totalUnits}\t${d.sales}\t${d.acos}%\t${d.biddingStrategy}\t${d.placementType}\t${d.increaseBidsByPlacement}\t\n`

  // console.log(s);

  assert(resultsFile);

  resultsFile.write(s);
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

const addNegativeKeywords = (data, niche, wordFile) => {
  const campaigns = data.filter((d) => d.recordType === "Campaign");
  let autoCampaigns = db.filter((d) => d.campaignTargetingType === "Auto");

  if (niche) {
    autoCampaigns = autoCampaigns.filter((c) => c.campaign.startsWith(niche));
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

// create new campaign

const createManualCampaign = (name, portfolioId) => {
  const records = [];

  // header
  records.push({
    ...blank,
    campaign: name,
    recordType: "Campaign",
    campaignDailyBudget: "5",
    portfolioId: portfolioId,
    campaignTargetingType: "Manual",
    campaignStatus: "enabled",
    biddingStrategy: "Dynamic bidding (down only)",
    placementType: "All",
  });

  // placement
  records.push({
    ...blank,
    campaign: name,
    recordType: "Campaign By Placement",
    placementType: "Top of search (page 1)",
    increaseBidsByPlacement: "10%",
  });

  records.push({
    ...blank,
    campaign: name,
    recordType: "Campaign By Placement",
    placementType: "Rest of search",
    increaseBidsByPlacement: "",
  });

  records.push({
    ...blank,
    campaign: name,
    recordType: "Campaign By Placement",
    placementType: "Product pages",
    increaseBidsByPlacement: "0%",
  });

  return records;
};

//--------- add keywords

const createNewKeywordRecords = (
  newCampaign,
  newCampaignName,
  adGroup,
  customerSearchTerm,
  autoCampaign
) => {
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      recordType: "Keyword",
      campaign: newCampaignName,
      adGroup,
      keywordOrProductTargeting: customerSearchTerm,
      matchType: adGroup.toLowerCase(),
      campaignStatus: "enabled",
      adGroupStatus: "enabled",
      status: "enabled",
    },
  ];

  // add exact or phrase for auto campaign
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      recordType: "Keyword",
      campaignId: autoCampaign.campaignId,
      campaign: autoCampaign.campaign,
      keywordOrProductTargeting: customerSearchTerm,
      matchType:
        adGroup === "Exact"
          ? "campaign negative exact"
          : "campaign negative phrase",
      campaignStatus: "enabled",
      status: "enabled",
    },
  ];

  // if adding as broad, then add as neg exact to the broad campaign
  if (adGroup === "Broad") {
    newCampaign = [
      ...newCampaign,
      {
        ...blank,
        recordType: "Keyword",
        campaign: newCampaignName,
        keywordOrProductTargeting: customerSearchTerm,
        matchType: "campaign negative exact",
        campaignStatus: "enabled",
        status: "enabled",
      },
    ];
  }
  return newCampaign;
};

//--------- create broad test campaigns from current manual campaigns

const createTestCampaigns = (data) => {
  const campaigns = data.filter((d) => d.recordType === "Campaign");
  let manualCampaigns = campaigns.filter(
    (d) => d.campaignTargetingType === "Manual"
  );

  const generalNegatives = fs
    .readFileSync("data/negative/all.txt")
    .toString()
    .split("\n");

  // for each campaign, create a broad campaign from its negative keywords

  let newCampaigns = [];

  manualCampaigns.forEach((campaign) => {
    const keywords = data.filter(
      (c) => (c.campaignId === campaign.campaignId) & (c.matchType === "exact")
    );

    if (keywords.length) {
      const testCampaignName = campaign.campaign.replace(/M$/, "T");

      let newCampaign = createManualCampaign(
        testCampaignName,
        campaign.portfolioId
      );

      // adgroup
      newCampaign.push({
        ...blank,
        recordType: "Ad Group",
        campaign: testCampaignName,
        adGroup: "Broad",
        maxBid: "0.20",
        campaignStatus: "enabled",
        adGroupStatus: "enabled",
      });

      // ad

      const asin = data.find(
        (c) => c.campaignId === campaign.campaignId && c.recordType === "Ad"
      ).asin;

      newCampaign.push({
        ...blank,
        recordType: "Ad",
        campaign: testCampaignName,
        adGroup: "Broad",
        asin,
        campaignStatus: "enabled",
        adGroupStatus: "enabled",
        status: "enabled",
      });

      keywords.forEach((k) => {
        // add as broad

        newCampaign = [
          ...newCampaign,
          {
            ...blank,
            recordType: "Keyword",
            campaign: testCampaignName,
            keywordOrProductTargeting: k.keywordOrProductTargeting,
            matchType: "broad",
            campaignStatus: "enabled",
            adGroupStatus: "enabled",
            status: "enabled",
          },
        ];

        // also add as negative exact

        newCampaign = [
          ...newCampaign,
          {
            ...blank,
            recordType: "Keyword",
            campaign: testCampaignName,
            keywordOrProductTargeting: k.keywordOrProductTargeting,
            matchType: "campaign negative exact",
            campaignStatus: "enabled",
            status: "enabled",
          },
        ];

        // add general negatives

        generalNegatives.forEach((neg) => {
          newCampaign = [
            ...newCampaign,
            {
              ...blank,
              recordType: "Keyword",
              campaign: testCampaignName,
              keywordOrProductTargeting: neg,
              matchType: "campaign negative exact",
              campaignStatus: "enabled",
              status: "enabled",
            },
          ];
        });
      });

      // add to all new campaigns

      newCampaigns = [...newCampaigns, ...newCampaign];

      // also add as phrase and negative to associated auto campaign

      keywords.forEach((k) => {
        const autoCampaign = data.find(
          (c) =>
            c.campaignTargetingType === "Auto" &&
            c.campaign.startsWith(campaign.campaign.replace(/ [KM]$/, ""))
        );

        if (!autoCampaign) {
          console.error(`No auto campaign found for ${campaign.campaign}`);
          exit(1);
        }

        // todo: limit exact to 10 words

        newCampaigns.push({
          ...blank,
          recordType: "Keyword",
          campaignId: autoCampaign.campaignId,
          campaign: autoCampaign.campaign,
          keywordOrProductTargeting: k.keywordOrProductTargeting,
          matchType: "campaign negative exact",
          campaignStatus: "enabled",
          status: "enabled",
        });

        // todo: limit broad to 4 words
        newCampaigns.push({
          ...blank,
          recordType: "Keyword",
          campaignId: autoCampaign.campaignId,
          campaign: autoCampaign.campaign,
          keywordOrProductTargeting: k.keywordOrProductTargeting,
          matchType: "campaign negative phrase",
          campaignStatus: "enabled",
          status: "enabled",
        });
      });
    }
  });

  outputRecords(newCampaigns);
};

//--------- create a new test or perf campaign

const createNewKeywordCampaign = ({
  newCampaignName,
  autoCampaign,
  adGroup, // Broad or Exact
  asin,
  generalNegatives,
  customerSearchTerm,
  bid,
}) => {
  let newCampaign = createManualCampaign(
    newCampaignName,
    autoCampaign.portfolioId
  );

  // add adgroup
  newCampaign.push({
    ...blank,
    recordType: "Ad Group",
    campaign: newCampaignName,
    adGroup,
    maxBid: bid,
    campaignStatus: "enabled",
    adGroupStatus: "enabled",
  });

  // add ad
  newCampaign.push({
    ...blank,
    recordType: "Ad",
    campaign: newCampaignName,
    adGroup,
    asin,
    campaignStatus: "enabled",
    adGroupStatus: "enabled",
    status: "enabled",
  });

  // add keyword
  newCampaign = createNewKeywordRecords(
    newCampaign,
    newCampaignName,
    adGroup,
    customerSearchTerm,
    autoCampaign
  );

  // add general negatives

  generalNegatives.forEach((neg) => {
    newCampaign = [
      ...newCampaign,
      {
        ...blank,
        recordType: "Keyword",
        campaign: newCampaignName,
        keywordOrProductTargeting: neg,
        matchType: "campaign negative exact",
        campaignStatus: "enabled",
        status: "enabled",
      },
    ];
  });

  return newCampaign;
};

//--------- create test & performance campaigns from sales in auto

// 1. Search for orders in Auto camaigns, on a keyword.
// 2. Create Test & Perf campaigns if nec., with Broad and Exact ad groups.
// 3. Add the Term as a neg phrase and neg exact to the Auto
// 4. Add as Broad to Test, and neg exact. 0.2
// 5. Add as exact to Perf. 0.4

const createPromotionCampaigns = (data, sales) => {
  const allCampaigns = data.filter((d) => d.recordType === "Campaign");

  const autoCampaigns = allCampaigns.filter(
    (d) => d.campaignTargetingType === "Auto"
  );

  const generalNegatives = fs
    .readFileSync("data/negative/all.txt")
    .toString()
    .split("\n");

  // ignore product orders, and keywords orders with more than 4 words

  let campaignsWithOrders = sales.filter(
    (s) =>
      s.orders > 0 &&
      !/^b[a-z0-9]{9}$/.test(s.customerSearchTerm) &&
      s.customerSearchTerm.split(/ /).length <= 4
  );

  let newCampaigns = [];

  // find enabled campaigns
  // NB: in sales report data, campain name is campaignName
  // but in Ad data, it's just campaign

  const autoCampaignsWithOrders = campaignsWithOrders.filter((co) =>
    autoCampaigns.find(
      (ac) => ac.campaign === co.campaignName && ac.campaignStatus === "enabled"
    )
  );

  // for each keyword, create a test & perf campaign if nec

  const newTestCampaigns = [];
  const newPerfCampaigns = [];

  autoCampaignsWithOrders.forEach((co) => {
    const autoCampaign = allCampaigns.find(
      (c) => c.campaign === co.campaignName
    );

    const baseCampaignName = co.campaignName.replace(/( Auto)|( A)$/, "");

    // sales only says what ad group got the order, so need to find the ad group on the autocampaign & grab its asin
    // assumes single asin campaigns

    let asin = data.find(
      (c) => c.campaign === co.campaignName && c.recordType === "Ad"
    ).asin;

    if (!asin) {
      asin = missingAsins[co.campaignName];
    }

    if (!asin) {
      // asin missing from Ad in bulk download for unknown reason
      console.log("No asin for", co.campaignName);
      console.log("add to data/missing-asins.json");
      exit();
    }

    //--- check for existing Test campaign

    const testRegex = new RegExp(`^${baseCampaignName} (T|Test)$`);
    const newTestCampaignName = baseCampaignName + " Test";

    if (
      !allCampaigns.find((c) => testRegex.test(c.campaign)) &&
      !newTestCampaigns.find((c) => c === baseCampaignName)
    ) {
      console.log(
        "Create Test campaign",
        baseCampaignName,
        co.customerSearchTerm
      );

      newTestCampaigns.push(baseCampaignName);

      const testCampaign = createNewKeywordCampaign({
        newCampaignName: newTestCampaignName,
        autoCampaign,
        adGroup: "Broad",
        asin,
        generalNegatives,
        customerSearchTerm: co.customerSearchTerm,
        bid: "0.2",
      });

      newCampaigns = [...newCampaigns, ...testCampaign];
    } else {
      // existing test found
      // if keyword not found, add it

      if (
        !data.find(
          (d) =>
            !allCampaigns.find((c) => testRegex.test(d.campaign)) &&
            d.recordType === "Keyword" &&
            d.keywordOrProductTargeting === co.customerSearchTerm
        )
      ) {
        console.log(
          "Update Test campaign",
          baseCampaignName,
          co.customerSearchTerm
        );

        const newKeywordRecords = createNewKeywordRecords(
          [],
          newTestCampaignName,
          "Broad",
          co.customerSearchTerm,
          autoCampaign
        );

        newCampaigns = [...newCampaigns, ...newKeywordRecords];
      }
    }

    //--- check for existing Perf campaign

    const perfRegex = new RegExp(`^${baseCampaignName} (M||K|Perf)$`);
    const newPerfCampaignName = baseCampaignName + " Perf";

    if (
      !allCampaigns.find(
        (c) =>
          perfRegex.test(c.campaign) &&
          !newPerfCampaigns.find((c) => c === baseCampaignName)
      )
    ) {
      console.log(
        "Create Perf campaign",
        baseCampaignName,
        co.customerSearchTerm
      );

      newPerfCampaigns.push(baseCampaignName);

      const perfCampaign = createNewKeywordCampaign({
        newCampaignName: newPerfCampaignName,
        autoCampaign,
        adGroup: "Exact",
        asin,
        generalNegatives,
        customerSearchTerm: co.customerSearchTerm,
        bid: "0.4",
      });

      newCampaigns = [...newCampaigns, ...perfCampaign];
    } else {
      // existing test found
      // if keyword not found, add it

      if (
        !data.find(
          (d) =>
            !allCampaigns.find((c) => perfRegex.test(d.campaign)) &&
            d.keywordOrProductTargeting === co.customerSearchTerm
        )
      ) {
        console.log(
          "Update Perf campaign",
          baseCampaignName,
          co.customerSearchTerm
        );

        const newKeywordRecords = createNewKeywordRecords(
          [],
          newPerfCampaignName,
          "Exact",
          co.customerSearchTerm,
          autoCampaign
        );

        newCampaigns = [...newCampaigns, ...newKeywordRecords];
      }
    }
  });

  outputRecords(newCampaigns);
};

// up the bid by a percentage

const increaseBid = (bid, percentage) => {
  const bid1 = 100 * (bid || defaultBid);

  const newBid = Math.ceil(bid1 + (bid1 * percentage) / 100);

  return Math.min(newBid / 100, maximumBid);
};

// up the bid by a percentage

const decreaseBid = (bid, percentage) => {
  const bid1 = 100 * (bid || defaultBid);

  const newBid = Math.floor(bid1 - (bid1 * percentage) / 100);

  return Math.max(newBid / 100, minimumBid);
};

// raise bids on low impression targets

const raiseBidsOnLowImpressions = (data) => {
  // for campaigns 3 days or older
  // up bid on targets with low impressions by 10%

  // get older campaigns

  const oldCampaignAge = 6;
  const fewImpressions = 50;
  const percentageIncrease = 10;

  const allCampaigns = data.filter(
    (d) => d.recordType === "Campaign" && d.campaignStatus === "enabled"
  );

  const oldCampaigns = allCampaigns.filter(
    (c) =>
      differenceInDays(
        new Date(),
        parse(c.campaignStartDate, "MM/dd/yyyy", new Date())
      ) >= oldCampaignAge
  );

  // find keyword targets with few impressions

  const keywords = data.filter(
    (c) =>
      c.status === "enabled" &&
      // keyword
      ((c.recordType === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.recordType === "Product Targeting" &&
          (c.keywordOrProductTargeting === "close-match" ||
            c.keywordOrProductTargeting === "loose-match" ||
            c.keywordOrProductTargeting === "complements" ||
            c.keywordOrProductTargeting === "substitutes"))) &&
      c.impressions < fewImpressions &&
      oldCampaigns.find((oc) => oc.campaign === c.campaign)
  );

  keywords.forEach((k) => {
    k.maxBid = increaseBid(k.maxBid, percentageIncrease);
  });

  outputRecords(keywords);
};

// raise bids on low impression targets

const lowerBidsOnLowSales = (data) => {
  // reduce bid on targets with high clicks but no orders

  const zeroSalesManyClicks = 10;
  const singleSaleManyClicks = 20;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.recordType === "Campaign" && d.campaignStatus === "enabled"
  );

  // find keyword targets with clicks but no orders

  const keywords = data.filter(
    (c) =>
      c.status === "enabled" &&
      // keyword
      ((c.recordType === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.recordType === "Product Targeting" &&
          (c.keywordOrProductTargeting === "close-match" ||
            c.keywordOrProductTargeting === "loose-match" ||
            c.keywordOrProductTargeting === "complements" ||
            c.keywordOrProductTargeting === "substitutes"))) &&
      // no sales
      ((c.orders === 0 && c.clicks >= zeroSalesManyClicks) ||
        // 1 sale & bad acos & more clicks
        (c.orders === 1 &&
          c.clicks >= singleSaleManyClicks &&
          c.acos > targetAcos))
  );

  keywords.forEach((k) => {
    const newBid = decreaseBid(k.maxBid, percentageDecrease);

    k.maxBid = newBid;

    // // pause if hits minimum
    // if (newBid <= minimumBid) {
    //   k.status = "paused";
    //   console.log(
    //     "Paused: High Clicks, Low Sales",
    //     k.campaign,
    //     k.keywordOrProductTargeting
    //   );
    // }
  });

  outputRecords(keywords);
};

// raise bids on low impression targets

const handlePerformers = (data) => {
  // increase or decrease bids on sellers based on ACOS

  const minOrders = 2;
  const percentageChange = 10;

  const allCampaigns = data.filter(
    (d) => d.recordType === "Campaign" && d.campaignStatus === "enabled"
  );

  // find keyword targets with enough orders

  const targets = data.filter(
    (c) =>
      // keyword
      ((c.recordType === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.recordType === "Product Targeting" &&
          (c.keywordOrProductTargeting === "close-match" ||
            c.keywordOrProductTargeting === "loose-match" ||
            c.keywordOrProductTargeting === "complements" ||
            c.keywordOrProductTargeting === "substitutes"))) &&
      c.orders >= minOrders
  );

  targets.forEach((k) => {
    if (k.acos <= targetAcos) {
      // up bid if under acos

      const newBid = increaseBid(k.maxBid, percentageChange);

      k.maxBid = increaseBid(k.maxBid, percentageChange);
    } else {
      // decrease bid if over acos

      const newBid = decreaseBid(k.maxBid, percentageChange);

      k.maxBid = newBid;

      // // pause if hits minimum
      // if (newBid <= minimumBid) {
      //   k.status = "paused";
      //   console.log(
      //     "Paused: High ACoS",
      //     k.campaign,
      //     k.keywordOrProductTargeting
      //   );
      // }
    }
  });

  outputRecords(targets);
};

// lower bids on low ctr

const handleClickless = (data) => {
  // reduce bid on targets with many impressions but low clicks

  const manyImpressions = 1000;
  const lowCtr = 0.001;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.recordType === "Campaign" && d.campaignStatus === "enabled"
  );

  // find targets with few impressions

  const targets = data.filter(
    (c) =>
    c.status === 'enabled' &&
      // keyword
      ((c.recordType === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.recordType === "Product Targeting" &&
          (c.keywordOrProductTargeting === "close-match" ||
            c.keywordOrProductTargeting === "loose-match" ||
            c.keywordOrProductTargeting === "complements" ||
            c.keywordOrProductTargeting === "substitutes"))) &&
      c.impressions >= manyImpressions &&
      c.clicks / c.impressions < lowCtr
  );

  targets.forEach((k) => {
    const newBid = decreaseBid(k.maxBid, percentageDecrease);

    k.maxBid = newBid;

    // // pause if hits minimum
    // if (newBid <= minimumBid) {
    //   k.status = "paused";
    //   console.log(
    //     "Paused: High Impressions, Low CTR",
    //     k.campaign,
    //     k.keywordOrProductTargeting
    //   );
    // }
  });

  outputRecords(targets);
};

// lower bids on high spenders withot sales

const handleHighSpend = (data) => {

  const maxSpend = 5;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.recordType === "Campaign" && d.campaignStatus === "enabled"
  );

  // find targets with high spend

  const targets = data.filter(
    (c) =>
    c.status === 'enabled' &&
      // keyword
      ((c.recordType === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.recordType === "Product Targeting" &&
          (c.keywordOrProductTargeting === "close-match" ||
            c.keywordOrProductTargeting === "loose-match" ||
            c.keywordOrProductTargeting === "complements" ||
            c.keywordOrProductTargeting === "substitutes"))) &&
      c.spend >= maxSpend &&
      c.orders === 0
  );

  targets.forEach((k) => {
    const newBid = decreaseBid(k.maxBid, percentageDecrease);

    k.maxBid = newBid;

    // // pause if hits minimum
    // if (newBid <= minimumBid) {
    //   k.status = "paused";
    //   console.log(
    //     "Paused: High Impressions, Low CTR",
    //     k.campaign,
    //     k.keywordOrProductTargeting
    //   );
    // }
  });

  outputRecords(targets);
};

//--------- main

const main = () => {
  resultsFile = fs.createWriteStream("/tmp/results.txt", {
    flags: "w",
  });

  const { data, headings } = loadData();

  outputRecord(headings);

  const sales = loadSales();

  const db = createDb(data);

  switch (argv[2]) {
    case "--tests": {
      createTestCampaigns(data);

      break;
    }

    case "--promote": {
      createPromotionCampaigns(data, sales);

      break;
    }

    case "--impress": {
      raiseBidsOnLowImpressions(data);

      break;
    }

    case "--HighSpend": {
      lowerBidsOnLowSales(data);

      break;
    }

    case "--performers": {
      handlePerformers(data);

      break;
    }

    case "--clickless": {
      handleClickless(data);

      break;
    }

    case "--spend": {
      handleHighSpend(data);

      break;
    }

    case "--all": {
      createPromotionCampaigns(data, sales);
      raiseBidsOnLowImpressions(data);
      lowerBidsOnLowSales(data);
      handleClickless(data);
      handleHighSpend(data);
      handlePerformers(data);

      break;
    }

    default: {
      console.log("--auto-bid\tSet bid for auto campaigns");
      console.log("--neg\t\tAdd negative keywords");
      console.log("--tests\t\tCreate broad test campaigns");
      console.log("--impress\t\tUp bids on low impression targets");
      console.log("--HighSpend\t\tReduce bids on high clicks with low sales");
      console.log("--performers\t\tAdjust bids based on ACOS");
      console.log("--clickless\t\tReduce bids on low CTR");
      console.log("--HighSpend\t\tReduce bids on high spend");
      console.log("--all\t\tProcess all");
      console.log(
        "--promote\t\tCreate test & performance campaigns from auto sales"
      );
    }
  }

  resultsFile.close();
};

main();
