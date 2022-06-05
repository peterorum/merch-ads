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

const missingAsins = require("./data/missing-asins.json");
const { ca } = require("date-fns/locale");

// min & maximum allowable $bid
const minimumBid = 0.02;

const maximumAutoBid = 0.30;
const maximumTestBid = 0.40;
const maximumPerfBid = 0.45;
const maximumProdBid = 0.40;

// increase of max bid
const goodAcosBonusFactor = 1.2;

const defaultAutoBid = 0.2;
const defaultTestBid = 0.4;
const defaultPerfKeywordBid = 0.4;
const defaultPerfProductBid = 0.2;

const targetAcos = 25;

const maxPrice = 18.99;

// one update per keyword
let keywordIdsUpdated = [];

// results file
let resultsFile = 0;

// avoid updating a bid more than once
let recordsProcessed = [];

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

  // add negative exact or phrase for auto adGroup
  newCampaign = [
    ...newCampaign,
    {
      ...blank,
      entity: "Negative Keyword",
      operation: "create",
      campaignId: autoAdGroup.campaignId,
      adGroupId: autoAdGroup.adGroupId,
      keywordText: customerSearchTerm,
      matchType: matchType === "exact" ? "negativeExact" : "negativePhrase",
      state: "enabled",
    },
  ];

  // if adding as broad, then add as neg exact to the broad campaign adGroup
  if (matchType === "broad") {
    newCampaign = [
      ...newCampaign,
      {
        ...blank,
        entity: "Negative Keyword",
        operation: "create",
        campaignId,
        adGroupId,
        keywordText: customerSearchTerm,
        matchType: "negativeExact",
        state: "enabled",
      },
    ];
  }
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

//--------- create a new test or perf campaign

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

//--------- create a new  adgroup in an existing test or perf campaign

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

//--------- create keyword test & performance campaigns from sales in auto

// 1. Search for orders in Auto camaigns, on a keyword.
// 2. Create Test & Perf campaigns if nec., with Broad and Exact ad groups.
//    Add group names must be same as in Auto.
// 3. Add the Term as a neg phrase and neg exact to the Auto
// 4. Add as Broad to Test, and neg exact. 0.2
// 5. Add as exact to Perf. 0.4

