// create a key out of a mnemonic
import {
  Coin,
  MsgExecuteContract,
} from "@terra-money/terra.js";
import { executeMsg, maker } from "./shared.js";

async function fundPool() {
  const cw20transfer = {
    transfer: {
      amount: (parseInt(process.env.TOKEN_AMOUNT) * 1_000_000) + "",
      recipient: process.env.POOL
    }
  }
  const ust = Coin.fromData({ denom: 'uusd', amount: parseInt(process.env.UST_AMOUNT) * 1_000_000 })
  console.log('ust', ust);
  //TODO: Change to ApproveTransfer on CW20 + ProvideLiquidity on the LBP contract
  const transferTokenMsg = new MsgExecuteContract(maker, process.env.TOKEN, cw20transfer, [ust])
  const res = await executeMsg(transferTokenMsg)
  console.log(res)
}

await fundPool()

//POOL=terra1cd6m4axc85taqj0aeuuphvhgqnjxhlavzke5gd TOKEN_AMOUNT=9000000 UST_AMOUNT=110000 TOKEN=terra19sf8yfha0a6knxl8mx2dqplwf0qxje2q8p2rkh node fund_pool.js