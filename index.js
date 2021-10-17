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

const mk = new MnemonicKey({
  mnemonic:
    "uncle simple tide bundle apart absurd tenant fluid slam actor caught month hip tornado cattle regular nerve brand tower boy alert crash good neck",
});
const terra = new LCDClient({
  URL: "https://bombay-lcd.terra.dev",
  chainID: "bombay-12",
});
const wallet = terra.wallet(mk);
const sender = mk.accAddress;

function executeMsg(msg) {
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
    local_ust_pool_addr: sender, //TODO: use actual address
  };
  const instantiateFactoryMsg = new MsgInstantiateContract(
    sender,
    sender,
    codeIds.factory,
    factoryInstantiateMsg
  );
  return executeMsg(instantiateFactoryMsg);
}

async function test(codeIds) {
  let factoryCfg;
  let factoryAddr = process.env.FACTORY;
  let min_amount = 100000000;
  let max_amount = 350000000;
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
            offer_type: "sell",
            fiat_currency: "BRL",
            min_amount,
            max_amount,
          },
        },
      };
      let createOfferMsg = new MsgExecuteContract(
        sender,
        factoryCfg.offers_addr,
        newOffer
      );
      console.log("*Creating Offer*");
      return executeMsg(createOfferMsg);
    })
    .then((r) => {
      let offerId = getAttribute(r, "from_contract", "id");
      let createTradeMsg = new MsgExecuteContract(
        sender,
        factoryCfg.offers_addr,
        {
          new_trade: {
            offer_id: parseInt(offerId),
            ust_amount: min_amount + "",
            counterparty: "terra17h9mgy45yht6eg9mvyna52e05nfh8slg6s8tse",
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
      const coin = Coin.fromData({ denom: "uusd", amount: min_amount + "" });
      const coins = new Coins([coin]);
      let fundEscrowMsg = new MsgExecuteContract(
        sender,
        tradeAddr,
        { fund_escrow: {} },
        coins
      );
      console.log("*Funding Escrow*");
      return executeMsg(fundEscrowMsg);
    })
    .then((r) => {
      if (r.txhash) {
        console.log("**Escrow Funded**");
      } else {
        console.log("%Error%");
      }
      const releaseMsg = new MsgExecuteContract(sender, tradeAddr, {
        release: {},
      });
      executeMsg(releaseMsg);
    })
    .then((r) => {
      console.log("Result:", r);
    });
}

function createStoreMsg(contract) {
  console.log(`*Storing ${contract}*`);
  const wasm = fs.readFileSync(
    `${process.env.CONTRACTS}/artifacts/${contract}.wasm`,
    {
      highWaterMark: 16,
      encoding: "base64",
    }
  );
  return new MsgStoreCode(sender, wasm);
}

function getCodeIdFromResult(result) {
  return parseInt(getAttribute(result, "store_code", "code_id"));
}

function getAttribute(result, event, attribute) {
  return result.logs[0].events
    .find((e) => e.type === event)
    .attributes.find((e) => e.key === attribute).value;
}

async function deploy() {
  let codeIds = {};
  executeMsg(createStoreMsg("factory"))
    .then((r) => {
      codeIds.factory = getCodeIdFromResult(r);
      return executeMsg(createStoreMsg("fee_collector"));
    })
    .then((r) => {
      codeIds.fee_collector = getCodeIdFromResult(r);
      return executeMsg(createStoreMsg("governance"));
    })
    .then((r) => {
      codeIds.governance = getCodeIdFromResult(r);
      return executeMsg(createStoreMsg("offer"));
    })
    .then((r) => {
      codeIds.offer = getCodeIdFromResult(r);
      return executeMsg(createStoreMsg("trade"));
    })
    .then((r) => {
      codeIds.trade = getCodeIdFromResult(r);
      return executeMsg(createStoreMsg("trading_incentives"));
    })
    .then((r) => {
      codeIds.trading_incentives = getCodeIdFromResult(r);
      fs.writeFileSync("codeIds.json", JSON.stringify(codeIds), "utf8");
      console.log("Deploy Finished!", JSON.stringify(codeIds));
      test(codeIds);
    })
    .catch((e) => {
      console.log("Error", e);
    });
}

if (process.env.DEPLOY) {
  await deploy();
} else {
  let codeIds = JSON.parse(fs.readFileSync("codeIds.json", "utf8"));
  await test(codeIds);
}

function fundEscrow() {
  const coin = Coin.fromData({ denom: "uusd", amount: 100000000 });
  const coins = new Coins([coin]);
  let fundEscrowMsg = new MsgExecuteContract(
    sender,
    "terra1mzt59aqxawkwcpfhrmyykmuzz9y3zqva3zydvf",
    { fund_escrow: {} },
    coins
  );
  return executeMsg(fundEscrowMsg);
}