const createAutoKeywordPromotionCampaigns = (data, sales) => {
  const allCampaigns = data.filter((d) => d.entity === "Campaign");

  const autoCampaigns = allCampaigns.filter((d) => d.targetingType === "AUTO");

  // ignore product orders, and keywords orders with more than 4 words or just 1
  // and must contain shirt or apparel etc

  let campaignsWithOrders = sales.filter(
    (s) =>
      s.orders > 0 &&
      !/^b[a-z0-9]{9}$/.test(s.customerSearchTerm) &&
      s.customerSearchTerm.split(/ /).length <= 4 &&
      s.customerSearchTerm.split(/ /).length > 1 &&
      /(shirt|apparel|gift)/gi.test(s.customerSearchTerm)
  );

  let newCampaigns = [];

  // find enabled campaigns

  const autoCampaignsWithOrders = campaignsWithOrders.filter((co) =>
    autoCampaigns.find(
      (ac) => ac.campaignName === co.campaignName && ac.state === "enabled"
    )
  );

  // for each keyword, create a test & perf campaign if nec

  const newTestCampaigns = [];
  const newPerfCampaigns = [];

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
        console.log('Ad Group not found - check bulk sheet');
        console.log(autoCampaign.campaignName);
        console.log(adGroupName);
        exit(1)
      }

      // sales only says what ad group got the order, so need to find the ad group on the autocampaign & grab its asin

      const productAd = data.find(
        (c) =>
          c.adGroupId === autoAdGroup.adGroupId && c.entity === "Product Ad" && c.state === "enabled"
      );

      const asin = productAd ? productAd.asin : asin = missingAsins[co.campaignName];

      if (!asin) {
        // asin missing from Ad in bulk download for unknown reason
        console.log("No asin for", co.campaignName);
        console.log("add to data/missing-asins.json");
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
          "Create Test campaign - ",
          baseCampaignName,
          " - ",
          co.customerSearchTerm
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
            "Update Test campaign - ",
            baseCampaignName,
            " - ",
            co.customerSearchTerm
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

              newCampaigns  = [...newCampaigns, ...testAdGroupRecords]
            }
          }
        }
      }

      //--- check for existing Perf campaign

      const perfRegex = new RegExp(`^${baseCampaignName} (M||K|Perf)$`);
      const newPerfCampaignName = baseCampaignName + " Perf";

      const existingPerfCampaign = allCampaigns.find((c) =>
        perfRegex.test(c.campaignName)
      );

      // also test if already added this run

      const isExistingPerfCampaign =
        !!existingPerfCampaign ||
        !!newPerfCampaigns.find((c) => c === baseCampaignName);

      if (!existingPerfCampaign) {
        console.log(
          "Create Perf campaign - ",
          baseCampaignName,
          " - ",
          co.customerSearchTerm
        );

        newPerfCampaigns.push(baseCampaignName);

        const adGroupName = autoAdGroup.adGroupNameInfo;

        const perfCampaign = createNewKeywordCampaign({
          newCampaignName: newPerfCampaignName,
          autoCampaign,
          adGroupName,
          adGroupId: newPerfCampaignName + " " + adGroupName,
          asin,
          customerSearchTerm: co.customerSearchTerm,
          bid: defaultPerfKeywordBid,
          autoAdGroup,
          matchType: "exact",
        });

        newCampaigns = [...newCampaigns, ...perfCampaign];
      } else {
        // existing test found
        // if keyword not found, add it

        if (
          !existingPerfCampaign ||
          !data.find(
            (d) =>
              !allCampaigns.find((c) => perfRegex.test(d.campaign)) &&
              d.entity === "Keyword" &&
              d.keywordText === co.customerSearchTerm
          )
        ) {
          console.log(
            "Update Perf campaign - ",
            baseCampaignName,
            " - ",
            co.customerSearchTerm
          );

          // default if new
          let adGroupId = newPerfCampaignName + " " + "Exact";

          let campaignId = newPerfCampaignName;

          // check for existing
          if (existingPerfCampaign) {
            campaignId = existingPerfCampaign.campaignId;

            const perfAdGroup = data.find(
              (x) =>
                x.entity === "Ad Group" &&
                x.campaignId === existingPerfCampaign.campaignId &&
                (x.adGroupNameInfo === adGroupName ||
                  (/^(Exact|K)$/i.test(x.adGroupNameInfo) &&
                    /^(Auto)|(Ad Group)/i.test(adGroupName))) &&
                x.state === "enabled"
            );

            if (perfAdGroup) {
              adGroupId = perfAdGroup.adGroupId;

              const newKeywordRecords = createNewKeywordRecords({
                newCampaign: [],
                campaignId,
                adGroupId,
                customerSearchTerm: co.customerSearchTerm,
                matchType: "exact",
                autoAdGroup,
                bid: defaultPerfKeywordBid,
              });

              newCampaigns = [...newCampaigns, ...newKeywordRecords];
            } else {
              // create new adGroup in existing perf campaign

              const perfAdGroupRecords = createNewKeywordAdGroup({
                campaignId: existingPerfCampaign.campaignId,
                autoCampaign,
                adGroupName,
                adGroupId:
                  existingPerfCampaign.campaignNameInfo + " " + adGroupName,
                asin,
                customerSearchTerm: co.customerSearchTerm,
                bid: defaultPerfKeywordBid,
                autoAdGroup,
                matchType: "exact",
              });

              newCampaigns = [...newCampaigns, ...perfAdGroupRecords];
            }
          }
        }
      }
    }
  });

  outputRecords(newCampaigns);
};

//--------- update keyword test & performance campaigns from sales in test

// 1. Search for orders in Test camaigns, on a keyword
// 2. Add as new broad in Test & neg phrase in Auto
// 3. Add as neg exact to Test
// 4. Add as exact to Perf, and neg Exact to Auto

