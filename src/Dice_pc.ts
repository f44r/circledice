import { Context, Logger, Schema, Session } from 'koishi'
import { dice, Config, Character } from '.'

export const name = 'Dice_st'
const log = new Logger('CircleDice/pc:')



export function apply(ctx: Context, config: Config) {
  ctx.command('st <text:text>')
    .userFields(['id', 'player'])
    .channelFields(['gameSpace'])
    .action(async (argv, text) => {
      const { session } = argv
      const { user,channel } = argv.session
      let ch = await dice.getCh(user, channel?.gameSpace)
      stMain(text, ch, channel.gameSpace.rule)
    })

}

function stMain(text: string, ch: Character, rule = 'coc7') {
  switch (rule) {
    case 'coc7':
      const tempAtt = [
        '力量', '敏捷', '意志',
        '体质', '外貌', '教育',
        '体型', '智力', '幸运']
      tempAtt.forEach(x => ch.set(x, 0, 'const')) // 防止其他地方 set 时变成 number
      const tempSkill = {
        '会计': 5, '人类学': 1, '估价': 5, '考古学': 1, '取悦': 15, '攀爬': 20,
        '计算机使用': 5, '乔装': 5, '汽车驾驶': 20, '电气维修': 10, '电子学': 1,
        '话术': 5, '斗殴': 25, '手枪': 20, '急救': 30, '历史': 5, '恐吓': 15,
        '跳跃': 20, '法律': 5, '图书馆使用': 20, '聆听': 20, '锁匠': 1, '机械维修': 10,
        '医学': 1, '博物学': 10, '导航': 10, '神秘学': 5, '操作重型机械': 1, '说服': 10,
        '驾驶': 1, '精神分析': 1, '心理学': 10, '骑术': 5, '妙手': 10, '侦查': 25,
        '潜行': 20, '生存': 10, '游泳': 20, '投掷': 20, '追踪': 10, '驯兽': 5
      }
      Object.entries(tempSkill).forEach(x => ch.set(x[0], x[1], 'number'))
      Object.entries(textParse(text)).forEach(x => ch.setAny(x[0], x[1]))
      if (ch.has('闪避')) ch.set('闪避', Math.ceil(ch.get('敏捷') / 2), 'const');
      if (ch.has('db')) {
        let [t1, t2] = showDB(ch.get('力量'), ch.get('体型'))
        ch.set('db', t1, 'const')
        ch.set('体格', t2, 'const')
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