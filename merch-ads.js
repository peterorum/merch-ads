const { log } = require("console");
const fs = require("fs");
const { exit, argv } = require("process");

// tab-separated files
const dataFile = "data/data.txt";
const salesFile = "data/sales.txt";

// for ease of create a new record using spread operator

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
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      recordType: "Keyword",
      campaign: newCampaignName,
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

  let campaignsWithOrders = sales.filter(
    (s) => s.orders > 0 && !/^b[a-z0-9]{9}$/.test(s.customerSearchTerm)
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

  autoCampaignsWithOrders.forEach((co) => {
    const autoCampaign = allCampaigns.find(
      (c) => c.campaign === co.campaignName
    );

    const baseCampaignName = co.campaignName.replace(/( Auto)|( A)$/, "");

    // sales only says what ad group got the order, so need to find the ad group on the autocampaign & grab its asin
    // assumes single asin campaigns

    const asin = data.find(
      (c) => c.campaign === co.campaignName && c.recordType === "Ad"
    ).asin;

    //--- check for existing Test campaign

    const testRegex = new RegExp(`^${baseCampaignName} (T|Test)$`);

    if (!allCampaigns.find((c) => testRegex.test(c.campaign))) {
      const testCampaign = createNewKeywordCampaign({
        newCampaignName: baseCampaignName + " Test",
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
      // console.log("--------------found", co.campaignName);
    }

    //--- check for existing Perf campaign

    const perfRegex = new RegExp(`^${baseCampaignName} (M||K|Perf)$`);

    if (!allCampaigns.find((c) => perfRegex.test(c.campaign))) {
      const perfCampaign = createNewKeywordCampaign({
        newCampaignName: baseCampaignName + " Perf",
        autoCampaign,
        adGroup: "Exact",
        asin,
        generalNegatives,
        customerSearchTerm: co.customerSearchTerm,
        bid: "0.4",
      });

      newCampaigns = [...newCampaigns, ...perfCampaign];
    }
  });

  outputRecords(newCampaigns);
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

    niches.forEach((niche) => {
      addNegativeKeywords(
        data,
        niche,
        `data/negative/${niche.toLowerCase()}.txt`
      );
    });

    break;
  }

  // create test campaigns from exact

  case "--tests": {
    createTestCampaigns(data);

    break;
  }

  // create test & performance campaigns from auto sales

  case "--promote": {
    const sales = loadSales();

    createPromotionCampaigns(data, sales);

    break;
  }

  default: {
    console.log("--auto-bid\tSet bid for auto campaigns");
    console.log("--neg\t\tAdd negative keywords");
    console.log("--tests\t\tCreate broad test campaigns");
    console.log(
      "--promote\t\tCreate test & performance campaigns from auto sales"
    );
  }
}