const createTestKeywordPromotionCampaigns = (data, sales) => {
  const allCampaigns = data.filter((d) => d.entity === "Campaign");

  const testCampaigns = allCampaigns.filter(
    (d) => d.targetingType === "MANUAL" && /test$/i.test(d.campaignName)
  );

  // ignore product orders, and keywords orders with more than 4 words or just 1
  // and must contain shirt or apparel
  // and must be different to broad term

  let campaignsWithOrders = sales.filter(
    (s) =>
      s.orders > 0 &&
      !/^b[a-z0-9]{9}$/.test(s.customerSearchTerm) &&
      s.customerSearchTerm.split(/ /).length <= 4 &&
      s.customerSearchTerm.split(/ /).length > 1 &&
      /(shirt|apparel)/gi.test(s.customerSearchTerm) &&
      s.customerSearchTerm !== s.targeting
  );

  let newCampaigns = [];

  // find enabled campaigns

  const testCampaignsWithOrders = campaignsWithOrders.filter((co) =>
    testCampaigns.find(
      (ac) => ac.campaignName === co.campaignName && ac.state === "enabled"
    )
  );

  // for each keyword, update perf
  // and add as neg to Test & Auto

  testCampaignsWithOrders.forEach((co) => {
    // only process first occurence (find first object is same as current)
    // in case multiple orders with same term

    if (
      testCampaignsWithOrders.find(
        (x) =>
          x.campaignId === co.campaignId &&
          x.customerSearchTerm === co.customerSearchTerm
      ) === co
    ) {
      const testCampaign = allCampaigns.find(
        (c) => c.campaignName === co.campaignName
      );

      const baseCampaignName = co.campaignName.replace(/ Test$/, "");

      //--- assume existing Perf campaign

      const perfRegex = new RegExp(`^${baseCampaignName} Perf$`);

      const perfCampaign = allCampaigns.find((c) =>
        perfRegex.test(c.campaignName)
      );

      // check term is not already in use in perf

      if (
        !data.find(
          (c) =>
            c.campaignId === perfCampaign.campaignId && c.entity === "Keyword"
        ) &&
        c.keywordText === co.customerSearchTerm
      ) {
        const autoRegex = new RegExp(`^${baseCampaignName} Auto$`);

        const adGroupName = co.adGroupName;

        const autoCampaign = allCampaigns.find((c) =>
          autoRegex.test(c.campaignName)
        );

        const autoAdGroup = data.find(
          (x) =>
            x.entity === "Ad Group" &&
            x.campaignId === autoCampaign.campaignId &&
            (x.adGroupName === adGroupName ||
              (/auto|ad group/i.test(x.adGroupName) &&
                adGroupName === "Broad")) &&
            x.state === "enabled"
        );

        console.log(
          "Update Test & Perf campaigns - ",
          baseCampaignName,
          " - ",
          co.customerSearchTerm
        );

        const testAdGroup = data.find(
          (x) =>
            x.entity === "Ad Group" &&
            x.campaignId === testCampaign.campaignId &&
            (x.adGroupNameInfo === adGroupName ||
              (x.adGroupNameInfo === "Broad" &&
                /^(Auto)|(Ad Group)/i.test(adGroupName))) &&
            x.state === "enabled"
        );

        const perfAdGroup = data.find(
          (x) =>
            x.entity === "Ad Group" &&
            x.campaignId === perfCampaign.campaignId &&
            (x.adGroupName === adGroupName ||
              (x.adGroupName === "Exact" && adGroupName === "Broad")) && // legacy
            x.state === "enabled"
        );

        // sales only says what ad group got the order, so need to find the ad group on the autocampaign & grab its asin
        // assumes single asin campaigns

        let asin = data.find(
          (c) =>
            c.adGroupId === autoAdGroup.adGroupId && c.entity === "Product Ad" && c.state === "enabled"
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

        // add as new broad to test

        const newTestKeywordRecords = createNewKeywordRecords({
          newCampaign: [],
          campaignId: testCampaign.campaignId,
          adGroupId: testAdGroup.adGroupId,
          customerSearchTerm: co.customerSearchTerm,
          matchType: "broad",
          autoCampaign,
          autoAdGroup,
          bid: defaultTestBid,
        });

        newCampaigns = [...newCampaigns, ...newTestKeywordRecords];

        // add as exact to perf

        const newPerfKeywordRecords = createNewKeywordRecords({
          newCampaign: [],
          campaignId: perfCampaign.campaignId,
          adGroupId: perfAdGroup.adGroupId,
          customerSearchTerm: co.customerSearchTerm,
          matchType: "exact",
          autoCampaign,
          autoAdGroup,
          bid: defaultPerfKeywordBid,
        });

        newCampaigns = [...newCampaigns, ...newPerfKeywordRecords];
      }
    }
  });

  outputRecords(newCampaigns);
};

//--------- create test & performance campaigns from sales in auto

// 1. Search for orders in Auto camaigns, on a product.
// 2. Create Perf campaign if nec, with Product adgroup
// 3. Add the Product as a neg product to the Auto
// 4. Add as product to Perf.

const createProductPromotionCampaigns = (data, sales) => {
  const allCampaigns = data.filter((d) => d.entity === "Campaign");

  const autoCampaigns = allCampaigns.filter((d) => d.targetingType === "AUTO");

  // just product orders

  let campaignsWithOrders = sales.filter(
    (s) => s.orders > 0 && /^b[a-z0-9]{9}$/.test(s.customerSearchTerm)
  );

  let newCampaigns = [];

  // find enabled campaigns

  const autoCampaignsWithOrders = campaignsWithOrders.filter((co) =>
    autoCampaigns.find(
      (ac) => ac.campaignName === co.campaignName && ac.state === "enabled"
    )
  );

  // for each product, create a prod campaign if nec

  const newProdCampaigns = [];

  autoCampaignsWithOrders.forEach((co) => {
    const autoCampaign = allCampaigns.find(
      (c) => c.campaignName === co.campaignName
    );

    const adGroupName = co.adGroupName;

    const baseCampaignName = co.campaignName.replace(/ Auto$/, "");

    const autoAdGroup = data.find(
      (x) =>
        x.entity === "Ad Group" &&
        x.campaignId === autoCampaign.campaignId &&
        x.adGroupName === adGroupName &&
        x.state === "enabled"
    );

    // sales only says what ad group got the order, so need to find the ad on the autocampaign & grab its asin

    let asin = data.find(
      (c) => c.adGroupId === autoAdGroup.adGroupId && c.entity === "Product Ad" && c.state === "enabled"
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

    const asinSearchTerm = `"asin=""${co.customerSearchTerm.toUpperCase()}"""`;

    //--- check for existing Prod campaign

    const prodRegex = new RegExp(`^${baseCampaignName} Prod$`);
    const newProdCampaignName = baseCampaignName + " Prod";

    const existingProdCampaign = allCampaigns.find((c) =>
      prodRegex.test(c.campaignName)
    );

    // also test if already added this run

    const isExistingProdCampaign =
      !!existingProdCampaign ||
      !!newProdCampaigns.find((c) => c === baseCampaignName);

    if (!isExistingProdCampaign) {
      console.log(
        "Create Prod campaign",
        baseCampaignName,
        " - ",
        co.customerSearchTerm
      );

      newProdCampaigns.push(baseCampaignName);

      const adGroupName = autoAdGroup.adGroupName;

      const perfCampaign = createNewProductCampaign({
        newCampaignName: newProdCampaignName,
        autoCampaign,
        autoAdGroupId: autoAdGroup.adGroupId,
        adGroupName,
        adGroupId: newProdCampaignName + " " + adGroupName,
        asin,
        customerSearchTerm: co.customerSearchTerm,
        bid: defaultPerfProductBid,
      });

      newCampaigns = [...newCampaigns, ...perfCampaign];
    } else {
      // existing prod campaign found
      // if product not found, add it

      if (
        !existingProdCampaign ||
        !data.find(
          (d) =>
            d.campaignId === existingProdCampaign.campaignId &&
            (d.adGroupNameInfo === autoAdGroup.adGroupName ||
              (d.adGroupNameInfo === "Product" &&
                /^(Auto)|(Ad Group)/i.test(autoAdGroup.adGroupName))) &&
            d.entity === "Product Targeting" &&
            d.productTargetingExpression.toLowerCase() ===
              asinSearchTerm.toLowerCase()
        )
      ) {
        console.log(
          "Update Prod campaign",
          baseCampaignName,
          " - ",
          co.customerSearchTerm
        );

        // default if new
        let adGroupId = newProdCampaignName + " " + autoAdGroup.adGroupName;

        let campaignId = newProdCampaignName;

        // check for existing
        if (existingProdCampaign) {
          campaignId = existingProdCampaign.campaignId;

          adGroupId = data.find(
            (x) =>
              x.entity === "Ad Group" &&
              x.campaignId === existingProdCampaign.campaignId &&
              (x.adGroupNameInfo === adGroupName ||
                (x.adGroupNameInfo === "Product" &&
                  /^(Auto)|(Ad Group)/i.test(adGroupName))) &&
              x.state === "enabled"
          ).adGroupId;
        }

        const newProductRecords = createNewProductRecords({
          newCampaign: [],
          campaignId,
          adGroupId,
          customerSearchTerm: co.customerSearchTerm,
          autoCampaign,
          autoAdGroupId: autoAdGroup.adGroupId,
          bid: defaultPerfProductBid,
        });

        newCampaigns = [...newCampaigns, ...newProductRecords];
      }
    }
  });

  outputRecords(newCampaigns);
};

function getMaximumBid(campaignName) {
  let maximumBid = maximumAutoBid;

  if (/test$/i.test(campaignName)) {
    maximumBid = maximumTestBid;
  } else if (/prod$/i.test(campaignName)) {
    maximumBid = maximumProdBid;
  } else if (/perf$/i.test(campaignName)) {
    maximumBid = maximumPerfBid;
  }
  return maximumBid;
}

// up the bid by a percentage

const increaseBid = (bid, percentage, campaignName, bonusFactor = 1) => {
  let maximumBid =
    Math.round(getMaximumBid(campaignName) * bonusFactor * 100) / 100;

  const bid1 = 100 * (bid || defaultAutoBid);

  const newBid = Math.ceil(bid1 + (bid1 * percentage) / 100);

  return Math.max(Math.min(newBid / 100, maximumBid), minimumBid);
};

// up the bid by a percentage

const decreaseBid = (bid, percentage, campaignName) => {
  let maximumBid = getMaximumBid(campaignName);

  const bid1 = 100 * (bid || defaultAutoBid);

  const newBid = Math.floor(bid1 - (bid1 * percentage) / 100);

  return Math.min(Math.max(newBid / 100, minimumBid), maximumBid);
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
      c.impressions < fewImpressions &&
      (!c.bid || c.bid < getMaximumBid(c.campaignNameInfo)) &&
      oldCampaigns.find((oc) => oc.campaignId === c.campaignId) &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto or prod
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes" ||
            c.productTargetingExpression.startsWith('"asin="'))))
  );

  keywords.forEach((k) => {
    k.bid = increaseBid(
      k.bid || k.adGroupDefaultBidInfo,
      percentageIncrease,
      k.campaignNameInfo
    );

    // keep to cpc plus a cent
    if (k.cpc > 0) {
      k.bid = Math.min(k.bid, k.cpc + 0.01);
    }

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
      c.bid > minimumBid &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto or prod
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes" ||
            c.productTargetingExpression.startsWith('"asin="')))) &&
      // no sales
      ((c.orders === 0 && c.clicks >= zeroSalesManyClicks) ||
        // 1 sale & bad acos & more clicks
        (c.orders === 1 &&
          c.clicks >= singleSaleManyClicks &&
          c.acos > targetAcos))
  );

  keywords.forEach((k) => {
    k.bid = decreaseBid(k.bid, percentageDecrease, k.campaignNameInfo);
    k.operation = "update";

    if (k.keywordText) {
      console.log(
        `High clicks, low sales - ${k.campaignNameInfo}, ${
          k.productTargetingExpression || k.keywordText
        }, new bid ${k.bid}`
      );
    }
  });

  outputRecords(keywords);
};

