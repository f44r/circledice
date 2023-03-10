import { Context, Logger, Schema, Session } from 'koishi'
import { circle, Config, Character } from '.'
import { Dice_parsing, Dice_analyze } from './roll/rollDice'

export const name = 'Dice_pc'
const log = new Logger('CircleDice/pc:')



export function apply(ctx: Context, config: Config) {
  ctx.command('pc')
    .userFields(['id', 'player'])
    .channelFields(['gameSpace'])
    .option('st', '-s [content]')
    .option('del', '-d [skill]')
    .option('new', '-n [name]')
    .option('list', '-l')
    .option('rm', '-r [id]')
    .option('view', '-v')
    .option('bind', '-b [id]')
    .option('nn', '-m [name]')
    .option('all', '-a [id]')
    .action(async (argv) => {
      // 兼容常见语法
      if (argv.options.st) argv.args = ['st', argv.options.st]
      if (argv.options.del) argv.args = ['del', argv.options.del]
      if (argv.options.new) argv.args = ['new', argv.options.new]
      if (argv.options.rm) argv.args = ['rm', argv.options.rm]
      if (argv.options.bind) argv.args = ['bind', argv.options.bind]
      if (argv.options.nn) argv.args = ['nn', argv.options.nn]
      if (argv.options.all) argv.args = ['all', argv.options.all]

      const { session, args } = argv
      const { user, channel } = argv.session

      let pcData = await ctx.database.get('circledice_pc', {
        master: session.user.id
      })
      switch (args[0]) {
        case 'st': {
          let ch = await circle.getCh(user, channel?.gameSpace)
          stMain(args[1], ch, channel.gameSpace.rule)
          ch.save()
          session.sendQueued('修改成功')
          break;
        }
        case 'del': {
          let ch = await circle.getCh(user, channel?.gameSpace)
          ch.del(args[1])
          ch.save()
          session.sendQueued('删除成功')
          break;
        }
        case 'new':
          let newch = await circle.newCh(session.user)
          if (args[1]) {
            newch.name = args[1]
          } else {
            newch.name = '无名'
          }
          channel.gameSpace.team[user.id] = newch.id
          user.player.pcList[user.player.pcList.length] = newch.id
          session.sendQueued('创建成功，id:' + newch.id)
          newch.save()
          break;
        case 'list':
          let pclist = session.username + '的人物卡列表为：\n'
          pcData.forEach(pc => {
            let ch = new Character(pc, circle)
            pclist += ch.name + ' id:' + ch.id + '\n'
          })
          session.sendQueued(pclist)
          break;
        case 'rm':
          if (!Number.isNaN(+args[1])) {
            let pclist: Number[] = new Array()
            pcData.forEach(pc => {
              let ch = new Character(pc, circle)
              pclist[pclist.length] = ch.id
            })
            if (pclist.includes(Number(args[1]))) {
              if (channel.gameSpace.team[user.id] == Number(args[1])) {
                delete channel.gameSpace.team[user.id]
              }
              user.player.pcList.map((val, i) => {
                if (val == Number(args[1])) {
                  user.player.pcList.splice(i, 1)
                }
              })
              ctx.database.remove('circledice_pc', { id: Number(args[1]) })
              session.sendQueued('删除成功')
            } else {
              session.sendQueued('请删除自己的人物卡')
            }
          } else {
            session.sendQueued('参数为角色卡id（可通过pc list查看）')
          }
          break;
        case 'view': {
          let ch = await circle.getCh(user, channel?.gameSpace)
          let chData = ch.name + '的详细信息为：\n'
          ch.assets.forEach((value, key) => {
            chData += key + ':' + value + ' '
          })
          session.sendQueued(chData)
          break;
        }
        case 'bind':
          if (!Number.isNaN(+args[1])) {
            let pclist: Number[] = new Array()
            pcData.forEach(pc => {
              let ch = new Character(pc, circle)
              pclist[pclist.length] = ch.id
            })
            if (pclist.includes(Number(args[1]))) {
              channel.gameSpace.team[user.id] = Number(args[1])
              session.sendQueued('绑定成功')
            } else {
              session.sendQueued('请绑定自己的人物卡')
            }
          } else {
            session.sendQueued('参数为角色卡id（可通过pc list查看）')
          }
          break;
        case 'nn': {
          let ch = await circle.getCh(user, channel?.gameSpace)
          ch.name = args[1]
          ch.save()
          session.sendQueued('修改成功')
          break;
        }
        case 'all':
          if (!Number.isNaN(+args[1])) {
            let pclist: Number[] = new Array()
            pcData.forEach(pc => {
              let ch = new Character(pc, circle)
              pclist[pclist.length] = ch.id
            })
            if (pclist.includes(Number(args[1]))) {
              user.player.publicPc = Number(args[1])
              session.sendQueued('全局角色卡绑定成功')
            } else {
              session.sendQueued('请绑定自己的人物卡')
            }
          } else {
            session.sendQueued('参数为角色卡id（可通过pc list查看）')
          }

          break;
        default:
          session.sendQueued('请注意空格')
      }
    })

  ctx.command('sc [text]')
    .userFields(['id', 'player'])
    .channelFields(['gameSpace'])
    .action(async (argv, text) => {
      const { session } = argv
      const { user, channel } = argv.session
      let i18 = function (text: string, arr?: string[]) {
        return arr ? session.text('circledice.sc.' + text, arr) : session.text('circledice.sc.' + text)
      }

      let textArr = text.split('/')
      let skill = '意志'
      let ch = await circle.getCh(user, channel?.gameSpace)
      let san = ch.get(skill)
      let r = Math.ceil(Math.random() * 100)
      if (r == 100) {
        let max = textArr[1].replace(/d/gi, '*')
        let fun = new Function('return ' + max)
        san -= fun()
        session.sendQueued(i18('scBigFail', [ch.name, r + '/' + ch.get(skill), max + '=' + fun()]))
      } else if (r > san) {
        let Dice_Arr = Dice_parsing(textArr[1])
        Dice_Arr = Dice_analyze(Dice_Arr)
        let fun = new Function('return ' + Dice_Arr.join(''))
        san -= fun()
        session.sendQueued(i18('scFail', [ch.name, r + '/' + ch.get(skill), Dice_Arr.join('') + '=' + fun()]))
      } else {
        let Dice_Arr = Dice_parsing(textArr[0])
        Dice_Arr = Dice_analyze(Dice_Arr)
        let fun = new Function('return ' + Dice_Arr.join(''))
        san -= fun()
        session.sendQueued(i18('scSuccess', [ch.name, r + '/' + ch.get(skill), Dice_Arr.join('') + '=' + fun()]))
      }
      ch.set(skill,san)
      ch.save
    })
}

