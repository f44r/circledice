// 快捷指令，可以被 r 取代。
import { Context, Logger, Schema, Session } from 'koishi'
import { Config } from './config'
import { GameSpace, Character, PlayerData } from './lib/types'
import { dice } from './index'

export const name = 'cmd'
const log = new Logger('CircleDice/cmd:')

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
    ctx.command('ra <e> [r]')
    .userFields(['player'])
    .channelFields(['gameSpace'])
    .action((argv)=>{
        let session = argv.session
        let pc = dice.getCurrentPC(session.user.player,session.channel.gameSpace)

    })
}
