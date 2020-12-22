import * as express from "express";
import {IS_PRODUCTION} from "@app/env";
import bastion from "@services/bastion";
import {debug, post_delay_ms, post_to_channel} from "../config";
import {NotConnected, Unauthorized} from "../errors";

import {createActivityEmbed} from "../bot/embeds/ActivityEmbed";

import { getUserByStravaId, saveUser, getUser } from "../domain/user/UserRepository";
import { getActivityByStravaId } from "../domain/strava/ActivityRepository";
import { getCurrentLogsForUser, insertWorkout } from "../domain/exp/WorkoutLogRepository";
import Workout from "../domain/exp/WorkoutLog";
import { DateTime } from "luxon";

// We extend request object for authorized requests
interface AuthorizedRequest extends express.Request {
  discordId?: string;
}

// mini util to await a certain milliseconds
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const recent_ids: string[] = [];
const add_id = (id: string) => { 
  recent_ids.push(id);
  if (recent_ids.length > 100) {
    recent_ids.shift();
  }
}
/** 
 * When an athlete posts an activity, this webhook is called with the owner ID and activity ID.
 * We need to add it to the profile data, and then send the embed to the channel
 * 
 * @body `owner_id` The athlete ID
 * @body `object_id` The activity ID
 * @body `aspect_type` Whether the event is a "create", or (something else)
 */
export async function postActivity(req: express.Request, res: express.Response) {
  const stravaId = String(req.body["owner_id"]);
  const activityId = String(req.body["object_id"]);
  const eventType = <string>req.body["aspect_type"];

  debug("webhook request, activityId: %o eventType: %o", activityId, eventType);

  res.status(200).send("Thanks!");

  // We only care when an activity is created
  if (eventType !== "create") return;
  if (recent_ids.includes(activityId)) {
    debug("Ignoring '%o' because it's already listed in recent_ids", activityId);
    return;
  }

  try {
    // Only wait if in production
    IS_PRODUCTION && await wait(post_delay_ms);

    // Prevent double posting
    add_id(activityId);

    const [user, activity] = await Promise.all([
      getUserByStravaId(stravaId),
      getActivityByStravaId(stravaId, activityId)
    ]);
    
    // Check if the activity is too old to post
    const diffHours = activity.timestamp.diff(DateTime.local(), "hours").hours;
    if (diffHours < -36) {
      debug("Not posting '%o' because it was recorded too long ago (diff: %o timestamp %o)", activityId, diffHours, activity.timestamp.toString());
      return;
    }

    // Preform update
    const exp = user.addActivity(activity);

    // Save shit
    const workout = Workout.create(user.id, activity.id, exp);
    await Promise.all([
      saveUser(user),
      insertWorkout(workout)
    ]);

    // Now lets send off an embed
    const discordUser = await bastion.getMember(user.id);
    const weekly = await getCurrentLogsForUser(user.id);

    // Create embed
    const embed = createActivityEmbed({
      member  : discordUser,
      user    : user.getProfile(), 
      exp     : workout.exp, 
      activity,
      weeklyExp: weekly.totalExp
    })

    // finally lets send the embed
    await bastion.sendTo(post_to_channel, {embed});
  } catch (e) {
    if (e.name === NotConnected.type || e.name === Unauthorized.type) {
      debug("Could not post activity: %o", e.message);
    } else {
      debug("Activity posting failed to uknown error")
      console.error(e);
    }
  }
}


/**
 * Sets the max heart rate for a user. Auth middleware is required
 */
export async function updateMaxHR(req: AuthorizedRequest, res: express.Response) {
  const maxHr = Number(req.body["hr"]);
  const discordId = req.discordId;

  debug("Request to update HR to %o (from %o)", maxHr, discordId);

  if (!discordId) {
    res.status(401).json({message: `Missing discord ID`});
    return;
  }

  const user = await getUser(discordId);
  user.updateMaxHeatrate(maxHr);
  await saveUser(user);

  res.json({success: true})
}

/**
 * Fetches the max heart rate for a user. Auth middleware is required
 */
export async function getMaxHR(req: AuthorizedRequest, res: express.Response) {
  const discordId = req.discordId;

  if (!discordId) {
    res.status(401).json({message: `Missing discord ID`});
    return;
  }

  const user = await getUser(discordId);
  res.json({heartrate: user.serialize().maxHR})
}