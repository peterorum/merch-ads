const { log } = require("console");
const fs = require("fs");
const { exit, argv } = require("process");

if (!argv[2]) {
  console.log("Missing command")
  exit(1)
}

const dataFile = "data/data.csv";

const data = fs
  .readFileSync(dataFile)
  .toString()
  .split("\n");


  
