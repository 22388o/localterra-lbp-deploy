import {LCDClient, MnemonicKey} from "@terra-money/terra.js";

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

export const terra = new LCDClient({
  URL: lcdURL,
  chainID: network,
});
export const maker = maker_key.accAddress;
export const maker_wallet = terra.wallet(maker_key);

export function getAttribute(result, event, attribute) {
  return result.logs[0].events
    .find((e) => e.type === event)
    .attributes.find((e) => e.key === attribute).value;
}

export async function executeMsg(msg, wallet = maker_wallet) {
  return wallet
    .createAndSignTx({
      msgs: [msg],
    }).then((tx) => {
      return terra.tx.broadcast(tx);
    });
}
