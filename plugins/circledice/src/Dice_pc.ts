import { Context, Logger, Schema } from 'koishi'
import { setPcskill } from '../lib/setPcskill'
import { Config } from './config'
import { Dice, Pc, GameSpace } from './Dice_class'

export const name = 'Dice_st'

declare module 'koishi' {
  interface Tables {
      Pc: Pc
  }
  interface User {
      pl: object
  }
  interface Channel {
      GameSpace: GameSpace
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.model.extend('Pc', {
    id: 'unsigned',
    name: 'string',
    skill: 'json',
    poss: 'json',
    hiy: 'json',
    att: 'json',
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
      let pc: any = new Object()
      const userId = _.session.userId
      let user: any = {}
      user.pl = (await ctx.database.getUser(_.session.platform, _.session.userId)).pl
      let skill = setPcskill(_.session, message)
      pc.skill = skill[1]
      pc.poss = []
      pc.hiy = {}
      pc.att = []
//      pc.token = user.pl.token
      pc.version = 0
      if (_.session.guildId == undefined) {
        if (user.pl.normal == undefined) {
          pc.name = "默认人物卡"
        } else {
          pc.name = user.pl.normal
        }
        if (user.pl.rule == undefined) {
          pc.rule = config.normalRule
        } else {
          pc.rule = user.pl.rule
        }
      } else {
        let Channel: any = {}
        Channel.GameSpace = (await ctx.database.getChannel(_.session.platform, _.session.guildId)).GameSpace
        if (Channel.GameSpace.pclist[userId] == undefined) {
          pc.name = "默认人物卡"
        } else {
          pc.name = Channel.GameSpace.pclist[userId]
        }
        if (Channel.GameSpace.set.rules == undefined) {
          pc.rule = config.normalRule
        } else {
          pc.rule = Channel.GameSpace.set.rules
        }
      }
      
      let [dice] = await ctx.database.get('Dice', { id: 1 })
      await ctx.database.set('Dice', { id: 1 }, { maxLogId: dice.maxPcId + 1 })
      pc.id = dice.maxPcId
      let pcall: any = await ctx.database.create('Pc', pc)
      return //JSON.stringify(pcall)
//      user.pl.normal[pcall.id] = pcall.name
//      Channem.GameSpace.pclist[_.session.guildId] = pcall.id
//      await ctx.database.setUser(_.session.platform, _.session.userId, user)
//      await ctx.database.setChannel(_.session.platform, _.session.guildId, Channel)
//      create无法获取id导致pcall.id为undefined，依据pcall结果可以基本确定数据处理没有问题
    })
}
