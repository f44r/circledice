import { Context, Logger } from 'koishi'
import { Dice_return } from '../lib/rollDice'

export const name = 'Dice_r'

export function apply(ctx: Context) {
  ctx.command('r [message:text]')
    .option('result', '-r [r] 骰点理由（可选）', { fallback: "" })
    .option('dice', '-d [d] 骰点式（默认为1d100）', { fallback: "1d100" })
    .option('check', '-c [c] 技能、武器鉴定(未实现)', { fallback: "" })
    .action((_, message) => {
      let log = new Logger('circledice <<')
      log.info(`[${_.session.userId}]${_.session.content}`)
      Dice_return(_, message)
    })
}
