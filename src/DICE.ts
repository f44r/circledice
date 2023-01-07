import { Context, Session } from 'koishi'
import { Character,DiceType,Player } from './lib/types'
import { createHmac } from 'crypto'

class DICE {
  /**之后所有的 version 属性都来自这里 供后续版本数据结构升级使用 */
  version: string = 'dev'
  maxpcid:number
  maxlogid:number
  /** 用角色卡机制存一些零散的数据 */ // 因为单独开一张表来存既麻烦又浪费
  knight: Character
  chaAll: Map<number,Character> = new Map()

  constructor(ctx: Context) { // todo botID:string[]=[] 多 bot 配置页面
    this.loadDice(ctx)
    .then((x)=>{
      this.maxlogid = x.get('maxlog').value
      this.maxpcid = x.get('maxpc').value
    })
  }

  /** 加载骰子数据 */
  async loadDice(ctx: Context) {
    [this.knight] = await ctx.database.get('circledice_pc', [1])
    if (!this.knight) {
      this.knight = {
        'id': 1,
        'name': 'knight',
        'clear': false,
        'token': 'x',
        'version': this.version,
        'assets': new Map([
          ['maxpc', { type: 1, value: 1 }],
          ['maxlog', { type: 1, value: 0 }],
          ['lastTime', { type: 1, value: Date.now() }],
          ['desc', { type: 4, value: '初号机屹立于大地之上' }] // 虽然没有意义,但很有意义(
        ])
      }
      await ctx.database.upsert('circledice_pc', [this.knight])
    }
    ctx.database.get('circledice_pc', {id: { $gt: 0 }})
    .then((x)=>{
      x.forEach((x2)=>this.chaAll.set(x2.id,x2))
    })
    return this.knight.assets
  }
  /** 保存骰子数据 */
  async save(ctx: Context) {
    let rows = []
    for ( let row  of this.chaAll ){
      rows.push(row[1])
    }
    await ctx.database.upsert('circledice_pc',rows)
  }

  /** 使 `maxpcid` +1，返回+1后 `maxpcid` */
  newChaId() {
    this.maxpcid++
    return this.maxpcid
  }
  /** 使 `maxlogid` +1，返回+1后 `maxlogid` */
  newLogId(){
    this.maxlogid++
    return this.maxlogid
  }

  /** 根据 ID 加盐生成 token 
   * @param 应为群组ID或者个人ID
  */
  getToken(x: string): string {
    const pwd = 'pwd';// 或许可以提供一个配置项
    const hash = createHmac('md5', pwd).update(x).digest('hex');
    return hash
  }

  // 有一说一还是不够便捷，要不再写一个玩家类 new PL(Player,GameSpace) 或者 createPL 方便判断当前群有没有对应角色卡

  /** 快速设置角色资源值 
   * @param n 角色卡`ID` 或者 玩家对象，将自动访问`nowPc[0]`获取`ID`
   * @param a1 资源键值
   * @param a2 资源值
   * @param type 可选 指定资源类型
  */
  setChaAs(n:Player|number, a1: string, a2: any,type=0) {
    let id:number
    if(typeof n == 'number'){
      id = n
    }else{
      id = n.publicPc[0]
    }
    let assets = this.chaAll.get(id).assets
    const model: [0, 1, 2, 3, 4, 5] = [0, 1, 2, 3, 4, 5]
    let i = 0
    if(type!=0){
      i = type
    }else{
      switch (typeof a2) {
        case 'number':
          i = 1
          break;
        case 'string':
          if (a2.match(/^((\d*)d)?(\d+)(\+((\d*)d)?(\d+))*$/i)) { // todo 这里需要 rd 的 api,先简单判断一下吧
            i = 3
          } else {
            i = 4
          }
          break;
        case 'object':
          i = 5
          break;
        default:
          i = type
      }
    }
    assets.set(a1,{type:model[i],value:a2})
  }

  /** 快速获取角色资源值 */
  getChaAs(n:Player|number, key: string) {
    let id:number
    if(typeof n == 'number'){
      id = n
    }else{
      id = n.publicPc[0]
    }
    let assets = this.chaAll.get(id).assets 
    return assets.get(key).value
  }
}


export { DICE }