//----------- raise bids on low impression targets

const handlePerformers = (data, products) => {
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
        // auto or prod
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes" ||
            c.productTargetingExpression.startsWith('"asin="')))) &&
      c.orders >= minOrders
  );

  targets.forEach((k) => {
    k.operation = "update";

    if (k.acos <= targetAcos) {
      // up bid if under acos

      if (
        !k.bid ||
        k.bid < getMaximumBid(k.campaignNameInfo) * goodAcosBonusFactor
      ) {
        k.bid = increaseBid(
          k.bid,
          percentageChange,
          k.campaignNameInfo,
          goodAcosBonusFactor
        );

        // keep to cpc plus a cent
        if (k.cpc > 0) {
          k.bid = Math.min(k.bid, k.cpc + 0.01);
        }

        console.log(
          `Under acos - ${k.campaignNameInfo}, ${k.acos}, new bid ${k.bid}`
        );
      }
    } else {
      // decrease bid if over acos

      if (k.bid > minimumBid) {
        k.bid = decreaseBid(k.bid, percentageChange, k.campaignNameInfo);

        let asin = data.find(
          (c) => c.campaignId === k.campaignId && c.entity === "Product Ad" && c.state === "enabled" && c.orders > 0
        ).asin;

        const price = products.find((p) => p.asin === asin).price;

        const msg = price < maxPrice ? "*** Over acos" : "Over acos";

        console.log(
          `${msg} - ${k.campaignNameInfo}, ${k.acos}, ${asin}, $${price}, new bid ${k.bid}`
        );
      }
    }
  });

  outputRecords(targets);
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
      c.bid > minimumBid &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto or prod
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes" ||
            c.productTargetingExpression.startsWith('"asin="')))) &&
      c.impressions >= manyImpressions &&
      c.clicks / c.impressions < lowCtr
  );

  targets.forEach((k) => {
    k.bid = decreaseBid(k.bid, percentageDecrease, k.campaignNameInfo);
    k.operation = "update";

    console.log(`Low ctr - ${k.campaignNameInfo}, new bid ${k.bid}`);
  });

  outputRecords(targets);
};

