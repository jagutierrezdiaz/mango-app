// src/realtime/realtimeRedisAdapter.js
import { randomUUID } from 'crypto';
import IORedis from 'ioredis';

export function createRealtimeRedisAdapter(hub, {
  redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  prefix = process.env.REALTIME_REDIS_PREFIX || 'pb:realtime',
  instanceId = process.env.INSTANCE_ID || randomUUID()
} = {}) {
  if (!hub) throw new Error('hub required');

  const channel = `${prefix}:events`;
  const sub = new IORedis(redisUrl);
  const pub = new IORedis(redisUrl);

  sub.subscribe(channel).catch(err => {
    console.error('[redis-adapter] subscribe error', err);
  });

  sub.on('message', (ch, raw) => {
    if (ch !== channel) return;
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }
    if (!payload || payload.origin === instanceId) return;

    try {
      if (payload.type === 'broadcast') {
        hub.broadcast(payload.event, payload.data);
      } else if (payload.type === 'room' && payload.room) {
        hub.emitToRoom(payload.room, payload.event, payload.data);
      }
    } catch (err) {
      console.error('[redis-adapter] apply message error', err);
    }
  });

  const originalBroadcast = hub.broadcast.bind(hub);
  hub.broadcast = (event, data) => {
    originalBroadcast(event, data);
    try {
      pub.publish(channel, JSON.stringify({ origin: instanceId, type: 'broadcast', event, data }));
    } catch (err) {
      console.error('[redis-adapter] publish broadcast error', err);
    }
  };

  const originalEmitToRoom = hub.emitToRoom.bind(hub);
  hub.emitToRoom = (room, event, data) => {
    originalEmitToRoom(room, event, data);
    try {
      pub.publish(channel, JSON.stringify({ origin: instanceId, type: 'room', room, event, data }));
    } catch (err) {
      console.error('[redis-adapter] publish room error', err);
    }
  };

  return {
    close: async () => {
      try { await sub.quit(); } catch (_e) {}
      try { await pub.quit(); } catch (_e) {}
    },
    instanceId
  };
}
