import { Context,Session } from 'koishi'
import { Dice, Pc, GameSpace } from './Dice_class'
import crypto from 'crypto'

var data = {
    getpc: async (session:Session):Promise<Pc>=>{
        if (session.guildId){
            session.getUser('pl')
        }
        let ctx:Context;
        ctx.database.get('Pc','')

        return {}
    },
    setpc:()=>{},
    gettoken:(x:string)=>{
        const pwd = 'pwd';
        const hash = crypto.createHmac('md5', pwd).update(x).digest('hex');
        return hash
    }
}

export default data
