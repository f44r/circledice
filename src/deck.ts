import { Context, Schema, Logger,Session } from 'koishi'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

export const name = 'deck'

export interface Config { }

export const Config = Schema.object({})

const decklist: deck[] = []
const log = new Logger('circledice/deck')

type deck = {
  name: string
  author: string
  type: string
  version: string
  brief: string
  keys: string[]
  value: Record<string, [string, number][]>
}

function createDeck(type:string): deck {
  return {
    'name': '无名牌堆',
    'author': "匿名或未留名",
    'type':type,
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
  let deckpath = path.join(rootPath, '/deck', andPath)
  if (!fs.statSync(deckpath).isDirectory()) fs.mkdirSync(deckpath);

  fs.readdir(deckpath, (err, dir) => {
    if (err) return log.error(err);

    let deckCon = ['name', 'author', 'version', 'brief', 'keys']
    let jsonCon = ['_title', '_author', '_version', '_brief', '_keys']
    let yamlCon = ['name', 'author', 'version', 'desc', 'includes']
    let jsonRex = /^::(\d)::/
    let yamlRex = /\*\*\*(\d)\*\*\*$/
    let extname = '', ralDeck: deck;

    for (const file of dir) {
      if ('asstes' == file) continue;
      extname = path.extname(file)

      fs.readFile(deckpath + file, (err, data) => {
        if (err) return log.error(file, err);
        ralDeck = createDeck(extname)
        log.info(file, 'loading...')

        switch (extname) {
          // case 'deck':
          // 解压然后递归 不得不加依赖了
          case 'json':
            deckpase(ralDeck, JSON.parse(data.toString()), jsonRex, jsonCon, deckCon)
            break;
          case 'yaml':
          case 'yml':
            deckpase(ralDeck, yaml.load(data.toString()), yamlRex, yamlCon, deckCon)
            break;
          default:
            log.warn(file, '未知后缀')
        }
      })
      decklist.push(ralDeck)
      ralDeck = null
    }
    log.info('已经载入全部牌堆')
  });
}

function toDeck2(key:string,slist,In=true){
  
}

function toDeck(key:string,slist) {
  let str = ''
  // 骰子算符
  let rdrxp = /\[([\s\S]+)\]/
  // 不放回抽取
  let jsontoDeckrex = /\{\(.+)\}/
  let yamltoDeckrex = /\{\%(.+)\}/
  // 放回抽取
  let jsontoDeckrex2 = /\{\%(.+)\}/
  let yamltoDeckrex2 = /\{\$(.+)\}/
  for (const val of decklist){
    if ( key in val.value){
      let weight = 0,sign = 0
      val.value[key].forEach(v2 => weight += v2[1])
      const target = Math.random()*weight
      for (const v2 of val.value[key]){
        sign += v2[1]
        if (sign>target){
          str = v2[0]
          break;
        }
      }
      switch (val.type){
        case 'json':
          null
      }
    }
  }
  if (str == '') return null
}

declare module 'koishi' {
  interface Channel {
    decklist: [string,number][]
  }
}

export function apply(ctx: Context) {
  ctx.on('ready', () => {
    createDeckList(ctx.baseDir)
  })

  ctx.model.extend('channel', {
    'decklist':'json'
  })
  ctx.command('deck <key>').alias('draw')
    .channelFields(['decklist'])
    .userFields(['pl'])
    .option('hide', '-h hide 暗抽')
    .action((_,key) => {
        let sInfo = {
        }
        let text = toDeck(key,sInfo)
        if (_.options.hide){}

    })
};