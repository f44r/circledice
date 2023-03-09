// 快捷指令，可以被 r 取代。
import { Context, Logger, Schema, Session } from 'koishi'
import { circle, Config } from './index'

export const name = 'cmd'
const log = new Logger('CircleDice/cmd:')

export function apply(ctx: Context, config: Config) {
  ctx.command('ra [skill]')
    .channelFields(['gameSpace'])
    .userFields(['id', 'player'])
    .action(async (argv, skill) => {
      const { user, channel } = argv.session
      const { session } = argv
      let i18 = function (text: string, arr?: string[]) {
        return arr ? session.text('circledice.ra.' + text, arr) : session.text('circledice.ra.' + text)
      }
      let ch = await circle.getCh(user, channel ? channel.gameSpace : null)
      let gamerule = channel.gameSpace.rule
      if (gamerule == undefined) {
        gamerule = 'coc7/1'
      }

      log.info(ch.assets)
      if (!Number.isNaN(+ch.get(skill))) {
        let r = Math.ceil(Math.random() * 100)
        let ra = [ch.name, skill, r + '/' + ch.get(skill)]
        if ((gamerule == 'coc7/1' && ((ch.get(skill) < 50 && r > 95) || (ch.get(skill) >= 50 && r == 100))) ||
          (gamerule == 'coc7/2' && (r == 100 || (r > 95 && r > ch.get(skill)))) ||
          (gamerule == 'coc7/3' && r > 95)
        ) {
          session.sendQueued(i18('raBigFail', ra))
        } else if (
          (gamerule == 'coc7/1' && ((ch.get(skill) < 50 && r == 1) || (ch.get(skill) >= 50 && r < 6))) ||
          (gamerule == 'coc7/2' && (r == 1 || (r < 6 && r < ch.get(skill)))) ||
          (gamerule == 'coc7/3' && r < 6)
        ) {
          session.sendQueued(i18('raBigSuccess', ra))
        } else if (r > +ch.get(skill)) {
          session.sendQueued(i18('raFail', ra))
        } else if (r < Math.floor(+ch.get(skill) / 5)) {
          session.sendQueued(i18('raDifficultSuccess', ra))
        } else if (r < Math.floor(+ch.get(skill) / 2)) {
          session.sendQueued(i18('raHardSuccess', ra))
        } else {
          session.sendQueued(i18('raSuccess', ra))
        }
      } else {
        //这是复杂skill，如枪械
      }
    })

  ctx.command('roll [text]')
    .action((_, text) => {
      return JSON.stringify(circle.roll(text))
    })
  ctx.command('save')
    .action(async (_, text) => {
      let a = await ctx.database.create('circledice_pc', {
        'master': 0,
        'assets': [
          ['maxPcId', { type: 1, value: 1 }],
          ['name', { type: 4, value: 'knight' }]
        ],
        'history': {}
      })
      log.info(JSON.stringify(a))
    })
}
