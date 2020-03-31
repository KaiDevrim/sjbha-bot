import {getAccessToken} from './Auth'
import mongoose from 'mongoose';

const ChallengeSchema = mongoose.Schema({
    challenge: {
        type: { type: String },
        multi: Number,
        distanceMulti: Number,
        name: String
    },
    targets: {
        time: Number,
        distance: Number,
        pace_seconds: Number
    },
    finished: {
        type: Boolean,
        default: false
    }
})

const AverageSchema = mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    pace_seconds: Number,
    distance: Number,
    time: Number,
    total: Number
})

const Schema = mongoose.Schema({
    user: String,
    userID: String,
    stravaID: {
        type: String,
        default: ""
    },
    accessToken: {
        type: String,
        default: ""
    },
    refreshToken: {
        type: String,
        default: ""
    },
    tokenExpires: {
        type: Date,
        default: Date.now
    },
    level: {
        type: Number,
        default: 1
    },
    EXP: {
        type: Number,
        default: 0
    },
    averages: [AverageSchema],
    challenge: ChallengeSchema,
    lastRun: Date
});

Schema.methods.updateToken = async function() {
    const token = await getAccessToken(this)
    if (token) {
        this.accessToken = token
    }
    return this
}

export default mongoose.model('stravaID', Schema);