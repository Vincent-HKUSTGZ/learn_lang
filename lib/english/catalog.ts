export const catalog = [
  { id: 'hello', number: '01', title: '把第一句说出口', subtitle: 'Hello, nice to meet you', topic: '认识新朋友', level: 'A1', minutes: 12, videoId: 'I_tRSrPru94', sourceTitle: 'How to introduce yourself · Easy English Conversations', color: 'blue', emoji: '👋', goal: '介绍自己、询问名字，轻松接住下一句话。' },
  { id: 'routine', number: '02', title: '聊聊你的一天', subtitle: 'A little everyday English', topic: '日常生活', level: 'A1–A2', minutes: 15, videoId: 'bq6GBbh3uhU', sourceTitle: 'How to talk about your daily routine · Easy English Conversations', color: 'orange', emoji: '☀️', goal: '用时间和频率，把每天的小事连成一段话。' },
  { id: 'food', number: '03', title: '从喜欢的食物聊起', subtitle: 'Good food, good conversation', topic: '食物与喜好', level: 'A2', minutes: 15, videoId: '4C4wlOAscvY', sourceTitle: 'Talking about food · Real Easy English', color: 'green', emoji: '🥑', goal: '说出你的口味、解释原因，再问问对方。' },
] as const;
export type LessonId = (typeof catalog)[number]['id'];
