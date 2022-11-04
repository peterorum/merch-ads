const { assert } = require("console");
const fs = require("fs");
const { exit, argv } = require("process");
const _ = require("lodash");

const { differenceInDays, parse, sub } = require("date-fns");
const { utcToZonedTime, format } = require("date-fns-tz");

// tab-separated files
const dataFile = "data/bulk.txt";
const salesFile = "data/Sponsored Products Search term report.txt";
const productFile = "data/productor-export.txt";
const productsWithoutAdsFile = "data/no-ads.txt";

const { ca } = require("date-fns/locale");

// min & maximum allowable $bid
const absoluteMinimumBid = 0.02;
const absoluteMaximumBid = 1;

const maximumAutoCloseMatchBid = 0.38;
const maximumAutoLooseMatchBid = 0.26;
const maxAutoSubstituteBid = 0.36;
const maxAutoComplementBid = 0.2;
const maximumTestBid = 0.39;

const defaultAutoBid = 0.3;
const defaultTestBid = 0.4;

const maxPrice = 18.99;

// ACOS
const targetAcos = 25;
const minAcosOrders = 1;
// bid increase
const goodAcosBonusFactor = 1.1;

// products to not edit eg always goes to manual review
const doNotEditProduct = /(grammar)|(pumpkin)/i;

// one update per keyword
let keywordIdsUpdated = [];

// results file
let resultsFile = 0;

// avoid updating a bid more than once
let recordsProcessed = [];

// threshold for increasing bids on low impressions
const fewImpressions = 50;

// negatives to ignore even if they sell
const negativeExacts = fs
  .readFileSync("data/negative/all.txt")
  .toString()
  .split("\n");

// prodicuts which will not have ads running
const productsWithoutAds = fs
.readFileSync("data/no-ads.txt")
.toString()
.split("\n");

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
  biddingStrategy: "",
  placement: "",
  percentage: "",
  productTargetingExpression: "",
  impressions: 0,
  clicks: 0,
  clickThroughRate: 0,
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

const format2dp = (num) => (Math.round(num * 100) / 100).toFixed(2);

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
        campaignNameInfo,
        adGroupNameInfo,
        portfolioNameInfo,
        startDate,
        endDate,
        targetingType,
        state,
        campaignStateInfo,
        adGroupStateInfo,
        dailyBudget,
        sku,
        asin,
        eligibility,
        eligibilityReason,
        adGroupDefaultBid,
        adGroupDefaultBidInfo,
        bid,
        keywordText,
        matchType,
        biddingStrategy,
        placement,
        percentage,
        productTargetingExpression,
        resolvedProductTargetingExpressionInfo,
        impressions,
        clicks,
        clickThroughRate,
        spend,
        sales,
        orders,
        units,
        conversionRate,
        acos,
        cpc,
        roas,
      ] = d;

      return {
        product,
        entity,
        operation,
        campaignId,
        adGroupId,
        portfolioId,
        portfolioNameInfo,
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
        eligibility,
        eligibilityReason,
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
        clickThroughRate,
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
    })
    .filter((c) => !/^lottery/i.test(c.campaignNameInfo)); // skip lottery campaigns;

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
      sales: d.sales ? parseFloat(d.sales) : d.sales,
      cpc: d.cpc ? parseFloat(d.cpc) : d.cpc,
      acos: d.acos ? parseFloat(d.acos.replace(/\%/, "")) : d.acos,
      adGroupDefaultBidInfo: d.adGroupDefaultBidInfo
        ? parseFloat(d.adGroupDefaultBidInfo)
        : d.adGroupDefaultBidInfo,
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
    })
    .filter((c) => !/^lottery/i.test(c.campaignName)); // skip lottery campaigns

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

// productor export for total sales
const loadProducts = () => {
  const productText = fs.readFileSync(productFile).toString().split("\r\n");

  const products = productText
    .map((d) => d.split("\t"))
    .map((d) => {
      const [
        brand,
        title,
        price,
        bulletPoints1,
        bulletPoints2,
        description,
        color1,
        color2,
        color3,
        color4,
        color5,
        color6,
        color7,
        color8,
        color9,
        color10,
        mens,
        womens,
        kids,
        asin,
        rank,
        marketplace,
        productType,
        focusKeywords,
        allKeywords,
        longTailKeywords,
        created,
        designId,
        status,
        defaultColorAsinVariationforADs,
        reviews,
        firstSold,
        lastSold,
        soldAllTime,
        soldCancelledAllTime,
        returnRate,
        soldReturnedAllTime,
        soldRevenueAllTime,
        soldRoyaltyAllTime,
        productorNiche,
        designedProducts,
        missingProducts,
        soldColors,
        soldTypes,
        editUrl,
        mockupUrl,
        niches,
        titlewithType,
        fileName,
        liveUrl,
        lastUpdated,
      ] = d;

      return {
        asin,
        title,
        price,
        soldAllTime,
        designId,
        productType,
        marketplace,
        status,
        created
      };
    });

  // skip headings
  const [, ...products1] = products;

  // convert relevant specific numeric fields
  const products2 = products1.map((d) => {
    return {
      ...d,
      price: d.price ? parseFloat(d.price) : 0,
      soldAllTime: d.soldAllTime ? parseFloat(d.soldAllTime) : 0,
    };
  });

  return products2;
};

