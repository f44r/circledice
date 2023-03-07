// 快捷指令，可以被 r 取代。
import { Context, Logger, Schema, Session } from 'koishi'
import { circle, Config } from './index'

export const name = 'cmd'
const log = new Logger('CircleDice/cmd:')

export function apply(ctx: Context, config: Config) {
  ctx.command('ra [skill]')
    .channelFields(['gameSpace'])
    .userFields(['id', 'player'])
    .action(async (argv, skill) => {
      const { user, channel } = argv.session
      let ch = await circle.getCh(user, channel ? channel.gameSpace : null)
      log.info(ch.assets)
      return ch.get(skill)
    })
  ctx.command('roll [text]')
    .action((_, text) => {
      return JSON.stringify(circle.roll(text))
    })
  ctx.command('save')
    .action(async (_, text) => {
      let a = await ctx.database.create('circledice_pc', {
        'master': 0,
        'assets': [
          ['maxPcId', { type: 1, value: 1 }],
          ['name', { type: 4, value: 'knight' }]
        ],
        'history': {}
      })
      log.info(JSON.stringify(a))
    })
}
