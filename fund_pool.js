// create a key out of a mnemonic
import {
  Coin,
  MsgExecuteContract,
} from "@terra-money/terra.js";
import { executeMsg, maker } from "./shared.js";

async function fundPool() {
  console.log('maker', maker)
  //Increase token allowance for the pool contract
  const tokenAmount = parseInt(process.env.TOKEN_AMOUNT) * 1_000_000
  const ustAmount = parseInt(process.env.UST_AMOUNT) * 1_000_000

  const increaseAllowanceMsg = {
    increase_allowance: {
      spender: process.env.POOL,
      amount: tokenAmount + ''
    }
  }
  console.log('increase allowance msg:', increaseAllowanceMsg)
  let increaseAllowanceRes = await executeMsg(new MsgExecuteContract(maker, process.env.TOKEN, increaseAllowanceMsg))
  console.log('increase allowance res:', increaseAllowanceRes)

  //Execute ProvideLiquidity message on the pool contract
  const provideLiquidityMsg = {
    provide_liquidity: {
      assets: [{
        info: {
          token: {
            contract_addr: process.env.TOKEN
          }
        },
        amount: tokenAmount + ''
      }, {
        info: {
          native_token: {
            denom: 'uusd'
          },
        },
        amount: ustAmount + ''
      }]
    }
  }
  const ust = Coin.fromData({ denom: 'uusd', amount: ustAmount })
  const res = await executeMsg(new MsgExecuteContract(maker, process.env.POOL, provideLiquidityMsg, [ust]))
  console.log('provide liquidity res:', res)
}

await fundPool()

//NETWORK=localterra POOL=terra1s9z2mnszsagj5g62cn0e2gak2a3xkekx28hn50 TOKEN_AMOUNT=9000000 UST_AMOUNT=110000 TOKEN=terra1jq8u49sx4h34ugsz2qvzk45uds8pqgywk4jv76 node fund_pool.js