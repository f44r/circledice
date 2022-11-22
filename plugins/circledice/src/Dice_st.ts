import { Context } from 'koishi'

export const name = 'Dice_st'

export function apply(ctx: Context) {
  ctx.command('st <message>')
    .action((_,message) => '正在施工~')
}