// lower bids on high spenders withot sales

const handleHighSpend = (data) => {
  const maxSpend = 4;
  const percentageDecrease = 10;

  const allCampaigns = data.filter(
    (d) => d.entity === "Campaign" && d.state === "enabled"
  );

  // find targets with high spend

  const targets = data.filter(
    (c) =>
      c.state === "enabled" &&
      c.bid > minimumBid &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto or prod
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes" ||
            c.productTargetingExpression.startsWith('"asin="')))) &&
      c.spend >= maxSpend &&
      c.orders === 0
  );

  targets.forEach((k) => {
    k.bid = decreaseBid(k.bid, percentageDecrease, k.campaignNameInfo);
    console.log(`High spend - ${k.campaignNameInfo}, new bid ${k.bid}`);
    k.operation = "update";
  });

  outputRecords(targets);
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
      (c) => c.campaignId === ac.campaignId && c.entity === "Product Ad" && c.state === "enabled"
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

  const autoAdGroups = data.filter(d =>
    d.entity == 'Ad Group' &&
    autoCampaigns.find(ac => ac.campaignNameInfo === d.campaignNameInfo) &&
    d.state === "enabled");

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
    console.log(`AdGroup without live product: ${x.campaign}/${x.adGroup}\t${x.asin}`);
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
      c.entity === "Product Targeting" &&
      (c.productTargetingExpression === "close-match" ||
        c.productTargetingExpression === "loose-match" ||
        c.productTargetingExpression === "complements" ||
        c.productTargetingExpression === "substitutes")
    ) {
      let stat = stats[c.productTargetingExpression];

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

      stats[c.productTargetingExpression] = stat;
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
      c.state === "enabled" &&
      // keyword
      ((c.entity === "Keyword" &&
        (c.matchType === "broad" || c.matchType === "exact")) ||
        // auto or prod
        (c.entity === "Product Targeting" &&
          (c.productTargetingExpression === "close-match" ||
            c.productTargetingExpression === "loose-match" ||
            c.productTargetingExpression === "complements" ||
            c.productTargetingExpression === "substitutes" ||
            c.productTargetingExpression.startsWith('"asin="'))))
  );

  targets.forEach((k) => {
    console.log(`${k.campaignNameInfo}\t${k.adGroupNameInfo}`);
    k.bid = minimumBid;
    k.operation = "update";
  });

  outputRecords(targets);
};

