// create a key out of a mnemonic
import {
  Coin,
  Coins,
  LCDClient,
  MnemonicKey,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgStoreCode,
} from "@terra-money/terra.js";
import * as fs from "fs";
import findFilesInDir from "./findFilesInDir.js";

const maker_key = new MnemonicKey({
  mnemonic:
    "uncle simple tide bundle apart absurd tenant fluid slam actor caught month hip tornado cattle regular nerve brand tower boy alert crash good neck",
});
const taker_key = new MnemonicKey({
  mnemonic:
    "paddle prefer true embody scissors romance train replace flush rather until clap intact hello used cricket limb cake nut permit toss stove cute easily",
});
const terra = new LCDClient({
  URL: "https://bombay-lcd.terra.dev",
  chainID: "bombay-12",
});
const maker = maker_key.accAddress;
const maker_wallet = terra.wallet(maker_key);
const taker = taker_key.accAddress;
const taker_wallet = terra.wallet(taker_key);
const min_amount = 100000000;
const max_amount = 350000000;
const offer_type = "buy";

function executeMsg(msg, wallet = maker_wallet) {
  return wallet
    .createAndSignTx({
      msgs: [msg],
    })
    .then((tx) => {
      return terra.tx.broadcast(tx);
    });
}

function instantiateFactory(codeIds) {
  //Instantiate Factory
  const factoryInstantiateMsg = {
    cw20_code_id: 148,
    gov_contract_code_id: codeIds.governance,
    fee_collector_code_id: codeIds.fee_collector,
    trading_incentives_code_id: codeIds.trading_incentives,
    offer_code_id: codeIds.offer,
    trade_code_id: codeIds.trade,
    fee_collector_threshold: "1000000",
    local_ust_pool_addr: maker, //TODO: use actual address
  };
  const instantiateFactoryMsg = new MsgInstantiateContract(
    maker,
    maker,
    codeIds.factory,
    factoryInstantiateMsg
  );
  return executeMsg(instantiateFactoryMsg);
}

async function test(codeIds) {
  let factoryCfg;
  let factoryAddr = process.env.FACTORY;
  let tradeAddr;

  let setup = new Promise((resolve, reject) => {
    if (factoryAddr) {
      console.log("*Querying Factory Config*");
      terra.wasm.contractQuery(factoryAddr, { config: {} }).then((r) => {
        resolve(r);
      });
    } else {
      console.log("*Instantiating Factory*");
      instantiateFactory(codeIds).then((r) => {
        const factoryAddr = getAttribute(
          r,
          "instantiate_contract",
          "contract_address"
        );
        console.log("**Factory Addr:", factoryAddr);
        console.log("*Querying Factory Config*");
        terra.wasm.contractQuery(factoryAddr, { config: {} }).then((r) => {
          resolve(r);
        });
      });
    }
  });
  setup
    .then((r) => {
      factoryCfg = r;
      console.log("Factory Config result", r);
      const newOffer = {
        create: {
          offer: {
            offer_type,
            fiat_currency: "BRL",
            min_amount,
            max_amount,
          },
        },
      };
      let createOfferMsg = new MsgExecuteContract(
        maker,
        factoryCfg.offers_addr,
        newOffer
      );
      console.log("*Creating Offer*");
      return executeMsg(createOfferMsg);
    })
    .then((r) => {
      let offerId = getAttribute(r, "from_contract", "id");
      let createTradeMsg = new MsgExecuteContract(
        maker,
        factoryCfg.offers_addr,
        {
          new_trade: {
            offer_id: parseInt(offerId),
            ust_amount: min_amount + "",
            counterparty: taker,
          },
        }
      );
      console.log("*Creating Trade*");
      return executeMsg(createTradeMsg);
    })
    .then((result) => {
      tradeAddr = result.logs[0].events
        .find((e) => e.type === "instantiate_contract")
        .attributes.find((a) => a.key === "contract_address").value;
      console.log("**Trade created with address:", tradeAddr);
      //Send UST and fund trade
      const coin = Coin.fromData({
        denom: "uusd",
        amount: min_amount + "",
      });
      const coins = new Coins([coin]);
      let fundEscrowMsg = new MsgExecuteContract(
        taker,
        tradeAddr,
        { fund_escrow: {} },
        coins
      );
      console.log("*Funding Escrow*");
      return executeMsg(fundEscrowMsg, taker_wallet);
    })
    .then((r) => {
      if (r.txhash) {
        console.log("**Escrow Funded**");
      } else {
        console.log("%Error%");
      }
      const releaseMsg = new MsgExecuteContract(taker, tradeAddr, {
        release: {},
      });
      executeMsg(releaseMsg, taker_wallet);
    })
    .then((r) => {
      console.log("Result:", r);
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
  let regex = RegExp(/artifacts\/(.*?)\.wasm/, 'i')
  return path.match(regex)[1]
}

function getCodeIdFromResult(result) {
  return parseInt(getAttribute(result, "store_code", "code_id"));
}

function getAttribute(result, event, attribute) {
  return result.logs[0].events
    .find((e) => e.type === event)
    .attributes.find((e) => e.key === attribute).value;
}
async function deploy(contract) {
  let codeIds = {};
  let contracts = findFilesInDir(process.env.CONTRACTS, ".wasm");

  if (contract.toLowerCase() === "all") {
    for (const i in contracts) {
      let c = contracts[i];
      let r = await executeMsg(createStoreMsg(c));
      codeIds[getContractNameFromPath(c)] = getCodeIdFromResult(r);
    }
    fs.writeFileSync("codeIds.json", JSON.stringify(codeIds), "utf8");
    console.log("Deploy Finished!", JSON.stringify(codeIds));
    await test(codeIds);
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
    await test(codeIds);
  }
}

function fundEscrow(tradeAddr) {
  const coin = Coin.fromData({
    denom: "uusd",
    amount: min_amount + "",
  });
  const coins = new Coins([coin]);
  let fundEscrowMsg = new MsgExecuteContract(
    taker,
    tradeAddr,
    { fund_escrow: {} },
    coins
  );
  console.log("*Funding Escrow*");
  executeMsg(fundEscrowMsg, taker_wallet).then((r) => {
    console.log("Result", r);
    if (r.txhash) {
      release(tradeAddr, taker_wallet);
    }
  });
}

function release(tradeAddr, wallet) {
  console.log("Sending release msg");
  const releaseMsg = new MsgExecuteContract(taker, tradeAddr, {
    release: {},
  });
  console.log("Release Msg:", releaseMsg);
  executeMsg(releaseMsg, wallet).then((r) => {
    r.toJSON().then((r) => console.log(r));
  });
}

if (process.env.DEPLOY) {
  await deploy(process.env.DEPLOY);
} else if (process.env.FUND) {
  fundEscrow(process.env.FUND);
} else if (process.env.RELEASE) {
  release(process.env.RELEASE, taker_wallet);
} else {
  let codeIds = JSON.parse(fs.readFileSync("codeIds.json", "utf8"));
  await test(codeIds);
}
