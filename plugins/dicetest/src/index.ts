import { Context, Schema } from 'koishi'

export const name = 'dicetest'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
}

export function test(ctx: Context) {
  ctx.middleware((session, next) => {
    const regex = /^test/i;
    let flag = session.content.match(regex)
    if ( flag 
      && (session.userId === "360326608" || session.userId === "Alice")) {
      return _test(session)
    }
    return next()
  })
}

function _test(obj:any){
  return JSON.stringify(obj.content)
}