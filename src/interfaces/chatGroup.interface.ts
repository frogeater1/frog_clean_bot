export interface ChatGroup {
  //也在对象中记录chatId
  chatId: number;
  //以下两个为了新人5分钟发言验证<userId,timerId>
  unspokenWarningTimer: Map<number, NodeJS.Timeout>;
  unspokenTimer: Map<number, NodeJS.Timeout>;
  blockKeys: string[];
}
