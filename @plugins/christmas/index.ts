import bastion from "@services/bastion";
import getDaysUntilChristmas from "./days-till-christmas";

const festivize = (msg: string) => `🎄☃️☃️🎄🎁 ${msg} 🎁🎄☃️☃️🎄`;

bastion.use("christmas", req => {
  const days = getDaysUntilChristmas();

  if (days === 0) {
    req.reply(festivize(`!!TODAY IS CHRISTMAS!!`));
    return;
  }

  const dayTxt = days === 1 ? "DAY" : "DAYS";

  req.reply(
    festivize(`ONLY ${days} ${dayTxt} UNTIL CHRISTMAS!!`)
  )
});