//--------- dump as text for Excel

const outputRecord = (d) => {
  if (!d.keywordId || !keywordIdsUpdated.find((x) => x === d.keywordId)) {
    // prettier-ignore
    const s = `${d.product}\t${d.entity}\t${d.operation}\t${d.campaignId}\t${d.adGroupId}\t${d.portfolioId}\t${d.adId}\t${d.keywordId}\t${d.productTargetingId}\t${d.campaignName}\t${d.adGroupName}\t${d.startDate}\t${d.endDate}\t${d.targetingType}\t${d.state}\t${d.dailyBudget}\t${d.sku}\t${d.asin}\t${d.adGroupDefaultBid}\t${d.bid}\t${d.keywordText}\t${d.matchType}\t${d.biddingStrategy}\t${d.placement}\t${d.percentage}\t${d.productTargetingExpression}\t${d.impressions}\t${d.clicks}\t${d.clickThroughRate}\t${d.spend}\t${d.sales}\t${d.orders}\t${d.units}\t${d.conversionRate}\t${d.acos}\t${d.cpc}\t${d.roas}\t${d.campaignNameInfo}\t${d.adGroupNameInfo}\t${d.campaignStateInfo}\t${d.adGroupStateInfo}\t${d.adGroupDefaultBidInfo}\t${d.resolvedProductTargetingExpressionInfo}\n`

    assert(resultsFile);

    resultsFile.write(s);

    if (d.keywordId) {
      keywordIdsUpdated = [...keywordIdsUpdated, d.keywordId];
    }
  }
};

const outputRecords = (db) => {
  db.forEach((d) => {
    // only process first update of a record
    let recordKey = "";

    if (d.entity === "Keyword") {
      recordKey = `K-${d.keywordId}`;
    } else if (d.entity === "Product Targeting") {
      recordKey = `P-${d.productTargetingId}`;
    }

    if (
      d.operation !== "update" ||
      !recordKey ||
      !recordsProcessed.find((x) => x === recordKey)
    ) {
      outputRecord(d);

      if (recordKey) {
        recordsProcessed = [...recordsProcessed, recordKey];
      }
    }
  });
};

// create new campaign

const createManualCampaign = (name, portfolioId) => {
  const records = [];

  const startDate = format(utcToZonedTime(new Date(), "PST"), "yyyyMMdd", {
    timeZone: "PST",
  });

  // header
  records.push({
    ...blank,
    campaignId: name,
    campaignName: name,
    entity: "Campaign",
    operation: "create",
    dailyBudget: "5",
    portfolioId: portfolioId,
    targetingType: "MANUAL",
    state: "enabled",
    biddingStrategy: "Dynamic bids - down only",
    startDate,
  });

  return records;
};

//--------- add keywords

const createNewKeywordRecords = ({
  newCampaign,
  campaignId,
  adGroupId,
  customerSearchTerm,
  matchType,
  autoAdGroup,
  bid,
}) => {
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      entity: "Keyword",
      operation: "create",
      campaignId,
      adGroupId,
      keywordText: customerSearchTerm,
      matchType,
      bid,
      state: "enabled",
    },
  ];

  // add negative phrase for auto adGroup
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      entity: "Negative Keyword",
      operation: "create",
      campaignId: autoAdGroup.campaignId,
      adGroupId: autoAdGroup.adGroupId,
      keywordText: customerSearchTerm,
      matchType: "negativePhrase",
      state: "enabled",
    },
  ];

  return newCampaign;
};

//--------- add keywords

const createNewProductRecords = ({
  newCampaign,
  campaignId,
  adGroupId,
  customerSearchTerm,
  autoCampaign,
  autoAdGroupId,
  bid,
}) => {
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      entity: "Product Targeting",
      operation: "create",
      campaignId,
      adGroupId,
      productTargetingExpression: `asin="${customerSearchTerm.toUpperCase()}"`,
      bid,
      state: "enabled",
    },
  ];

  // add negative product for auto campaign

  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      entity: "Negative Product Targeting",
      operation: "create",
      campaignId: autoCampaign.campaignId,
      adGroupId: autoAdGroupId,
      productTargetingExpression: `asin="${customerSearchTerm.toUpperCase()}"`,
      state: "enabled",
    },
  ];

  return newCampaign;
};

//--------- create a new test campaign

const createNewKeywordCampaign = ({
  newCampaignName,
  autoCampaign,
  adGroupName,
  matchType,
  asin,
  customerSearchTerm,
  bid,
  autoAdGroup,
}) => {
  let newCampaign = createManualCampaign(
    newCampaignName,
    autoCampaign.portfolioId
  );

  // add adgroup

  const adGroupId = newCampaignName + " " + adGroupName;

  newCampaign.push({
    ...blank,
    operation: "create",
    entity: "Ad Group",
    campaignId: newCampaignName,
    adGroupId,
    adGroupName,
    adGroupDefaultBid: bid,
    state: "enabled",
  });

  // add ad
  newCampaign.push({
    ...blank,
    entity: "Product Ad",
    operation: "create",
    campaignId: newCampaignName,
    adGroupId,
    asin,
    state: "enabled",
  });

  // add keyword
  newCampaign = createNewKeywordRecords({
    newCampaign,
    campaignId: newCampaignName,
    adGroupId,
    customerSearchTerm,
    matchType,
    autoAdGroup,
    bid,
  });

  return newCampaign;
};

