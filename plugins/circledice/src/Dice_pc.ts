import { Context, Logger } from 'koishi'
import { setPcskill } from "../lib/setPcskill"

export const name = 'Dice_st'

declare module 'koishi' {
  interface User {
    pcskill:string
  }
}

export function apply(ctx: Context) {
  ctx.model.extend('user', {
    pcskill:'string'
  })
  ctx.command('st <message:text>')
    .userFields(['pcskill'])
    .action((_, message) => {
      let log = new Logger('circledice >>')
      log.info(`[${_.session.userId}]${_.session.content}`)
      const ret = setPcskill(_.session, message)
      _.session.user.pcskill = JSON.stringify(ret[1]) // 还是不太懂 ts 的类型，用 string 先存 文档的例子会报错x 保留意见
      return `录入${ret[1].length}`
    })
}