// 没用，但能消灭 ts 报错，提供一些聊胜于无的提示

interface Dice {
    id?:number,
    lastClearTime: number
    maxPcId: number
    maxLogId: number
}

interface skill {
    name?:string,
    limit?:string,
    exp?:string
}

interface Pc {
    id?: number
    name?: string
    skill?: skill[]
    poss?: string[]
    hiy?: object
    att?: string[]
    rule?: string
    token?: string
    version?: number
}

interface GameSpace {
    set?: {
        bot: boolean,
        rule: string
    }
    pclist?: {[userid: string]: Pc['id']},
    loglist?: logis[]
    hiy?: {
        lastTime: number,
        lastlogid:number
    },
    token?: string
    version?: number
}

interface logis {
    logid?: number,
    name?: string,
    tag?: boolean
}

interface pl {
    pc?: object,
    pclist?: { [userid: number]: Pc['id'] }
    token?: string,
    version?: number
}

interface Gamelog {

}


export { Dice, Pc, GameSpace, logis, pl ,Gamelog}
