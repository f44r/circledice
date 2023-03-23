import { CharacterData, log, Rule } from "../index";
import { Circle } from "../Circle";

export class Character {
  id: number
  master: number
  assets: Map<string, any>
  history = {}
  circle: Circle
  lastUpDataTime = Date.now()
  #Timeout: NodeJS.Timeout

  constructor(ele: CharacterData, circle: Circle) {
    this.circle = circle
    this.assets = new Map(ele.assets)
    this.id = ele.id
    this.master = ele.master
  }

  get name() {
    return this.assets.get('_name') ?? '无名'
  }

  set name(val: string) {
    this.assets.set('_name', val)
  }

  get rule(): Rule {
    return this.assets.get('_rule') ?? 'coc7'
  }

  set rule(val: Rule) {
    this.assets.set('_rule', val)
  }

  /** 获取角色卡数据 不存在返回 1*/
  get(key: string) {
    switch (this.rule){
      case 'coc7':
        return 1
    }
  }

  /** 删除角色卡数据 */
  del(key: string) {
    this.assets.delete(key)
    this.#save()
  }

  /** 添加或修改角色数据 */
  set(key: string, value: any) {
    this.assets.set(key, value)
    this.#save()
  }

  has(k: string) {
    return this.assets.has(k)
  }

  /**
   * 设置角色历史记录，用于 en 指令
   * @param k 技能名
   * @param b 成功还是失败
   */
  AddHiy(k: string, b: boolean) {
    this.history[this.rule] ? this.history[this.rule] = {} : null;
    if (this.rule == 'coc7') {
      this.history[this.rule][k] ? this.history[this.rule][k] = {} : null
      const sf = b ? 'sucess' : 'fail'
      this.history[this.rule][k][sf] ? this.history[this.rule][k][sf]++ : this.history[this.rule][k][sf] = 1
    }
    this.#save()
  }

  #_save() {
    let ele: CharacterData = {
      'id': this.id,
      'master': this.master,
      'assets': [...this.assets],
      'history': this.history,
    }
    this.circle.ctx.database.upsert('circledice_pc', [ele])
      .then(() => log.info(`更新角色 [${this.id}]${this.name} 数据 | ${new Date(this.lastUpDataTime + 1000).toLocaleString()}`))
  }

  #save() {
    const now = Date.now()
    if (now - this.lastUpDataTime < 1000) {
      // 两次 save 时间小于 1 s 重新设置保存操作
      this.#Timeout ? clearTimeout(this.#Timeout) : null
      this.#Timeout = setTimeout(() => { this.#_save() }, 1000) // 用箭头函数确定 this 指向
    } else {
      // 延迟保存操作 防抖
      this.#Timeout = setTimeout(() => { this.#_save() }, 1000)
      this.lastUpDataTime = now
    }
  }
}
