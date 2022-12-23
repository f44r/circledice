import { Context, Schema, Logger } from 'koishi'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

export const name = 'deck'

export interface Config { }

export const Config = Schema.object({})

const log = new Logger('circledice/deck')

type deck = {
  name: string[] | string
  author: string[] | string
  type: string
  version: string[] | string
  brief: string[] | string
  keys: string[]
  value: Record<string, [string, number][]>
}

const decklist: deck[] = []

function createDeck(type: string): deck {
  return {
    'name': '无名牌堆',
    'author': "匿名或未留名",
    'type': type,
    'version': '0',
    'brief': '作者认为无需介绍，大概',
    'keys': [],
    'value': {}
  }
}

function deckpase(ralDeck: deck, deckVal: any, rex: RegExp, con1: string[], con2: string[]) {
  let tmp: RegExpMatchArray;
  let index = 0
  for (const k in deckVal) {
    if (con1.includes(k)) {
      index = con1.indexOf(k)
      ralDeck[con2[index]] = deckVal[k]
    } else {
      deckVal[k].forEach((val: string) => {
        tmp = val.match(rex)
        if (tmp) {
          val = val.replace(rex, '')
          ralDeck.value[k].push([val, (tmp[1] as unknown as number)])
        } else {
          ralDeck.value[k].push([val, 1])
        }
      });
    }
  }
}

function createDeckList(rootPath, andPath = '') {
  let deckpath = path.join(rootPath, '/deck/_deck', andPath)
  if (!fs.statSync(deckpath).isDirectory()) fs.mkdirSync(deckpath);

  fs.readdir(deckpath, (err, dir) => {
    if (err) return log.error(err);

    let deckCon = ['name', 'author', 'version', 'brief', 'keys']
    let jsonCon = ['_title', '_author', '_version', '_brief', '_keys']
    let yamlCon = ['name', 'author', 'version', 'desc', 'includes']
    let jsonRex = /^::(\d+)::/
    let yamlRex = /\*\*\*(\d+)\*\*\*$/
    let extname = '', ralDeck: deck;

    for (const file of dir) {
      if ('asstes' == file) continue;
      extname = path.extname(file)
      fs.readFile(deckpath + file, (err, data) => {
        if (err) return log.error(file, err);
        log.info(file, 'loading...')

        switch (extname) {
          // case 'deck':
          // 解压然后递归 不得不加依赖了
          case 'json':
            ralDeck = createDeck('json')
            deckpase(ralDeck, JSON.parse(data.toString()), jsonRex, jsonCon, deckCon)
            break;
          case 'yaml':
          case 'yml':
            ralDeck = createDeck('yaml')
            deckpase(ralDeck, yaml.load(data.toString()), yamlRex, yamlCon, deckCon)
            break;
          default:
            log.warn(file, '未知后缀')
        }
      })
      decklist.push(ralDeck)
      ralDeck = null
    }

    log.info(`已载入${deckpath}下的全部牌堆文件`)

    //deckpath = path.join(rootPath,'/deck')
    // circle 格式
  });
}

function toDeckpond(key: string, sInfo: any): string {

  return ''
}

function toDeck(key: string, sInfo: any, deck: deck): string {
  let str = ''
  if (key in deck.value) {

    let weight = 0, sign = 0
    deck.value[key].forEach(v2 => weight += v2[1])
    const target = Math.random() * weight
    for (const v2 of deck.value[key]) {
      sign += v2[1]
      if (sign > target) {
        str = v2[0]
        break;
      }
    }

    let rdrxp = /\[([\s\S]+)\]/ // 执行脚本

    let rex: RegExp;
    switch (deck.type) {
      case 'circle':
        rex = /\{(\%|\$)(.+)\}/ // {%}不放回 {$}放回
        break;
      case 'json':
        ['{player}', '[$t玩家]', '{nick}'].forEach(x => str.replaceAll(x, sInfo.name))
        rex = /\{(\%){0,}(.+)\}/ // {}不放回 {%}放回
        break;
      case 'yaml':
        str.replaceAll('【name】', sInfo.name)
        rex = /\{(\%|\$)(.+)\}/ // {%}不放回 {$}放回
        break;
    }
    let tmp: RegExpMatchArray = str.match(rex)
    let i = 0
    while (tmp) {
      if (i > 1000) str = '牌组 ' + key + ' 嵌套过多';
      i++
      if (tmp[1]) str = str.replace(rex, toDeckpond(tmp[2], sInfo))
      str = str.replace(rex, toDeck(tmp[2], sInfo, deck))
      tmp = str.match(rex)
    }
  }

  if (str == '') return '末找到对应牌组：' + key
  return str
}

function Deck(key: string, sInfo: any): string {
  let text = ''
  for (const deck of decklist) {
    text = toDeck(key, sInfo, deck)
  }
  return text
}

declare module 'koishi' {
  interface Channel {
    decklist: [string, number][]
  }
  interface User {
    decklist: [string, number][]
  }
}

export function apply(ctx: Context) {
  ctx.on('ready', () => {
    createDeckList(ctx.baseDir)
  })

  ctx.model.extend('channel', {
    'decklist': 'json'
  })
  ctx.model.extend('user', {
    'decklist': 'json'
  })
  ctx.command('deck <key>').alias('draw')
    .channelFields(['decklist'])
    .userFields(['decklist'])
    .option('hide', '-h hide 暗抽')
    .action((_, key) => {
      let sInfo = {
        pond: _.session.subsubtype == 'private' ? _.session.user.decklist : _.session.channel.decklist,
        name: _.session.username
      }
      let text = Deck(key, sInfo)
      if (_.options.hide) { }

    })
};