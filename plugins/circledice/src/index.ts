import { Context, Logger, Schema } from 'koishi'
import * as Dice_r from './Dice_r.ts'
import * as Dice_pc from './Dice_pc.ts'
import { Config } from './config.ts'

export const name = 'circledice'

export { Config }

export function apply(ctx: Context, config: Config) {
  ctx.plugin(Dice_r)
  ctx.plugin(Dice_pc)

  ctx.command('uploadpc [message]')
    .action((_, message) => {
      let log = new Logger('circledice <<')
      log.info(`[${_.session.userId}]${_.session.content}`)
      _.session.onebot.uploadGroupFile(_.session.guildId, config.uploadPC, "COC7空白卡.xlsx")
    })
}
