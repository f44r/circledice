// 定义各种类型

/** 骰子类 接口 注释见 `./src/DICE.ts` */
export interface DiceType {
  version: string
  maxPcId: number
  maxLogID: number
}

/** 游戏空间 位于 channe 表*/
export interface GameSpace {
  /** circledice 相关指令开关 */
  botOn: boolean
  /** 来自 {@link DiceType.version} */
  version: DiceType['version']
  /** 群组使用规则 */
  rule: string
  /** 群密钥 初始化时随机生成 */
  token: string
  /** 当前 log 的状态 开关,id,token*/
  nowlog?: [boolean, number, string]
  /** 小队 userId -> pcId */
  team?: Map<string, number>
  /** 日志ID -> 日志名 */
  loglist?: Map<number, string>
  /** [pcid]name -> 先攻值 */
  init?: Map<string, number>
};

/** 日志内容 */
export interface LogText {
  /** 用户帐号ID */
  uid: string
  /** 角色名 */
  pcName: string
  /** 发言，如有图片，为`![](link)`格式 */
  context: string
};

/**消息日志, 位于独立的`msglog`表*/
export interface MsgLog {
  /** 清理无用日志时使用*/
  islog: boolean
  /** 针对多个 bot 在一个群情况, 防止输出日志重复 */
  botId: string
  /** 提取特定日志使用*/
  logID?: number
  /** 来自群密钥 {@link GameSpace.token} */
  logToken?: GameSpace['token']
  /** 群组ID，格式 `平台-频道-群号`*/
  gid: string
  /** 处理撤回消息时使用 */
  mid: string
  /** 时间戳 根据时间 提取特定群日志&清理日志 时使用*/
  time: number
  /** 日志内容 类型：{@link logText} */
  logText: LogText
};

/** 角色资源 */
export interface Ats {
  /** 标识`ats.value`值的类型 */
  type: 0|1|2|3|4|5,
  /**
| type | value                      | 用途                  |
| ---- | -------------------------- | :-------------------- |
| 1    | 数字                       | COC中的技能检定       |
| 2    | 数字，但一般不可变（常量） | COC中属性             |
| 3    | 字符串，为掷骰表达式       | COC中的DB，武器的伤害 |
| 4    | 字符串，是自然语言          | 背景简介          |
| 5    | 对象，存有描述武器的属性    | COC 中的武器    |
 0 为类型不明 
 */
  value: any
}

/** 角色数据，储存在`cd-pc`表中 */
export interface Character {
  /** ID */
  id:number
  /** 角色名 */
  name: string,
  /** 来自 {@link DiceType.version} */
  version: DiceType['version'],
  /** 是否将角色在`pclist`中删除(不显示) */
  clear: boolean 
  /** 来自 {@link Player.token} */
  token: Player['token']
  /** 根据`st文本`和{@link GameSpace.rule} 生成, `角色资源名->角色资源`*/
  assets?: Map<string, Ats>
  /** 计数检定的成败次数 检定项->次数*/
  history?: {
    success?: Map<string, number>,
    fail?: Map<string, number>
  }
}

/** 玩家数据 位于`user`表 */
export interface Player {
  /** 来自 {@link DiceType.version} */
  version: DiceType['version']
  /** 个人密钥 初始化时生成 */
  token: string
  /** 全局默认 PC */
  publicPc: [number, string]
  /** 角色们的`ID`和`token` */
  pclist?: Map<number, string>
  /** 历史出目 */
  history?: {
    rolldice?: number[]
  }
};