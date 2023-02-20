declare namespace vm {
    export function newVM(): VM
    export interface Flags  {
        PrintBytecode: boolean,
        EnableDiceWoD: boolean,
        EnableDiceCoC: boolean,
        EnableDiceFate: boolean,
        EnableDiceDoubleCross: boolean,
        disableStmts: boolean,
    }
    export interface Error {
        error():string
    }
    export interface Ret {
        ToString():string
    }
    export interface VM {
        Run(text: string): void
        Flags:Flags
        Error:Error
        RestInput:string
        Detail:string
        Ret:Ret
    }
}
export { vm } 