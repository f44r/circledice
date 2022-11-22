import { Context } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_st from './Dice_st'

export const name = 'circledice'

export function apply(ctx: Context) {
  ctx.plugin(Dice_r)
  ctx.plugin(Dice_st)
}
