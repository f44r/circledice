import { Context, Logger , Schema } from 'koishi'
import { setPcskill } from '../lib/setPcskill'
import { Config } from './config.ts'

export const name = 'Dice_st'

declare module 'koishi' {
  interface Pc {
    id:number
    name:string
    skill:string[]
    poss:string[]
    hiy:object
    att:string[]
    rule:string
    token:string
    version:number
  }
}

declare module 'koishi' {
  interface user {
    pl:object
  }
}

declare module 'koishi' {
  interface channel {
    GameSpace:object
  }
}

export function apply(ctx: Context, config: Config) {
    ctx.model.extend('Pc', {
    id: 'unsigned',
    name: 'string',
    skill: 'list',
    poss: 'list',
    hiy: 'json',
    att: 'list',
    rule: 'string',
    token: 'string',
    version: 'unsigned',
  })
  ctx.model.extend('user', {
    pl: 'json',
  })
  ctx.model.extend('channel', {
    GameSpace: 'json',
  })
  ctx.command('st <message:text>')
    .action(async (_, message) => {
      let log = new Logger('circledice <<')
      log.info(`[${_.session.userId}]${_.session.content}`)
      let pc = new Object()
      const userId = _.session.userId
      const user = await ctx.database.getUser(_.session.platform, _.session.userId)
      pc.skill = setPcskill(_.session, message)
      pc.poss = []
      pc.hiy = {}
      pc.att = []
      pc.token = user.pl.token
      pc.version = 0
      if(_.session.guildId == undefined) {
	if(user.pl.normal == undefined) {
          pc.name = "默认人物卡"
	}else{
          pc.name = user.pl.normal
	}
	if(user.pl.rule == undefined) {
          pc.rule = config.normalRule
	}else{
          pc.rule = user.pl.rule
	}
      }else{
        let Channel = await ctx.database.getChannel(_.session.platform, _.session.guildId)
	if(Channel.GameSpace.pclist[userId] == undefined) {
          pc.name = "默认人物卡"
	}else{
          pc.name = Channel.GameSpace.pclist[userId]
	}
	if(Channel.GameSpace.set.rules == undefined) {
          pc.rule = config.normalRule
	}else{
          pc.rule = Channel.GameSpace.set.rules
	}
      }
      Channel.GameSpace.pclist[userId] = pc.name

//    user.pl
      await ctx.database.setChannel(_.session.platform, _.session.guildId, Channel)
      
    })
}

async function setDatabase(object) {
  await ctx.database.set('Pc', 'name', object.name)
  await ctx.database.set('Pc', 'skill', object.skill)
  await ctx.database.set('Pc', 'poss', object.poss)
  await ctx.database.set('Pc', 'hiy', object.hiy)
  await ctx.database.set('Pc', 'att', object.att)
  await ctx.database.set('Pc', 'rule', object.rule)
  await ctx.database.set('Pc', 'token', object.token)
  await ctx.database.set('Pc', 'version', object.version)
  return object.name
}
