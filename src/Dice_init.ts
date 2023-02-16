import { Context, Schema, Logger, Argv, Session } from 'koishi'
import { Config } from './config'
import { Character, GameSpace, LogText, MsgLog } from './lib/types'
import { dice } from './index'

declare module 'koishi' {
    interface Tables {
        circledice_pc: Character
    }
}

const log = new Logger('CircleDice/init:')


export function apply(ctx: Context, config: Config) {
    ctx.model.extend('circledice_pc', {
        'id': 'unsigned',
        'name': 'string',
        'version': 'string',
        'clear': 'boolean',
        'token': 'string',
        'assets': 'json',
        'history': 'json'
    })
    ctx.model.extend('user', {
        player: 'json',
    })
    ctx.model.extend('channel', {
        gameSpace: 'json',
    })


    ctx.middleware(async (session) => {

        // 初始化 gamespace
        if (session.subsubtype != 'private') {
            let GameSpaceData = await ctx.database.getChannel(session.platform, session.channelId, ['gameSpace'])
            if (!GameSpaceData) { return }
            if (!Object.keys(GameSpaceData.gameSpace).length) {
                GameSpaceData.gameSpace = createGameSpace(session.gid)
                await ctx.database.setChannel(session.platform, session.channelId, { 'gameSpace': GameSpaceData.gameSpace })
                ctx.logger('>>').info(`群组 ${GameSpaceData.id} |`, GameSpaceData.gameSpace)
            } else {
                await ctx.database.setChannel(session.platform, session.channelId, { 'gameSpace': GameSpaceData.gameSpace })
            }
        }
    })
}

function createGameSpace(gid:Session['gid']): GameSpace {
    return {
        'botOn': true,
        'token': dice.getToken(gid),
        'rule': 'coc7',
        'team':new Map(),
        'init':new Map(),
        'loglist':new Map(),
        'version': dice.version
    }
}
function createMsgLog(session: Session, cha: Character): MsgLog {
    return {
        'botId': session.bot.selfId,
        'gid': `${session.platform}-${session.channelId}-${session.guildId}`,
        'mid': session.messageId,
        'islog': false,
        'time': session.timestamp,
        'logText': {
            'pcName': cha.name,
            'uid': session.userId,
            'context': session.content
        }
    }
}