//----- reset auto bids to new max

const resetMaxBids = (data) => {
  // find targets with less than 2 orders over current max bid

  const minAcosOrders = 2;

  const autoTargets = data.filter(
    (c) =>
      /auto$/i.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
      c.entity === "Product Targeting" &&
      (c.productTargetingExpression === "close-match" ||
        c.productTargetingExpression === "loose-match" ||
        c.productTargetingExpression === "complements" ||
        c.productTargetingExpression === "substitutes") &&
      c.bid > maximumAutoBid &&
      c.orders < minAcosOrders
  );

  autoTargets.forEach((k) => {
    k.bid = maximumAutoBid;
    k.operation = "update";
  });

  // test campaigns

  const testTargets = data.filter(
    (c) =>
      /test$/i.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
      c.entity === "Keyword" &&
      c.bid > maximumTestBid &&
      c.orders < minAcosOrders
  );

  testTargets.forEach((k) => {
    k.bid = maximumTestBid;
    k.operation = "update";
  });

  // perf campaigns

  const perfTargets = data.filter(
    (c) =>
      /perf$/i.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
      c.entity === "Keyword" &&
      c.bid > maximumPerfBid &&
      c.orders < minAcosOrders
  );

  perfTargets.forEach((k) => {
    k.bid = maximumPerfBid;
    k.operation = "update";
  });

  const prodTargets = data.filter(
    (c) =>
      /auto$/i.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
      c.entity === "Product Targeting" &&
      c.productTargetingExpression.startsWith('"asin="') &&
      c.bid > maximumProdBid &&
      c.orders < minAcosOrders
  );

  prodTargets.forEach((k) => {
    k.bid = maximumProdBid;
    k.operation = "update";
  });

  outputRecords(autoTargets);
  outputRecords(testTargets);
  outputRecords(perfTargets);
  outputRecords(prodTargets);
};

//----- add negative exact to matching campaigns

const addNegative = (data, match, term) => {
  if (!match || !term) {
    console.error("Missing campaign match & exact text");
    exit(1);
  }

  // find targets with matching campain name

  const search = RegExp(match, "i");

  const campaigns = data.filter(
    (c) =>
      search.test(c.campaignNameInfo) &&
      c.state === "enabled" &&
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

    case "--promote-test": {
      createTestKeywordPromotionCampaigns(data, sales);

      break;
    }

    case "--promote-product": {
      createProductPromotionCampaigns(data, sales);

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
      createAutoKeywordPromotionCampaigns(data, sales);
      createTestKeywordPromotionCampaigns(data, sales);
      createProductPromotionCampaigns(data, sales);
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
        "--promote-keyword\t\tCreate test & perf campaigns from search terms"
      );
      console.log("--promote-test\t\tUpdate perf adgroup from test");
      console.log("--promote-product\t\tCreate perf adgroup from products");
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
        '--negative "^pizza" "funny shirt"\t\tAdd negative exact to auto campaigns'
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
