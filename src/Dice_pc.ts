import { Context, Logger, Schema, Session } from 'koishi'
import { Config } from './config'
import { GameSpace, Character, Player } from './lib/types'
import Api from './Api'

export const name = 'Dice_st'
const log = new Logger('CircleDice/pc:')

declare module 'koishi' {
  interface Tables {
    'cd-pc': Character
  }
  interface User {
    player: Player
  }
  interface Channel {
    gameSpace: GameSpace
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.model.extend('cd-pc', {
    'id': 'unsigned',
    'name': 'string',
    'version': 'string',
    'clear': 'boolean',
    'token': 'string',
    'assets': 'json',
    'history': 'json'
  })
  ctx.model.extend('user', {
    player: 'json',
  })
  ctx.model.extend('channel', {
    gameSpace: 'json',
  })
  ctx.command('st <text:text>')
    .userFields(['player'])
    .channelFields(['gameSpace'])
    .action((argv, text) => {

    })

}

function createCha(): Character {
  return {
    'id': Api.newChaId(),
    'name': 'knight',
    'clear': false,
    'token': '',
    'version': Api.getDiceVersion()
  }
}

function newCha(text: string, rule = 'coc7') {
  let cha = createCha()
  const rexRet = text.match(/^([\s\S]{1,10}?)-/)
  if (rexRet) {
    cha.name = rexRet[1];
    text = text.slice(rexRet[0].length)
  }

  let assets: Character['assets'] = new Map(),cache:any
  switch (rule) {
    case 'coc7':
      const tempAtt = [
        '力量', '敏捷', '意志',
        '体质', '外貌', '教育',
        '体型', '智力', '幸运']
      tempAtt.forEach(x => assets.set(x, { type: 2, value: 50 }))
      const tempSkill = {
        '会计': 5, '人类学': 1, '估价': 5, '考古学': 1, '取悦': 15, '攀爬': 20,
        '计算机使用': 5, '乔装': 5, '汽车驾驶': 20, '电气维修': 10, '电子学': 1,
        '话术': 5, '斗殴': 25, '手枪': 20, '急救': 30, '历史': 5, '恐吓': 15,
        '跳跃': 20, '法律': 5, '图书馆使用': 20, '聆听': 20, '锁匠': 1, '机械维修': 10,
        '医学': 1, '博物学': 10, '导航': 10, '神秘学': 5, '操作重型机械': 1, '说服': 10,
        '驾驶': 1, '精神分析': 1, '心理学': 10, '骑术': 5, '妙手': 10, '侦查': 25,
        '潜行': 20, '生存': 10, '游泳': 20, '投掷': 20, '追踪': 10, '驯兽': 5
      }
      Object.keys(tempSkill).forEach((x, y) => assets.set(x, { type: 1, value: Object.values(tempSkill)[y] }))

      cache = textParse(text)
      if(!cache[0]) return [false,cache[1]]
      cache = cache[1] as object
      for(const key in cache){
        switch (typeof cache[key]){
          case 'number':
            assets.set(key,{type:1,value:cache[key]})
            break
        }
      }

      break;
  }
  cha.assets = assets
  return ['yes',cha]
}

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
function textParse(text: string): [boolean, object] {
  text = text.replace(/:|：/g, '=').replace(/（/g, '(').replace(/）/g, ')').replace(/，/g, ',')
  let key = '', val = '', cache = []
  let ret: object = {}, i = 0
  function isSem(s1: string, s2: string) {
    if (isNaN(Number(s1))) {
      if (!isNaN(Number(s2))) {
        return true
      }
    }
    return false
  }
  function isEqu(s1: string, s2: string) {
    if (!isNaN(Number(s1))) {
      if (isNaN(Number(s2))) {
        return true
      }
    }
    return false
  }
  while (i <= text.length) {
    val += text[i]
    if (text[i] == '(') {
      key = val
    }
    if (text[i] == ')') {
      cache = textParse(val)
      if (cache[0]) {
        return [false, cache[1]]
      }
      ret[key] = cache[1]
    }
    if (text[i] == '=' || isEqu(text[i], text[i + 1])) {
      key = val
    }
    if (text == ';' || isSem(text[i], text[i + 1])) {
      ret[key] = val
    }
    i++
  }
  return [true, ret]
}
