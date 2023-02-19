// 快捷指令，可以被 r 取代。
import { Context, Logger, Schema, Session } from 'koishi'
import { dice, Config } from './index'

export const name = 'cmd'
const log = new Logger('CircleDice/cmd:')

export function apply(ctx: Context, config: Config) {
  ctx.command('ra [skill]')
    .channelFields(['gameSpace'])
    .userFields(['id', 'player'])
    .action((argv, skill) => {
      const { user, channel } = argv.session
      let ch = dice.getCh(user, channel.gameSpace)
      log.info(ch)
      return ch.get(skill)
    })
  ctx.command('roll [text]')
    .action((_, text) => {
      return JSON.stringify(dice.roll(text))
    })
}
