import { Context, Logger } from 'koishi'
import { Dice_return } from './roll/rollDice'

export const name = 'Dice_r'

export function apply(ctx: Context) {
  ctx.command('r [message:text]')
    .option('result', '-r [reason]', { fallback: "" })
    .option('dice', '-d [d]', { fallback: "1d100" })
    //.option('check', '-c [c]', { fallback: "" })
    .action((_, message) => {
      let log = new Logger('circledice <<')
      log.info(`[${_.session.userId}]${_.session.content}`)
      Dice_return(_, message)
    })
}
