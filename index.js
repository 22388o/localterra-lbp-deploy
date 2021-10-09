// create a key out of a mnemonic
import {LCDClient, MnemonicKey, MsgExecuteContract} from "@terra-money/terra.js";

const factoryCfg = {
  trade_code_id: 12451,
  token_addr: "terra1ys07xmvv0sahqxy6fch38naxjwt09kphw02nlq",
  local_ust_pool_addr: "terra17h9mgy45yht6eg9mvyna52e05nfh8slg6s8tse",
  gov_addr: "terra16428xkshv8rh0gxlrt9fhc56yer96cm203a5cr",
  offers_addr: "terra1gevq5lfzqfd6ntehn29gasacpynklyyge2nqhp",
  fee_collector_addr: "terra130y7xa3sakpkxy0awam58mglv0r4uln8j36tph",
  trading_incentives_addr: "terra1e79fm7zjf6enc5cswk90p9q2wrqa40k5j62j6g"
}

const mk = new MnemonicKey({
  mnemonic:
  'uncle simple tide bundle apart absurd tenant fluid slam actor caught month hip tornado cattle regular nerve brand tower boy alert crash good neck',
})
const terra = new LCDClient({
  URL: 'https://bombay-lcd.terra.dev',
  chainID: 'bombay-12',
})
const wallet = terra.wallet(mk)

function executeMsg(msg) {
  return wallet
  .createAndSignTx({
    msgs: [msg],
  })
  .then((tx) => {
    return terra.tx.broadcast(tx)
  })
}

async function main() {
  let min_amount = 100000000;
  let max_amount = 350000000;
  const newOffer = {
    create: {
      offer: {
        offer_type: 'buy',
        fiat_currency: 'BRL',
        min_amount,
        max_amount,
      },
    },
  }

  //Create Offer
  let address = mk.accAddress
  const offerMsg = new MsgExecuteContract(address, factoryCfg.offers_addr, newOffer)
  console.log("*Creating new offer...")
  executeMsg(offerMsg).then(result => {
    //Create Trade
    let offerId= result.logs[0].events.find(e => e.type === 'from_contract').attributes.find(a => a.key === 'offer_id').value;
    console.log('Offer created with id:', offerId)
    let createTradeMsg = new MsgExecuteContract(address, factoryCfg.offers_addr, { new_trade: {
      offer_id: parseInt(offerId),
      ust_amount: min_amount + '',
      counterparty: "terra17h9mgy45yht6eg9mvyna52e05nfh8slg6s8tse",
    }})
    console.log("*Creating new trade...")
    return executeMsg(createTradeMsg)
  }).then(result => {
    //Trade Created
    let tradeAddr = result.logs[0].events.find(e => e.type === 'instantiate_contract').attributes.find(a => a.key === 'contract_address').value;
    console.log('Trade created with address:', tradeAddr)
    //Query for Trade in Offer contract

  })
}

await main()