import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class MultiGroupConfigEntity {
  @PrimaryColumn('bigint')
  chatId: number;

  @Column({ default: null })
  chatName: string;


  @Column({ default: 1, comment: '5分钟不发言踢人功能是否开启,0:关,1:开' })
  kick_unspoken: number;

  @Column({ default: 1, comment: '是否自动删除欢迎消息,0:关,1:开' })
  welcome_delete: number;


  @Column({ type: 'text', default: [], array: true, comment: '踢人关键词' })
  blockKeys: string[];

}