const createNewProductCampaign = ({
  newCampaignName,
  autoCampaign,
  autoAdGroupId,
  adGroupName, // Product
  adGroupId,
  asin,
  customerSearchTerm, // asin
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
    campaignId: newCampaignName,
    adGroupId,
    adGroupName,
    adGroupDefaultBid: bid,
    state: "enabled",
  });

  // add ad
  newCampaign.push({
    ...blank,
    entity: "Product Ad",
    operation: "create",
    campaignId: newCampaignName,
    adGroupId,
    asin,
    state: "enabled",
  });

  // add product
  newCampaign = createNewProductRecords({
    newCampaign,
    campaignId: newCampaignName,
    adGroupId,
    customerSearchTerm,
    autoCampaign,
    autoAdGroupId,
    bid,
  });

  return newCampaign;
};

//--------- create a new  adgroup in an existing test campaign

const createNewKeywordAdGroup = ({
  campaignId,
  autoCampaign,
  adGroupName,
  adGroupId,
  matchType,
  asin,
  customerSearchTerm,
  bid,
  autoAdGroup,
}) => {
  // add adgroup

  const newAdGroupRecords = [];

  newAdGroupRecords.push({
    ...blank,
    operation: "create",
    entity: "Ad Group",
    campaignId,
    adGroupId,
    adGroupName,
    adGroupDefaultBid: bid,
    state: "enabled",
  });

  // add ad
  newAdGroupRecords.push({
    ...blank,
    entity: "Product Ad",
    operation: "create",
    campaignId,
    adGroupId,
    asin,
    state: "enabled",
  });

  // add keyword
  const keywordRecords = createNewKeywordRecords({
    newCampaign: [],
    campaignId,
    adGroupId,
    customerSearchTerm,
    matchType,
    autoAdGroup,
    bid,
  });

  newAdGroupRecords.push(...keywordRecords);

  return newAdGroupRecords;
};

//--------- create keyword test campaigns from sales in auto

// 1. Search for orders in Auto camaigns, on a keyword.
// 2. Create Test campaigns if nec., with Broad ad groups.
//    Add group names must be same as in Auto.
// 3. Add the Term as a neg phrase to the Auto
// 4. Add as Broad to Test

