// create a key out of a mnemonic
import {
  Coin,
  MsgExecuteContract,
} from "@terra-money/terra.js";
import { getAttribute, executeMsg, maker } from "./shared.js";

async function createPair() {
  const startTime = parseInt((new Date().getTime() + process.env.MINUTES_TO_START * 60 * 1000)/1000)
  const createPairMsg = {
    create_pair :{
      asset_infos: [
        {
          info: {
            token: {
              contract_addr: process.env.TOKEN
            }
          },
          start_weight: process.env.TOKEN_START_WEIGHT + "",
          end_weight: process.env.TOKEN_END_WEIGHT + ""
        },
        {
          info: {
            native_token: {
              denom: "uusd"
            }
          },
          start_weight: process.env.UST_START_WEIGHT + "",
          end_weight: process.env.UST_END_WEIGHT + ""
        },
      ],
      start_time: startTime,
      end_time: parseInt(startTime + process.env.HOURS * 60 * 60),
      description: process.env.DESCRIPTION
    }
  }

  const msg = new MsgExecuteContract(maker, process.env.FACTORY, createPairMsg)
  const res = await executeMsg(msg)
  const contractAddr = getAttribute(res, "instantiate_contract", "contract_address")
  console.log('LBP Address:', contractAddr)
}

await createPair()
//FACTORY=terra12s74xfyk7uz9pkruqt5d9cm8s3rzjuqpv5rg8r TOKEN=terra19sf8yfha0a6knxl8mx2dqplwf0qxje2q8p2rkh  TOKEN_START_WEIGHT=99 TOKEN_END_WEIGHT=20 UST_START_WEIGHT=1 UST_END_WEIGHT=80 HOURS=72 DESCRIPTION="Local Terra LBP" MINUTES_TO_START=15 NETWORK=localterra UST_AMOUNT=110000 TOKEN_AMOUNT=9000000 node create_pair.js