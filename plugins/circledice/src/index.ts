import { Context, Schema } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_st from './Dice_st'

export const name = 'circledice'

export interface Config {
  uploadPC: string
}

export const Config = Schema.object({
  uploadPC: Schema.string().default(),
})

export function apply(ctx: Context, config: Config) {
  ctx.plugin(Dice_r)
  ctx.plugin(Dice_st)

  ctx.command('uploadpc [message]')
    .action((_, message) => {
      _.session.onebot.uploadGroupFile(_.session.guildId, config.uploadPC, "COC7空白卡.xlsx")
    })
}
