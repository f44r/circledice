import { Context, Schema, Logger, Argv } from 'koishi'
import { Dice, Pc, GameSpace, Gamelog } from './Dice_class'
import data from './Dice_data'
import { Config } from './config'

declare module 'koishi' {
    interface Tables {
        Dice: Dice,
        Gamelog: Gamelog,
        Recall: Gamelog
    }
}


export function apply(ctx: Context, config: Config) {
    ctx.model.extend('Dice', {
        'id': 'unsigned',
        'lastClearTime': 'unsigned',
        'maxLogId': 'unsigned',
        'maxPcId': 'unsigned'
    }, { primary: 'id' });
    ctx.model.extend('Gamelog', {
        id: 'unsigned',
        context: 'list'
    })

    ctx.middleware(async (session) => {
        // 初始化 Dice 表
        (async (ctx: Context) => {
            let [dice] = await ctx.database.get('Dice', { id: 1 })
            if (!dice) {
                dice = {
                    maxLogId: 0,
                    maxPcId: 0,
                    lastClearTime: Date.now()
                }
                await ctx.database.create('Dice', dice)
                ctx.logger('DICE >>').info(dice)
            }
        })(ctx);
        // 初始化 gamespace
        if (session.subsubtype != 'private') {
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
                        'lastlogid': 0
                    },
                    'token': data.gettoken(session.channelId),
                    'version': 0
                }
                await ctx.database.setChannel(session.platform, session.channelId, { 'GameSpace': GameSpaceData.GameSpace })
                ctx.logger('>>').info(`群组 ${GameSpaceData.id} |`, GameSpaceData.GameSpace)
            } else {
                GameSpaceData.GameSpace.hiy.lastTime = Date.now()
                await ctx.database.setChannel(session.platform, session.channelId, { 'GameSpace': GameSpaceData.GameSpace })
            }
        }
        // 记录 recall log
        /**
         * code
         */
        // 记录 GameLog
        /**
         * code
         */
    })
}
