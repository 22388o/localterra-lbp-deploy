// create a key out of a mnemonic
import {
  MsgInstantiateContract,
} from "@terra-money/terra.js";
import * as fs from "fs";
import { getAttribute, executeMsg, maker } from "./shared.js";

async function instantiateFactory(codeIds) {
  //Factory
  const instantiateMsg = {
    pair_code_id: codeIds['astroport_lbp_pair'],
    token_code_id: codeIds['astroport_lbp_token'],
    owner: maker
  }
  let msg = new MsgInstantiateContract(maker, maker, codeIds['astroport_lbp_factory'], instantiateMsg)
  let res = await executeMsg(msg)
  let contractAddr = getAttribute(res, "instantiate_contract", "contract_address")
  console.log('Factory Address:', contractAddr)

  //Router
  const routerInstantiateMg = {
    astroport_lbp_factory: contractAddr
  }
  msg = new MsgInstantiateContract(maker, maker, codeIds['astroport_lbp_router'], routerInstantiateMg)
  res = await executeMsg(msg)
  contractAddr = getAttribute(res, "instantiate_contract", "contract_address")
  console.log('Router Address:', contractAddr)
}

let codeIds = JSON.parse(fs.readFileSync("codeIds.json", "utf8"));
await instantiateFactory(codeIds)