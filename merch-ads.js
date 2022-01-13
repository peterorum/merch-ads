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
const maximumBid = 0.7;

const defaultAutoBid = 0.2;
const defaultTestBid = 0.4;
const defaultPerfBid = 0.4;

const targetAcos = 25;

// one update per keyword
let keywordIdsUpdated = [];

// results file
let resultsFile = 0;

// for ease of creating a new record using spread operator

const blank = {
  product: "Sponsored Products",
  entity: "",
  operation: "",
  campaignId: "",
  adGroupId: "",
  portfolioId: "",
  adId: "",
  keywordId: "",
  productTargetingId: "",
  campaignName: "",
  adGroupName: "",
  startDate: "",
  endDate: "",
  targetingType: "",
  state: "",
  dailyBudget: "",
  sku: "",
  asin: "",
  adGroupDefaultBid: "",
  bid: "",
  keywordText: "",
  matchType: "",
  biddingStrategy: "Dynamic bids - down only",
  placement: "",
  percentage: "",
  productTargetingExpression: "",
  impressions: 0,
  clicks: 0,
  spend: 0,
  sales: 0,
  orders: 0,
  units: 0,
  conversionRate: "",
  acos: "",
  cpc: "",
  roas: "",
  campaignNameInfo: "",
  adGroupNameInfo: "",
  campaignStateInfo: "",
  adGroupStateInfo: "",
  adGroupDefaultBidInfo: "",
  resolvedProductTargetingExpressionInfo: "",
};

// load data exported from Excel as a tsv

