// create a key out of a mnemonic
import {LCDClient, MnemonicKey, MsgExecuteContract} from "@terra-money/terra.js";

const factoryCfg = {
  trade_code_id: 12412,
  token_addr: "terra1at47matt5gjhhcql43m4whs5fmt99pg0py8ze3",
  local_ust_pool_addr: "terra17h9mgy45yht6eg9mvyna52e05nfh8slg6s8tse",
  gov_addr: "terra1kwkkc8gnty2uanahqkyzf0escqnn3dk7m3rg0w",
  offers_addr: "terra109c5j4ndlkhvr2aa0ldgxw8rladt22sl96kram",
  fee_collector_addr: "terra1tssql9k3cy9c7yqu8zjk3cptrfkf8yd2ztg4gh",
  trading_incentives_addr: "terra14x2ta6wkche2eywd9sh7vefwqdnd8qtj3r84ls"
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