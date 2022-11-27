import { Context, Schema, Logger, Argv } from 'koishi'
import { Dice, Pc, GameSpace } from './Dice_class'
import data from './Dice_data'
import { Config } from './config'

declare module 'koishi' {
    interface Tables {
        Dice: Dice
    }
}

export function apply(ctx: Context, config: Config) {
    ctx.model.extend('Dice', {
        'id': 'unsigned',
        'lastClearTime': 'unsigned',
        'maxLogId': 'unsigned',
        'maxPcId': 'unsigned'
    });

    ctx.middleware(async (session) => {

        (async (ctx: Context) => {
            let [dice] = await ctx.database.get('Dice', { id: 1 })
            if (!dice) {
                dice = {
                    maxLogId: 0,
                    maxPcId: 0,
                    lastClearTime: Date.now()
                }
                let ret = await ctx.database.set('Dice',1, dice)
                ctx.logger('DICE >>').info(dice,ret)
            }
        })(ctx);

        if (session.channelId && session.guildId) {
            let GameSpaceData = await ctx.database.getChannel(session.platform, session.channelId, ['GameSpace'])
            if (!GameSpaceData) { return }
            if (!Object.keys(GameSpaceData.GameSpace).length) {
                GameSpaceData.GameSpace = {
                    'set': {
                        'bot': false,
                        'rule': 'coc7'
                    },
                    'pclist': {},
                    'loglist': [],
                    'hiy': {
                        'lastTime': Date.now(),
                        'lastlogid': ''
                    },
                    'token': data.gettoken(session.channelId),
                    'version': 0
                }
                await ctx.database.setChannel(session.platform, session.channelId, { 'GameSpace': GameSpaceData.GameSpace })
                ctx.logger('>>').info(`<${GameSpaceData.id}> |`, GameSpaceData.GameSpace)
            } else {
                GameSpaceData.GameSpace.hiy.lastTime = Date.now()
                await ctx.database.setChannel(session.platform, session.channelId, { 'GameSpace': GameSpaceData.GameSpace })
            }
        }
    })
}