const loadData = () => {
  const dataText = fs.readFileSync(dataFile).toString().split("\r\n");

  const data = dataText
    .map((d) => d.split("\t"))
    .map((d) => {
      const [
        product,
        entity,
        operation,
        campaignId,
        adGroupId,
        portfolioId,
        adId,
        keywordId,
        productTargetingId,
        campaignName,
        adGroupName,
        startDate,
        endDate,
        targetingType,
        state,
        dailyBudget,
        sku,
        asin,
        adGroupDefaultBid,
        bid,
        keywordText,
        matchType,
        biddingStrategy,
        placement,
        percentage,
        productTargetingExpression,
        impressions,
        clicks,
        spend,
        sales,
        orders,
        units,
        conversionRate,
        acos,
        cpc,
        roas,
        campaignNameInfo,
        adGroupNameInfo,
        campaignStateInfo,
        adGroupStateInfo,
        adGroupDefaultBidInfo,
        resolvedProductTargetingExpressionInfo,
      ] = d;

      return {
        product,
        entity,
        operation,
        campaignId,
        adGroupId,
        portfolioId,
        adId,
        keywordId,
        productTargetingId,
        campaignName,
        adGroupName,
        startDate,
        endDate,
        targetingType,
        state,
        dailyBudget,
        sku,
        asin,
        adGroupDefaultBid,
        bid,
        keywordText,
        matchType,
        biddingStrategy,
        placement,
        percentage,
        productTargetingExpression,
        impressions,
        clicks,
        spend,
        sales,
        orders,
        units,
        conversionRate,
        acos,
        cpc,
        roas,
        campaignNameInfo,
        adGroupNameInfo,
        campaignStateInfo,
        adGroupStateInfo,
        adGroupDefaultBidInfo,
        resolvedProductTargetingExpressionInfo,
      };
    });

  const [headings, ...data1] = data;

  // convert to numeric fields
  const data2 = data1.map((d) => {
    return {
      ...d,
      adGroupDefaultBid: d.adGroupDefaultBid
        ? parseFloat(d.adGroupDefaultBid)
        : d.adGroupDefaultBid,
      bid: d.bid ? parseFloat(d.bid) : d.bid,
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
  const campaigns = data.filter((d) => d.entity === "Campaign");

  // add Ad Groups under campaigns
  // TODO: don't do this - keep flat

  // campaigns.forEach((c) => {
  //   c.adGroups = data.filter(
  //     (d) => d.campaign === c.campaign && d.entity == "Ad Group"
  //   );
  // });

  return campaigns;
};

//--------- dump as text for Excel

const outputRecord = (d) => {
  if (!d.keywordId || !keywordIdsUpdated.find(x => x === d.keywordId)) {
    // prettier-ignore
    const s = `${d.product}\t${d.entity}\t${d.operation}\t${d.campaignId}\t${d.adGroupId}\t${d.portfolioId}\t${d.adId}\t${d.keywordId}\t${d.productTargetingId}\t${d.campaignName}\t${d.adGroupName}\t${d.startDate}\t${d.endDate}\t${d.targetingType}\t${d.state}\t${d.dailyBudget}\t${d.sku}\t${d.asin}\t${d.adGroupDefaultBid}\t${d.bid}\t${d.keywordText}\t${d.matchType}\t${d.biddingStrategy}\t${d.placement}\t${d.percentage}\t${d.productTargetingExpression}\t${d.impressions}\t${d.clicks}\t${d.spend}\t${d.sales}\t${d.orders}\t${d.units}\t${d.conversionRate}\t${d.acos}\t${d.cpc}\t${d.roas}\t${d.campaignNameInfo}\t${d.adGroupNameInfo}\t${d.campaignStateInfo}\t${d.adGroupStateInfo}\t${d.adGroupDefaultBidInfo}\t${d.resolvedProductTargetingExpressionInfo}\n`

    assert(resultsFile);

    resultsFile.write(s);

    if (d.keywordId) {
      keywordIdsUpdated = [...keywordIdsUpdated, d.keywordId];
    }
  }
};
const outputRecords = (db) => {
  db.forEach((d) => {
    outputRecord(d);
  });
};

// create new campaign

const createManualCampaign = (name, portfolioId) => {
  const records = [];

  // header
  records.push({
    ...blank,
    campaign: name,
    entity: "Campaign",
    campaignDailyBudget: "5",
    portfolioId: portfolioId,
    campaignTargetingType: "Manual",
    campaignState: "enabled",
    biddingStrategy: "Dynamic bidding (down only)",
    placementType: "All",
  });

  // placement
  records.push({
    ...blank,
    campaign: name,
    entity: "Campaign By Placement",
    placementType: "Top of search (page 1)",
    increaseBidsByPlacement: "10%",
  });

  records.push({
    ...blank,
    campaign: name,
    entity: "Campaign By Placement",
    placementType: "Rest of search",
    increaseBidsByPlacement: "",
  });

  records.push({
    ...blank,
    campaign: name,
    entity: "Campaign By Placement",
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
      entity: "Keyword",
      operation: "create",
      campaign: newCampaignName,
      adGroup,
      keywordText: customerSearchTerm,
      matchType: adGroup.toLowerCase(),
      bid: defaultAutoBid,
      state: "enabled",
    },
  ];

  // add exact or phrase for auto campaign
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      entity: "Keyword",
      operation: "create",
      campaignId: autoCampaign.campaignId,
      campaign: autoCampaign.campaign,
      keywordText: customerSearchTerm,
      matchType: adGroup === "Exact" ? "negativeExact" : "negativePhrase",
      state: "enabled",
    },
  ];

  // if adding as broad, then add as neg exact to the broad campaign
  if (adGroup === "Broad") {
    newCampaign = [
      ...newCampaign,
      {
        ...blank,
        entity: "Keyword",
        campaign: newCampaignName,
        keywordText: customerSearchTerm,
        matchType: "negativeExact",
        state: "enabled",
      },
    ];
  }
  return newCampaign;
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
    operation: "create",
    entity: "Ad Group",
    campaign: newCampaignName,
    adGroup,
    adGroupDefaultBid: bid,
    state: "enabled",
  });

  // add ad
  newCampaign.push({
    ...blank,
    entity: "Product Ad",
    operation: "create",
    campaign: newCampaignName,
    adGroup,
    asin,
    state: "enabled",
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
        entity: "Keyword",
        operation: "create",
        campaign: newCampaignName,
        keywordText: neg,
        matchType: "negativeExact",
        state: "enabled",
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
  const allCampaigns = data.filter((d) => d.entity === "Campaign");

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
      (ac) => ac.campaign === co.campaignName && ac.state === "enabled"
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
      (c) => c.campaign === co.campaignName && c.entity === "Ad"
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
        bid: defaultTestBid,
      });

      newCampaigns = [...newCampaigns, ...testCampaign];
    } else {
      // existing test found
      // if keyword not found, add it

      if (
        !data.find(
          (d) =>
            !allCampaigns.find((c) => testRegex.test(d.campaign)) &&
            d.entity === "Keyword" &&
            d.keywordText === co.customerSearchTerm
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
        bid: defaultPerfBid,
      });

      newCampaigns = [...newCampaigns, ...perfCampaign];
    } else {
      // existing test found
      // if keyword not found, add it

      if (
        !data.find(
          (d) =>
            !allCampaigns.find((c) => perfRegex.test(d.campaign)) &&
            d.keywordText === co.customerSearchTerm
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
  const bid1 = 100 * (bid || defaultAutoBid);

  const newBid = Math.ceil(bid1 + (bid1 * percentage) / 100);

  return Math.min(newBid / 100, maximumBid);
};

// up the bid by a percentage

const decreaseBid = (bid, percentage) => {
  const bid1 = 100 * (bid || defaultAutoBid);

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
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  const oldCampaigns = allCampaigns.filter(
    (c) =>
      differenceInDays(
        new Date(),
        parse(c.startDate, "yyyyMMdd", new Date())
      ) >= oldCampaignAge
  );

  // find keyword targets with few impressions

  const keywords = data.filter(
    (c) =>
      c.state === "enabled" &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.keywordText === "close-match" ||
            c.keywordText === "loose-match" ||
            c.keywordText === "complements" ||
            c.keywordText === "substitutes"))) &&
      c.impressions < fewImpressions &&
      oldCampaigns.find((oc) => oc.campaign === c.campaign)
  );

  keywords.forEach((k) => {
    k.bid = increaseBid(k.bid, percentageIncrease);
    k.operation = "update";
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
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find keyword targets with clicks but no orders

  const keywords = data.filter(
    (c) =>
      c.state === "enabled" &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes"))) &&
      // no sales
      ((c.orders === 0 && c.clicks >= zeroSalesManyClicks) ||
        // 1 sale & bad acos & more clicks
        (c.orders === 1 &&
          c.clicks >= singleSaleManyClicks &&
          c.acos > targetAcos))
  );

  keywords.forEach((k) => {
    k.bid = decreaseBid(k.bid, percentageDecrease);
    k.operation = "update";
  });

  outputRecords(keywords);
};

// raise bids on low impression targets

const handlePerformers = (data) => {
  // increase or decrease bids on sellers based on ACOS

  const minOrders = 2;
  const percentageChange = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find keyword targets with enough orders

  const targets = data.filter(
    (c) =>
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes"))) &&
      c.orders >= minOrders
  );

  targets.forEach((k) => {
    k.operation = "update";

    if (k.acos <= targetAcos) {
      // up bid if under acos

      k.bid = increaseBid(k.bid, percentageChange);
    } else {
      // decrease bid if over acos

      k.bid = decreaseBid(k.bid, percentageChange);
    }
  });

  outputRecords(targets);
};

// lower bids on low ctr

const handleLowCtr = (data) => {
  // reduce bid on targets with many impressions but low clicks

  const manyImpressions = 1000;
  const lowCtr = 0.001;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find targets with few impressions

  const targets = data.filter(
    (c) =>
      c.state === "enabled" &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes"))) &&
      c.impressions >= manyImpressions &&
      c.clicks / c.impressions < lowCtr
  );

  targets.forEach((k) => {
    k.bid = decreaseBid(k.bid, percentageDecrease);
    k.operation = "update";
  });

  outputRecords(targets);
};

// lower bids on high spenders withot sales

const handleHighSpend = (data) => {
  const maxSpend = 5;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find targets with high spend

  const targets = data.filter(
    (c) =>
      c.state === "enabled" &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes"))) &&
      c.spend >= maxSpend &&
      c.orders === 0
  );

  targets.forEach((k) => {
    k.bid = decreaseBid(k.bid, percentageDecrease);
    k.operation = "update";
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
    case "--promote": {
      createPromotionCampaigns(data, sales);

      break;
    }

    case "--impress": {
      raiseBidsOnLowImpressions(data);

      break;
    }

    case "--lowsales": {
      lowerBidsOnLowSales(data);

      break;
    }

    case "--performers": {
      handlePerformers(data);

      break;
    }

    case "--lowctr": {
      handleLowCtr(data);

      break;
    }

    case "--highspend": {
      handleHighSpend(data);

      break;
    }

    case "--all": {
      createPromotionCampaigns(data, sales);
      raiseBidsOnLowImpressions(data);
      lowerBidsOnLowSales(data);
      handleLowCtr(data);
      handleHighSpend(data);
      handlePerformers(data);

      break;
    }

    default: {
      console.log(
        "--promote\t\tCreate test & perf campaigns from search terms"
      );
      console.log("--impress\t\tUp bids on low impression targets");
      console.log("--lowsales\t\tAdjust bids if high clicks but low sales");
      console.log("--performers\t\tAdjust bids based on ACOS");
      console.log("--lowctr\t\tReduce bids on low CTR");
      console.log("--highspend\t\tReduce bids on high spend");
      console.log("--all\t\tProcess all");
      console.log(
        "--promote\t\tCreate test & performance campaigns from auto sales"
      );
    }
  }

  resultsFile.close();
};

main();