const createAutoKeywordPromotionCampaigns = (data, sales) => {
  const allCampaigns = data.filter((d) => d.entity === "Campaign");

  const autoCampaigns = allCampaigns.filter((d) => d.targetingType === "AUTO");

  // ignore product orders, and keywords orders with more than 4 words or just 1
  // and must contain shirt or apparel etc
  // and just letters

  let campaignsWithOrders = sales.filter(
    (s) =>
      s.orders > 0 &&
      !/^b[a-z0-9]{9}$/.test(s.customerSearchTerm) &&
      s.customerSearchTerm.split(/ /).length <= 4 &&
      s.customerSearchTerm.split(/ /).length > 1 &&
      /(shirt|apparel|gift)/gi.test(s.customerSearchTerm) &&
      /^[a-z\s]*$/gi.test(s.customerSearchTerm) &&
      !negativeExacts.find((x) => x === s.customerSearchTerm)
  );

  let newCampaigns = [];

  // find enabled campaigns

  const autoCampaignsWithOrders = campaignsWithOrders.filter((co) =>
    autoCampaigns.find(
      (ac) => ac.campaignName === co.campaignName && ac.state === "enabled"
    )
  );

  // for each keyword, create a test campaign if nec

  const newTestCampaigns = [];

  autoCampaignsWithOrders.forEach((co) => {
    // only process first occurence (find first object is same as current)

    if (
      autoCampaignsWithOrders.find(
        (x) =>
          x.campaignId === co.campaignId &&
          x.customerSearchTerm === co.customerSearchTerm
      ) === co
    ) {
      const autoCampaign = allCampaigns.find(
        (c) => c.campaignName === co.campaignName
      );

      const baseCampaignName = co.campaignName.replace(/ Auto$/, "");

      const adGroupName = co.adGroupName;

      const autoAdGroup = data.find(
        (x) =>
          x.entity === "Ad Group" &&
          x.campaignId === autoCampaign.campaignId &&
          x.adGroupName === adGroupName &&
          x.state === "enabled"
      );

      if (!autoAdGroup) {
        console.log("Ad Group not found - check bulk sheet");
        console.log(autoCampaign.campaignName);
        console.log(adGroupName);
        exit(1);
      }

      // sales only says what ad group got the order, so need to find the ad group on the autocampaign & grab its asin

      const productAd = data.find(
        (c) =>
          c.adGroupId === autoAdGroup.adGroupId &&
          c.entity === "Product Ad" &&
          c.state === "enabled"
      );

      const asin = productAd.asin;

      if (!asin) {
        // asin missing from Ad in bulk download for unknown reason
        console.log("No asin for", co.campaignName);
        exit();
      }

      //--- check for existing Test campaign

      const testRegex = new RegExp(`^${baseCampaignName} Test$`);
      const newTestCampaignName = baseCampaignName + " Test";

      const existingTestCampaign = allCampaigns.find((c) =>
        testRegex.test(c.campaignName)
      );

      // also test if already added this run

      const isExistingTestCampaign =
        !!existingTestCampaign ||
        !!newTestCampaigns.find((c) => c === baseCampaignName);

      if (!isExistingTestCampaign) {
        console.log(
          `Create Test campaign ${baseCampaignName}/${autoAdGroup.adGroupName}, ${co.customerSearchTerm}`
        );

        newTestCampaigns.push(baseCampaignName);

        const adGroupName = autoAdGroup.adGroupName;

        const testCampaign = createNewKeywordCampaign({
          newCampaignName: newTestCampaignName,
          autoCampaign,
          adGroupName,
          adGroupId: newTestCampaignName + " " + adGroupName,
          asin,
          customerSearchTerm: co.customerSearchTerm,
          bid: defaultTestBid,
          autoAdGroup,
          matchType: "broad",
        });

        newCampaigns = [...newCampaigns, ...testCampaign];
      } else {
        // existing test found
        // if keyword not found, add it

        if (
          !existingTestCampaign ||
          !data.find(
            (d) =>
              !allCampaigns.find((c) => testRegex.test(d.campaign)) &&
              (d.adGroupNameInfo === autoAdGroup.adGroupName ||
                (d.adGroupNameInfo === "Broad" &&
                  /^(Auto)|(Ad Group)/i.test(autoAdGroup.adGroupName))) &&
              d.entity === "Keyword" &&
              d.keywordText === co.customerSearchTerm
          )
        ) {
          console.log(
            `Update Test campaign ${baseCampaignName}/${adGroupName}, ${co.customerSearchTerm}`
          );

          // default if new
          let adGroupId = newTestCampaignName + " " + adGroupName;

          let campaignId = newTestCampaignName;

          // check for existing
          if (existingTestCampaign) {
            campaignId = existingTestCampaign.campaignId;

            // find matching ad group name
            // or use Broad for legacy names

            const testAdGroup = data.find(
              (x) =>
                x.entity === "Ad Group" &&
                x.campaignId === existingTestCampaign.campaignId &&
                (x.adGroupNameInfo === adGroupName ||
                  (x.adGroupNameInfo === "Broad" &&
                    /^(Auto)|(Ad Group)/i.test(adGroupName))) &&
                x.state === "enabled"
            );

            if (testAdGroup) {
              adGroupId = testAdGroup.adGroupId;

              const newKeywordRecords = createNewKeywordRecords({
                newCampaign: [],
                campaignId,
                adGroupId,
                customerSearchTerm: co.customerSearchTerm,
                matchType: "broad",
                autoAdGroup,
                bid: defaultTestBid,
              });

              newCampaigns = [...newCampaigns, ...newKeywordRecords];
            } else {
              // create new adGroup in existing campaign

              const testAdGroupRecords = createNewKeywordAdGroup({
                campaignId: existingTestCampaign.campaignId,
                autoCampaign,
                adGroupName,
                adGroupId:
                  existingTestCampaign.campaignNameInfo + " " + adGroupName,
                asin,
                customerSearchTerm: co.customerSearchTerm,
                bid: defaultTestBid,
                autoAdGroup,
                matchType: "broad",
              });

              newCampaigns = [...newCampaigns, ...testAdGroupRecords];
            }
          }
        }
      }
    }
  });

  outputRecords(newCampaigns);
};

function getMaximumBid(campaign) {
  let maximumBid = maximumAutoCloseMatchBid;

  if (/test$/i.test(campaign.campaignNameInfo)) {
    // test
    maximumBid = maximumTestBid;
  } else if (campaign.entity === "Product Targeting") {
    // auto
    switch (campaign.productTargetingExpression) {
      case "close-match": {
        maximumBid = maximumAutoCloseMatchBid;
        break;
      }

      case "loose-match": {
        maximumBid = maximumAutoLooseMatchBid;
        break;
      }

      case "substitutes": {
        maximumBid = maxAutoSubstituteBid;
        break;
      }

      case "complements": {
        maximumBid = maxAutoComplementBid;
        break;
      }

      default: {
        // asin match
        maximumBid = maxAutoSubstituteBid;
        break;
      }
    }
  }

  return maximumBid;
}

// up the bid by a percentage, limited to cpc + 0.01

const increaseBid = (bid, percentage, campaign, bonusFactor = 1) => {
  let maximumBid = getMaximumBid(campaign);

  const bid1 = 100 * (bid || defaultAutoBid);

  let newBid = Math.ceil(bid1 + (bid1 * percentage) / 100) / 100;

  if (!!campaign.cpc) {
    newBid = Math.min(newBid, campaign.cpc + 0.01);
  }

  if (bonusFactor === 1) {
    newBid = Math.min(newBid, maximumBid);
  }

  newBid = Math.round(newBid * bonusFactor * 100) / 100;

  newBid = Math.min(newBid, absoluteMaximumBid);

  return newBid;
};

// reduce the bid by a percentage

const decreaseBid = (bid, percentage, campaign) => {
  let maximumBid = getMaximumBid(campaign);

  const bid1 = 100 * (bid || defaultAutoBid);

  let newBid = Math.floor(bid1 - (bid1 * percentage) / 100) / 100;

  if (!!campaign.cpc) {
    newBid = Math.min(newBid, campaign.cpc - 0.01);
  }

  return Math.min(Math.max(newBid, absoluteMinimumBid), maximumBid);
};

