import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ChatGroup } from './interfaces/chatGroup.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { MultiGroupConfigEntity } from './entities/multiGroupConfig.entity';
import { Repository } from 'typeorm';
import { template } from './text';
import { message } from 'telegraf/filters';
import Mustache from 'mustache';
import { User } from 'telegraf/typings/core/types/typegram';

import history from './result.json';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectRepository(MultiGroupConfigEntity)
    private multiGroupConfigEntityRepository: Repository<MultiGroupConfigEntity>,
  ) {
  }

  bot = new Telegraf(process.env.BOT_TOKEN);
  chatIds: number[] = [];

  //每个群各自一份的数据
  exclusive: Map<number, ChatGroup> = new Map();


  async onModuleInit() {
    console.log('start!');
    this.chatIds = (await this.multiGroupConfigEntityRepository.find()).map((x) => parseInt(<any>x.chatId));
    for (const chatId of this.chatIds) {
      await this.GetThisGroup(chatId);
    }


    this.bot.on(message('text'), (ctx) => this.OnMessage(ctx));
    this.bot.on(message('new_chat_members'), (ctx) => this.Welcome(ctx));

    return this.bot.launch({
      allowedUpdates: ['chat_member', 'message', 'chat_join_request', 'callback_query'],
    });
  }

  async Welcome(ctx: any) {
    console.log('welcome');
    if (ctx.chat.type != 'supergroup' && ctx.chat.type != 'group') return console.log(ctx.chat.id, '不是群组');

    const chatId = ctx.chat.id;
    const thisgroup = await this.GetThisGroup(chatId, ctx.chat.title);
    const user = ctx.message['new_chat_member'];
    if (user.is_bot) return;

    const username = this.GetFullName(ctx.message.from);

    for (const key of thisgroup.blockKeys) {

      if (username.includes(key.toString())) {
        try {
          await this.bot.telegram.unbanChatMember(chatId, user.id);
        } catch (error) {
          console.log(error);
        }
        return;
      }
    }

    let welcome = Mustache.render(template.hello, {
      username: username,
    });
    welcome += template.speak_please;

    const msg = await this.bot.telegram.sendMessage(chatId, welcome);
    thisgroup.unspokenTimer.set(
      user.id,
      setTimeout(async () => {
        if (thisgroup.unspokenTimer.has(user.id)) {
          const reply_msg = await ctx.reply(template.unspoken, {
            reply_to_message_id: ctx.message.message_id,
            allow_sending_without_reply: true,
          });
          try {
            await this.bot.telegram.unbanChatMember(chatId, user.id);
          } catch (error) {
            console.log(error);
          }
          this.bot.telegram.deleteMessage(chatId, msg.message_id).catch(console.error);
          this.AutoDelete(chatId, [reply_msg.message_id], 10);
        }
        thisgroup.unspokenTimer.delete(user.id);
      }, 5 * 60 * 1000),
    );
    thisgroup.unspokenWarningTimer.set(
      user.id,
      setTimeout(async () => {
        const msg = await ctx.reply(template.unspoken_warning, {
          reply_to_message_id: ctx.message.message_id,
          allow_sending_without_reply: true,
        }).catch(console.log);
        thisgroup.unspokenWarningTimer.delete(user.id);
        this.AutoDelete(chatId, [msg.message_id], 10);
      }, 3 * 60 * 1000),
    );
  }

  async OnMessage(ctx: any) {
    console.log(ctx.chat.id);
    if (ctx.chat.type != 'supergroup' && ctx.chat.type != 'group') return console.log(ctx.chat.id, '不是群组');
    const chatId = ctx.chat.id;
    const user = ctx.message.from;
    const thisgroup = await this.GetThisGroup(chatId, ctx.chat.title);
    //把新人从待发言名单中删除
    await this.ClearSpokenTimer(chatId, user.id);
  }


  async GetThisGroup(chatId: number, chatName?: string) {
    if (!this.exclusive.has(chatId)) {
      await this.multiGroupConfigEntityRepository.upsert({ chatId, chatName }, ['chatId']);
      this.exclusive.set(chatId, {
        chatId,
        unspokenWarningTimer: new Map(),
        unspokenTimer: new Map(),
        blockKeys: (await this.multiGroupConfigEntityRepository.findOneBy({ chatId: chatId })).blockKeys,
      })
      ;
    }
    return this.exclusive.get(chatId);
  }

  AutoDelete(chatId, message_ids: number[], time = 15) {
    setTimeout(() => {
      for (const msg_id of message_ids) {
        this.bot.telegram.deleteMessage(chatId, msg_id).catch(console.error);
      }
    }, time * 1000);
  }

  async ClearSpokenTimer(chatId: number, id: number) {
    const thisgroup = await this.GetThisGroup(chatId);
    if (thisgroup.unspokenTimer.has(id)) {
      clearTimeout(thisgroup.unspokenTimer.get(id));
      clearTimeout(thisgroup.unspokenWarningTimer.get(id));
      thisgroup.unspokenTimer.delete(id);
      thisgroup.unspokenWarningTimer.delete(id);
    }
  }

  GetFullName(user: User) {
    return user.first_name + (user.last_name ? ' ' + user.last_name : '');
  }

  // async DealWithHistory() {
  //
  //   const blockKeys = (await this.multiGroupConfigEntityRepository.findOneBy({ chatId: -959569574 })).blockKeys;
  //   const ids = [];
  //   const names = [];
  //
  //   for (const msg of history.messages) {
  //     const name = msg.actor;
  //     if (name == null || name == '') continue;
  //     if (names.includes(name)) continue;
  //
  //     for (const key of blockKeys) {
  //       if (name.includes(key)) {
  //         const userId = parseInt((msg.from_id ?? msg.actor_id).slice(4));
  //         names.push(name);
  //         ids.push(userId);
  //       }
  //     }
  //   }
  //   for (const id of ids) {
  //     try {
  //       await this.bot.telegram.banChatMember(-959569574, id);
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   }
  // }
}
