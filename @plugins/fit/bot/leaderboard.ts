import {map, reduce} from "lodash";
import bastion, {DiscordMember, Request} from "@services/bastion";
import {createLeaderboardEmbed} from "./embeds/LeaderboardEmbed";
import {getAllUsers} from "../domain/user/UserRepository";

export async function leaderboard(req: Request) {
  const users = await getAllUsers();

  const leaderboard = users.getFitscoreLeaderboard();

  if (leaderboard.length === 0) {
    await req.reply("Nobody has a fit score :(")
    return;
  }

  const getMember = async (discordId: string): Promise<[string, DiscordMember]> => [
    discordId,
    await req.getMember(discordId)
  ];

  const nicknames = await bastion.getNicknamesMap(leaderboard.map(u => u.discordId))
  const embed = createLeaderboardEmbed({
    users: leaderboard,
    nicknames
  });

  await req.reply({embed});
}