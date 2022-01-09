// create a key out of a mnemonic
import {
  MsgInstantiateContract,
} from "@terra-money/terra.js";
import * as fs from "fs";
import { getAttribute, executeMsg, maker } from "./shared.js";

async function instantiateToken(codeIds) {
  const tokenInstantiateMsg = {
    decimals: 6,
    initial_balances: [{
      address: maker,
      amount: process.env.SUPPLY * 1_000_000 + ""
    }],
    name: process.env.NAME,
    symbol: process.env.SYMBOL
  }
  const msg = new MsgInstantiateContract(maker, undefined, codeIds['astroport_lbp_token'], tokenInstantiateMsg)
  const res = await executeMsg(msg)
  const tokenAddr = getAttribute(res, "instantiate_contract", "contract_address")
  console.log('Token Address:', tokenAddr)
}

let codeIds = JSON.parse(fs.readFileSync("codeIds.json", "utf8"));
await instantiateToken(codeIds)
//NETWORK=localterra SUPPLY=9000000 NAME="Local Terra Token" SYMBOL=LOCAL node token.js