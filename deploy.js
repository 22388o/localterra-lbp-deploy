// create a key out of a mnemonic
import {
  LCDClient,
  MnemonicKey, MsgStoreCode,
} from "@terra-money/terra.js";
import * as fs from "fs";
import findFilesInDir from "./findFilesInDir.js";

import getAttribute from "./shared.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let network = "bombay-12";
let lcdURL = "https://bombay-lcd.terra.dev";
let maker_seed =
  "uncle simple tide bundle apart absurd tenant fluid slam actor caught month hip tornado cattle regular nerve brand tower boy alert crash good neck";
let taker_seed =
  "paddle prefer true embody scissors romance train replace flush rather until clap intact hello used cricket limb cake nut permit toss stove cute easily";

if (process.env.NETWORK === "localterra") {
  network = "localterra";
  lcdURL = "http://143.244.190.1:3060";
  maker_seed =
    "index light average senior silent limit usual local involve delay update rack cause inmate wall render magnet common feature laundry exact casual resource hundred";
  taker_seed =
    "prefer forget visit mistake mixture feel eyebrow autumn shop pair address airport diesel street pass vague innocent poem method awful require hurry unhappy shoulder";
}
let maker_key = new MnemonicKey({ mnemonic: maker_seed });
let taker_key = new MnemonicKey({ mnemonic: taker_seed });

const terra = new LCDClient({
  URL: lcdURL,
  chainID: network,
});

const maker = maker_key.accAddress;
const maker_wallet = terra.wallet(maker_key);

function executeMsg(msg, wallet = maker_wallet) {
  return wallet
    .createAndSignTx({
      msgs: [msg],
    })
    .then((tx) => {
      return terra.tx.broadcast(tx);
    });
}

function createStoreMsg(contract) {
  console.log(`*Storing ${contract}*`);
  const wasm = fs.readFileSync(contract, {
    highWaterMark: 16,
    encoding: "base64",
  });
  return new MsgStoreCode(maker, wasm);
}

function getContractNameFromPath(path) {
  let regex = RegExp(/artifacts\/(.*?)\.wasm/, "i");
  return path.match(regex)[1];
}

function getCodeIdFromResult(result) {
  return parseInt(getAttribute(result, "store_code", "code_id"));
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deploy(contract) {
  let codeIds = {};
  let contracts = findFilesInDir(process.env.CONTRACTS, ".wasm");

  if (contract.toLowerCase() === "all") {
    for (const i in contracts) {
      let c = contracts[i];
      let r = await executeMsg(createStoreMsg(c));
      console.log("waiting");
      await timeout(500);
      console.log("continue");
      codeIds[getContractNameFromPath(c)] = getCodeIdFromResult(r);
    }
    fs.writeFileSync("codeIds.json", JSON.stringify(codeIds), "utf8");
    console.log("Deploy Finished!", JSON.stringify(codeIds));
  } else {
    //Filter by name
    let codeIds = JSON.parse(fs.readFileSync("codeIds.json", "utf8"));
    console.log(codeIds);
    let names;
    if (contract.indexOf(",")) {
      names = contract.split(",");
    } else {
      names = [contract];
    }
    for (const i in names) {
      let name = names[i];
      for (const i in contracts) {
        let c = contracts[i];
        if (c.indexOf(name) >= 0) {
          let r = await executeMsg(createStoreMsg(c));
          codeIds[getContractNameFromPath(c)] = getCodeIdFromResult(r);
        }
      }
    }
    console.log("Deploy Finished!", JSON.stringify(codeIds));
  }
}

await deploy(process.env.DEPLOY);