function stMain(text: string, ch: Character, rule = 'coc7') {
  switch (rule) {
    case 'coc7':
      const tempAtt = [
        '力量', '敏捷', '意志',
        '体质', '外貌', '教育',
        '体型', '智力', '幸运']
      tempAtt.forEach(x => ch.set(x, 0)) // 防止其他地方 set 时变成 number // 加入人物卡机制就无所谓了
      const tempSkill = {
        '会计': 5, '人类学': 1, '估价': 5, '考古学': 1, '取悦': 15, '攀爬': 20,
        '计算机使用': 5, '乔装': 5, '汽车驾驶': 20, '电气维修': 10, '电子学': 1,
        '话术': 5, '斗殴': 25, '手枪': 20, '急救': 30, '历史': 5, '恐吓': 15,
        '跳跃': 20, '法律': 5, '图书馆使用': 20, '聆听': 20, '锁匠': 1, '机械维修': 10,
        '医学': 1, '博物学': 10, '导航': 10, '神秘学': 5, '操作重型机械': 1, '说服': 10,
        '驾驶': 1, '精神分析': 1, '心理学': 10, '骑术': 5, '妙手': 10, '侦查': 25,
        '潜行': 20, '生存': 10, '游泳': 20, '投掷': 20, '追踪': 10, '驯兽': 5
      }
      Object.entries(tempSkill).forEach(x => ch.set(x[0], x[1]))
      let c = textParse(text); log.info(c)
      Object.entries(c).forEach(
        x =>
          ch.set(x[0], x[1]))
      if (ch.has('闪避')) ch.set('闪避', Math.ceil(ch.get('敏捷') / 2));
      if (ch.has('db')) {
        let [t1, t2] = showDB(ch.get('力量'), ch.get('体型'))
        ch.set('db', t1)
        ch.set('体格', t2)
      }
      null
      break;
  }
}

// 现在看一眼，还能优化，但是 toDo：一个真正的 DSL
/** 字符串解析函数\
 * 对于 力量50速度:60精密度=A;能力(射程=50,类型=自动)\
 * 可以解析为对象:
 * `{
  '力量':50,
  '速度':60,
  '精密度':'A',
  '能力':{
    '射程':50,
    '类型':'自动'
  }
}`
 */
function textParse(text: string) {
  text = text.replace(/:|：/g, '=').replace(/（/g, '(').replace(/）/g, ')').replace(/，|,|；/g, ';')
  let key = '', val = ''
  let ret = {}, i = 0, tag = true
  function isSem(s1: any, s2: any) {
    if (!isNaN(Number(s1))) {
      if (isNaN(Number(s2))) {
        return true
      }
    }
    return false
  }
  function isEqu(s1: any, s2: any) {
    if (isNaN(Number(s1))) {
      if (!isNaN(Number(s2))) {
        return true
      }
    }
    return false
  }
  function n2s(s: string) {
    if (isNaN(Number(s))) {
      return s
    }
    return Number(s)
  }

  while (i <= text.length) {
    if (text[i] == '(') {
      key = val
      val = ''
      tag = false
      i++
    }
    if (text[i] == ')') {
      ret[key] = textParse(val)
      key = ''
      val = ''
      tag = true
      i++
    }
    if (tag) {
      if (text[i] == '=') {
        key = val
        val = ''
        i++
      } else if (isEqu(text[i], text[i + 1])) {
        val += text[i]
        key = val
        val = ''
        i++
      }
      if (key != '') {
        if (text[i] == ';' || i == text.length) {
          key = key.replace(';', '')
          ret[key] = n2s(val)
          val = ''
          key = ''
          i++
        } else if (isSem(text[i], text[i + 1])) {
          val += text[i]
          ret[key] = n2s(val)
          val = ''
          key = ''
          i++
        }
      }
    }
    val += text[i]
    i++
  }
  return ret
}


function showDB(n1: number, n2: number) {
  const n = n1 + n2;
  const table = [
    [2, 64, '-2', '-2'],
    [65, 84, '-1', '-1'],
    [85, 124, '0', '0'],
    [125, 164, '1d4', '1'],
    [165, 204, '1d6', '2'],
    [205, 284, '2d6', '3'],
    [285, 364, '3d6', '4'],
    [365, 444, '4d6', '5'],
    [455, 524, '5d6', '6']
  ]
  let ret = table.find(x => n >= x[0] && n <= x[1])
  if (ret) {
    ret = ret.slice(-2)
    return ret
  }
  const t = Math.ceil((n - 524) / 80)
  return [String(t + 5) + 'd6', String(t + 6)]
}
