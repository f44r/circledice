import { Context, Logger, Schema } from 'koishi'
import { Config } from './config'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './Dice_pc'
import * as Dice_log from './Dice_log'
import * as Dice_init from './Dice_init'

export const name = 'circledice'

export { Config }

export function apply(ctx: Context, config: Config) {
  ctx.plugin(Dice_r)
  ctx.plugin(Dice_pc)
  ctx.plugin(Dice_log)
  ctx.plugin(Dice_init)
  
  ctx.command('uploadpc [message]')
    .action((_, message) => {
      let log = new Logger('circledice <<')
      log.info(`[${_.session.userId}]${_.session.content}`)
      _.session.onebot.uploadGroupFile(_.session.guildId, config.uploadPC, "COC7空白卡.xlsx")
    })
}
