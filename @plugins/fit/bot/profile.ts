import {Request} from "@services/bastion";
import {getUser} from "../domain/user/UserRepository";
import {getActivitySummary} from "../domain/strava/ActivitySummaryRepository";

import {createProfileEmbed} from "./embeds/ProfileEmbed";

// 
// Display an over view of stats 
//
export async function profile(req: Request) {
  const member = await req.getMember();

  const user = await getUser(req.author.id)
    .catch(() => null);

  if (!user) {
    return req.reply("You have not set up your account with the bot. Use `!fit auth` to get started!")
  }

  const summary = await getActivitySummary(req.author.id);

  const embed = createProfileEmbed({
    member,
    user      : user.getProfile(),
    activities: summary.getDetails()
  });
  
  await req.reply({embed});
}