// add general negatives to a campaign

const addGeneralNegatives = (
  generalNegatives,
  newCampaign,
  newCampaignName
) => {
  generalNegatives.forEach((neg) => {
    newCampaign = [
      ...newCampaign,
      {
        ...blank,
        entity: "Campaign Negative Keyword",
        operation: "create",
        campaignId: newCampaignName,
        keywordText: neg,
        matchType: "negativeExact",
        state: "enabled",
      },
    ];
  });

  return newCampaign;
};

//--- raise bids on low impression targets

const raiseBidsOnLowImpressions = (data) => {
  // for campaigns 6 days or older
  // up bid on targets with low impressions by 10%
  // or zero impressions for new campaigns

  // get older campaigns or those with no impressions

  const oldCampaignAge = 6;
  const percentageIncrease = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  const oldCampaigns = allCampaigns.filter(
    (c) =>
      c.impressions === 0 ||
      differenceInDays(
        new Date(),
        parse(c.startDate, "yyyyMMdd", new Date())
      ) >= oldCampaignAge
  );

  // find keyword targets with few impressions

  const keywords = data.filter(
    (c) =>
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      c.impressions < fewImpressions &&
      (!c.bid || c.bid < getMaximumBid(c)) &&
      oldCampaigns.find((oc) => oc.campaignId === c.campaignId) &&
      // keyword
      ((c.entity === "Keyword" && c.matchType === "broad") ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes")))
  );

  let updatedBids = [];

  keywords.forEach((k) => {
    const newBid = increaseBid(
      k.bid || k.adGroupDefaultBidInfo,
      percentageIncrease,
      k
    );

    k.operation = "update";

    if (newBid !== k.bid) {
      k.bid = newBid;

      updatedBids = [...updatedBids, k];

      // console.log(
      //   `Increase bid for Low impressions - ${k.campaignNameInfo}, ${
      //     k.productTargetingExpression || k.keywordText
      //   }, new bid ${k.bid}`
      // );
    }
  });

  outputRecords(updatedBids);
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
      c.campaignStateInfo === "enabled" &&
      c.bid > absoluteMinimumBid &&
      // keyword
      ((c.entity === "Keyword" && c.matchType === "broad") ||
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

  let updatedBids = [];

  keywords.forEach((k) => {
    const newBid = decreaseBid(k.bid, percentageDecrease, k);

    if (newBid !== k.bid) {
      k.bid = newBid;
      k.operation = "update";

      updatedBids = [...updatedBids, k];

      if (k.keywordText) {
        console.log(
          `High clicks, low sales - ${k.campaignNameInfo}/${
            k.adGroupNameInfo
          }, ${k.productTargetingExpression || k.keywordText}, new bid ${k.bid}`
        );
      }
    }
  });

  outputRecords(updatedBids);
};

//----------- raise bids on low impression targets

const handlePerformers = (data, products) => {
  // increase or decrease bids on sellers based on ACOS

  const percentageChange = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find keyword targets with enough orders

  const targets = data.filter(
    (c) =>
      // keyword
      ((c.entity === "Keyword" && c.matchType === "broad") ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes"))) &&
      c.orders >= minAcosOrders
  );

  let updatedBids = [];

  targets.forEach((k) => {
    k.operation = "update";

    if (k.acos <= targetAcos) {
      // up bid if under acos

      const acosFactor = /test$/i.test(k.campaignNameInfo)
        ? goodAcosBonusFactor
        : 1;

      if (!k.bid || k.bid < Math.max(k.cpc, getMaximumBid(k)) * acosFactor) {
        const newBid = increaseBid(k.bid, percentageChange, k, acosFactor);

        if (newBid !== k.bid) {
          k.bid = newBid;

          updatedBids = [...updatedBids, k];

          if (/test$/i.test(k.campaignNameInfo)) {
            console.log(
              `Under acos - ${k.campaignNameInfo}/${k.adGroupNameInfo}, ${k.acos}, ${
                k.keywordText || ""
              }, new bid ${k.bid}`
            );
          }
        }
      }
    } else {
      // decrease bid if over acos

      if (k.bid > absoluteMinimumBid) {
        const newBid = decreaseBid(k.bid, percentageChange, k);

        if (newBid !== k.bid) {
          k.bid = newBid;

          updatedBids = [...updatedBids, k];

          const campaign = data.find(
            (c) =>
              c.adGroupId === k.adGroupId &&
              c.entity === "Product Ad" &&
              c.state === "enabled" &&
              c.orders > 0
          );

          const asin = campaign.asin;

          const price = products.find((p) => p.asin === asin).price;

          const msg =
            price < maxPrice &&
            !doNotEditProduct.test(campaign.campaignNameInfo)
              ? "*** Over acos"
              : "Over acos";

          console.log(
            `${msg} - ${k.campaignNameInfo}/${k.adGroupNameInfo}, ${k.keywordText}, ${k.acos}, ${asin}, $${price}, new bid ${k.bid}`
          );
        }
      }
    }
  });

  outputRecords(updatedBids);
};

//---------- lower bids on low ctr

const handleLowCtr = (data) => {
  // reduce bid on targets with many impressions but low clicks

  const manyImpressions = 1000;
  const lowCtr = 0.1 / 100;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find targets with few impressions

  const targets = data.filter(
    (c) =>
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      c.bid > absoluteMinimumBid &&
      // keyword
      ((c.entity === "Keyword" && c.matchType === "broad") ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes"))) &&
      c.impressions >= manyImpressions &&
      c.clicks / c.impressions < lowCtr
  );

  let updatedBids = [];

  targets.forEach((k) => {
    const newBid = decreaseBid(k.bid, percentageDecrease, k);

    if (newBid !== k.bid) {
      k.bid = newBid;
      k.operation = "update";

      updatedBids = [...updatedBids, k];

      console.log(
        `Low ctr - ${k.campaignNameInfo}, ${k.keywordText}, new bid ${k.bid}`
      );
    }
  });

  outputRecords(updatedBids);
};

// lower bids on high spenders withot sales

const handleHighSpend = (data) => {
  const maxSpend = 3;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find targets with high spend

  let updatedBids = [];

  const targets = data.filter(
    (c) =>
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      c.bid > absoluteMinimumBid &&
      // keyword
      ((c.entity === "Keyword" && c.matchType === "broad") ||
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
    const newBid = decreaseBid(k.bid, percentageDecrease, k);

    if (newBid !== k.bid) {
      k.bid = newBid;
      updatedBids = [...updatedBids, k];

      console.log(
        `High spend - ${k.campaignNameInfo}, ${k.adGroupNameInfo}, ${
          k.keywordText || k.productTargetingExpression
        }, new bid ${k.bid}`
      );
      k.operation = "update";
    }
  });

  outputRecords(updatedBids);
};

//--- list unsold with high spend or impressions

const listPurgeable = (data, products) => {
  const autoCampaigns = data.filter(
    (d) =>
      d.entity === "Campaign" &&
      d.state === "enabled" &&
      d.targetingType === "AUTO" &&
      d.orders === 0 // no orders (may have orders but no sales in productor if order led to sale of related product)
  );

  const purgeSpend = 5.0;
  const purgeImpressions = 1500;

  // keyed by campaign stem (redundant if only using auto)
  const stats = {};

  autoCampaigns.forEach((ac) => {
    const baseCampaignName = ac.campaignName.replace(/ Auto$/, "");

    let asin = data.find(
      (c) =>
        c.campaignId === ac.campaignId &&
        c.entity === "Product Ad" &&
        c.state === "enabled"
    ).asin;

    const product = products.find((p) => p.asin === asin);

    // check for no sales
    if (product && product.soldAllTime === 0) {
      const record = stats[asin] || {
        asin,
        impressions: 0,
        baseCampaignName,
        spend: 0,
      };

      record.impressions += ac.impressions;
      record.spend += ac.spend;

      stats[asin] = record;
    }
  });

  Object.keys(stats).forEach((x) => {
    const d = stats[x];

    if (d.spend >= purgeSpend || d.impressions >= purgeImpressions) {
      console.log(
        `Purge - ${x}\t${d.baseCampaignName}\t${d.impressions}\t${d.spend}`
      );
    }
  });
};

//--- reconcile ads & products

const auditAds = (data, products) => {
  listNoAds(data, products);
  listDupAds(data, products);
  listNoProducts(data, products);
};

//--- list products with no auto campaign

const listNoAds = (data, products) => {
  let noAds = [];

  // just do recent t-shirts to ensure a new one wasn;t forgotten
  // as old products may have haid ther camaign stopped

  const recentPeriodDays = 31

  const tshirts = products.filter(
    (p) =>
      p.productType === "Standard T-Shirt" &&
      p.marketplace === "US" &&
      p.status !== "Removed" &&
      differenceInDays(
        new Date(),
        parse(p.created, "MM/dd/yyyy h:mm a", new Date())
      ) <= recentPeriodDays  &&
      ! productsWithoutAds.find(x => x == p.asin)
  );

  const autoCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.targetingType === "AUTO" // &&
    // d.state === "enabled"
  );

  tshirts.forEach((p) => {
    if (
      !data.find(
        (c) =>
          c.entity === "Product Ad" &&
          c.state === "enabled" &&
          c.asin === p.asin &&
          autoCampaigns.find((a) => a.campaignId === c.campaignId)
      )
    ) {
      noAds = [
        ...noAds,
        {
          title: p.title,
          asin: p.asin,
        },
      ];
    }
  });

  noAds.forEach((x) => {
    console.log(`Product without ad: ${x.title}\t${x.asin}`);
  });
};

//--- list ads with no products

const listNoProducts = (data, products) => {
  let noProducts = [];

  const tshirts = products.filter(
    (p) =>
      p.productType === "Standard T-Shirt" &&
      p.marketplace === "US" &&
      p.status !== "Removed"
  );

  const autoCampaigns = data.filter(
    (d) =>
      d.entity === "Campaign" &&
      d.targetingType === "AUTO" &&
      d.state === "enabled"
  );

  const autoAdGroups = data.filter(
    (d) =>
      d.entity == "Ad Group" &&
      autoCampaigns.find((ac) => ac.campaignNameInfo === d.campaignNameInfo) &&
      d.state === "enabled"
  );

  autoAdGroups.forEach((c) => {
    const asin = data.find(
      (d) =>
        d.campaignNameInfo === c.campaignNameInfo &&
        d.entity === "Product Ad" &&
        d.state === "enabled"
    ).asin;

    if (!products.find((p) => p.asin === asin)) {
      noProducts = [
        ...noProducts,
        {
          campaign: c.campaignNameInfo,
          adGroup: c.adGroupNameInfo,
          asin,
        },
      ];
    }
  });

  noProducts.forEach((x) => {
    console.log(
      `AdGroup without live product: ${x.campaign}/${x.adGroup}\t${x.asin}`
    );
  });
};

//--- list products with duplicate campaigns

const listDupAds = (data, products) => {
  let dupAds = [];

  products.forEach((p) => {
    if (
      p.productType === "Standard T-Shirt" &&
      p.marketplace === "US" &&
      p.status !== "Removed"
    ) {
      const ads = data.filter(
        (c) =>
          /auto$/i.test(c.campaignNameInfo) &&
          c.entity === "Product Ad" &&
          c.state === "enabled" &&
          c.campaignStateInfo === "enabled" &&
          c.asin === p.asin
      );

      if (ads.length >= 2) {
        dupAds = [
          ...dupAds,
          {
            title: p.title,
            asin: p.asin,
            ads: ads.map((c) => c.campaignNameInfo).join(","),
          },
        ];
      }
    }
  });

  dupAds.forEach((x) => {
    console.log(`Duplicate Ad: ${x.title}\t${x.asin}\t${x.ads}`);
  });
};

//--- calc stats on target types

const calcTargetStats = (data) => {
  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  const stats = {};

  const targets = data.forEach((c) => {
    if (
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      c.entity === "Product Targeting"
    ) {
      // close match etc or product asin
      let target = c.productTargetingExpression;

      if (/asin/gi.test(c.productTargetingExpression)) {
        target = "product asin";
      }

      let stat = stats[target];

      if (!stat) {
        stat = {
          impressions: 0,
          clicks: 0,
          orders: 0,
          sales: 0,
          spend: 0,
        };
      }
      stat.impressions += c.impressions;
      stat.clicks += c.clicks;
      stat.orders += c.orders;
      stat.sales += c.sales;
      stat.spend += c.spend;

      stats[target] = stat;
    }
  });

  console.log(
    "Target\timpressions\tclicks\tctr\tcpc\torders\tspend\tsales\tACOS"
  );

  Object.keys(stats).forEach((k) => {
    const s = stats[k];

    console.log(
      `${k}\t${s.impressions}\t${s.clicks}\t${format2dp(
        (s.clicks / s.impressions) * 100
      )}%\t$${format2dp(s.spend / s.clicks)}\t${s.orders}\t$${format2dp(
        s.spend
      )}\t$${format2dp(s.sales)}\t${
        s.orders > 0 ? format2dp((s.spend / s.sales) * 100) : "-"
      }%`
    );
  });
};

//--- calc stats on campaign types, auto & test

const calcCampaignStats = (data) => {
  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  const stats = {};

  const targets = data.forEach((c) => {
    if (
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      /(auto|test)$/i.test(c.campaignNameInfo)
    ) {
      const campaignType = /auto$/i.test(c.campaignNameInfo) ? "auto" : "test";

      let stat = stats[campaignType];

      if (!stat) {
        stat = {
          impressions: 0,
          clicks: 0,
          orders: 0,
          sales: 0,
          spend: 0,
        };
      }
      stat.impressions += c.impressions;
      stat.clicks += c.clicks;
      stat.orders += c.orders;
      stat.sales += c.sales;
      stat.spend += c.spend;

      stats[campaignType] = stat;
    }
  });

  console.log("Type\timpr'ns\tclicks\tctr\tcpc\torders\tspend\tsales\t\tACOS");

  Object.keys(stats).forEach((k) => {
    const s = stats[k];

    console.log(
      `${k}\t${s.impressions}\t${s.clicks}\t${format2dp(
        (s.clicks / s.impressions) * 100
      )}%\t$${format2dp(s.spend / s.clicks)}\t${s.orders}\t$${format2dp(
        s.spend
      )}\t$${format2dp(s.sales)}\t${
        s.orders > 0 ? format2dp((s.spend / s.sales) * 100) : "-"
      }%`
    );
  });
};

//----- reset campaign bids

const resetBids = (data, match) => {
  if (!match) {
    console.error("Missing text");
    exit(1);
  }

  // find targets with matching campain name

  const search = RegExp(match, "i");

  const targets = data.filter(
    (c) =>
      search.test(c.campaignNameInfo) &&
      /(enabled|paused)/.test(c.state) &&
      /(enabled|paused)/.test(c.campaignStateInfo) &&
      // keyword
      ((c.entity === "Keyword" && c.matchType === "broad") ||
        // auto
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes")))
  );

  targets.forEach((k) => {
    console.log(`${k.campaignNameInfo}\t${k.adGroupNameInfo}`);
    k.bid = absoluteMinimumBid;
    k.operation = "update";
  });

  outputRecords(targets);
};

//----- reset auto bids to new max

const resetMaxBids = (data) => {
  // find targets with less than 1 order or many impressions over current max bid
  // restrict bid to lower of max bid or cpc

  let updatedBids = [];

  const autoTargets = data.filter(
    (c) =>
      /auto$/i.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      c.entity === "Product Targeting" &&
      (c.productTargetingExpression === "close-match" ||
        c.productTargetingExpression === "loose-match" ||
        c.productTargetingExpression === "complements" ||
        c.productTargetingExpression === "substitutes") &&
      (c.bid > getMaximumBid(c) || !!c.cpc) &&
      c.orders < minAcosOrders
      // c.impressions >= fewImpressions
  );

  autoTargets.forEach((k) => {
    const newBid = k.cpc ? Math.min(k.cpc, getMaximumBid(k)) : getMaximumBid(k);

    if (newBid !== k.bid) {
      k.bid = newBid;
      k.operation = "update";

      updatedBids = [...updatedBids, k];
    }
  });

  // test campaigns

  const testTargets = data.filter(
    (c) =>
      /test$/i.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      c.entity === "Keyword" &&
      (c.bid > maximumTestBid || !!c.cpc) &&
      c.orders < minAcosOrders
  );

  testTargets.forEach((k) => {
    const newBid = k.cpc ? Math.min(k.cpc, maximumTestBid) : maximumTestBid;

    if (newBid !== k.bid) {
      k.bid = newBid;

      k.operation = "update";

      updatedBids = [...updatedBids, k];
    }
  });

  outputRecords(updatedBids);
};

//----- add specified negative exact to matching campaigns

const addNegative = (data, match, term) => {
  if (!match || !term) {
    console.error("Missing campaign match & text");
    exit(1);
  }

  // find targets with matching campain name

  const search = RegExp(match, "i");

  const campaigns = data.filter(
    (c) =>
      search.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
      c.campaignStateInfo === "enabled" &&
      c.targetingType === "AUTO"
  );

  campaigns.forEach((c) => {
    console.log(`Add "${term}" to ${c.campaignName}`);

    const record = {
      ...blank,
      entity: "Campaign Negative Keyword",
      operation: "create",
      campaignId: c.campaignId,
      keywordText: term,
      // comment out as required
      // matchType: "negativePhrase",
      matchType: "negativeExact",
      state: "enabled",
    };

    outputRecord(record);
  });
};

//----- list designs without US t-shirts
// so can delete unused designs which are on other products
// perhaps autouploaded from a deleted design

const handleDesigns = (products) => {
  const designIds = _.uniq(
    products.filter((p) => p.status !== "DELETED").map((p) => p.designId)
  );

  // find designIds without a US t-shirt

  const unused = designIds.filter(
    (d) =>
      !products.find(
        (p) =>
          p.designId === d &&
          p.productType === "Standard T-Shirt" &&
          p.marketplace === "US" &&
          p.status !== "Removed"
      )
  );

  // const unusedProducts = products.filter((p) =>
  //   unused.find((u) => u === p.designId)
  // );

  // just find first product for each design

  const unusedProducts = unused.map((d) =>
    products.find((p) => p.designId === d)
  );

  console.log(unusedProducts);
};

//--------- main

const main = () => {
  resultsFile = fs.createWriteStream("/tmp/results.txt", {
    flags: "w",
  });

  const { data, headings } = loadData();

  if (!/--(purge)/.test(argv[2])) {
    outputRecord(headings);
  }

  const sales = loadSales();
  const products = loadProducts();

  switch (argv[2]) {
    case "--promote-keyword": {
      createAutoKeywordPromotionCampaigns(data, sales);

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
      handlePerformers(data, products);

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

    case "--reset": {
      resetBids(data, argv[3]);

      break;
    }

    case "--maxbids": {
      resetMaxBids(data);

      break;
    }

    case "--negative": {
      addNegative(data, argv[3], argv[4]);

      break;
    }

    case "--designs": {
      handleDesigns(products);

      break;
    }

    case "--targets": {
      calcTargetStats(data, products);
      calcCampaignStats(data, products);

      break;
    }

    case "--audit": {
      auditAds(data, products);

      break;
    }

    case "--purge": {
      listPurgeable(data, products);

      break;
    }

    case "--all": {
      calcCampaignStats(data, products);
      calcTargetStats(data, products);
      createAutoKeywordPromotionCampaigns(data, sales);
      handleHighSpend(data);
      handlePerformers(data, products);
      lowerBidsOnLowSales(data);
      handleLowCtr(data);
      raiseBidsOnLowImpressions(data);
      resetMaxBids(data);
      auditAds(data, products);

      break;
    }

    default: {
      console.log(
        "--promote-keyword\t\tCreate test campaigns from search terms"
      );
      console.log("--impress\t\tUp bids on low impression targets");
      console.log("--lowsales\t\tAdjust bids if high clicks but low sales");
      console.log("--performers\t\tAdjust bids based on ACOS");
      console.log("--lowctr\t\tReduce bids on low CTR");
      console.log("--highspend\t\tReduce bids on high spend");
      console.log("--maxbids\t\tReset any over the current max auto bid");
      console.log(
        '--reset "^(halloween|xmas)"\t\tSet to min bid on campaign match'
      );
      console.log(
        '--negative "^pizza" "funny shirt"\t\tAdd negative phrase to auto campaigns'
      );
      console.log("--purge\t\tOutput unsold for purging");
      console.log("--designs\t\tList designs without US t-shirts");
      console.log("--targets\t\tShow ACOS by target type");
      console.log("--audit\t\tReconcile products & campaigns");
      console.log("--all\t\tProcess all");
    }
  }

  resultsFile.close();
};

main();
