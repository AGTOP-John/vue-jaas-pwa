import express from 'express'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import fs from 'fs'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import 'dotenv/config' 
import dotenv from 'dotenv'


import path from 'path'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
// app.use(cors())
// CORS: locked to your Netlify site in production (fallback * for dev)
const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || '*'
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: false }))
app.use(bodyParser.json())

// === 換成你在 JaaS Console 取得的資訊 ===
// const APP_ID = 'vpaas-magic-cookie-e6818684269b43f892662594c6ebeec3' // sub
const APP_ID = process.env.JAAS_APP_ID
// const KID = 'vpaas-magic-cookie-e6818684269b43f892662594c6ebeec3/39cb1b'                           // JWT header 的 kid
const KID = process.env.JAAS_KID
/*const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCy245sOJHxbKW+
O58FgaWvWNJy1KBoy7RhshLHTyf3Haii1B4qCa/TkSSjxKhC/Qy5semX/OKO5mLY
t18bY7lCDponofkm5wqSs5L6WdtIOK0lg46efrZKkjatswXlBqPhxnoPr7oKrxJq
mdaGjKStktOzvFgxpRHSzd07ZMaRE43We9a2J9GYduhZ/JNLDO26TlU0rTyzJk1D
/aoxfRBwHL4nC5DYPMB3LEhs/4uieA1/J2/+1r2jw0pRCOwbwj1O0lsKcCc88+2/
wnbmoKMfuqhDdqwr9TndME5Wje4YAvW9lIhpUtTjBAQU0NW8oO9PjwI5ljVkZAj6
yx6ng0t9AgMBAAECggEBAKAslbB/PNvrg8cIV9Izl/CfZ+BkYL9Y5lKzibOqRM0+
Z15i/hyBjk+25Qwwuss7GWFXXi250B9PXWhdV7QMq8TnlNA3cwyOzl4wqUjAnetg
rlcxKNDyA0hnBsap03aWar9v4rIXmlGlFaYX3RGj9HppSmPlIUpcXMjfied9yYHz
c17OCtEsqXw54xlXzi1DojG6Bou9oAWuokjPUTda3kaxyzyxOkCZRk+X1Oib3kjm
DP017LiANGmTZ4LSK23Tji92n/aAi5E8ibjlIoS+aNt+G2uCQAKtbPXhpgZ7GAOi
SxM/9keRlAgf/PYSTrkghCzKiw/P7wBHORrPqRH1B9UCgYEA6SlL5ypVFxhhhrzu
ToDZ91H0renOEbZAJEWtGZ0z2k9mZwpcbo6rVbphIXffti8LJhsQ1WwkAVlQ3Lpy
lnPfAUcMl0Qw0Z9eietkSyPLmG07VWYCd9uZCZOLWcKzvPCGxVtukw0h3mUBdgck
gBbOp4ZTGA4j6U6lQHGxypt62CcCgYEAxGCNcR4gHzTpAK365CYd3wAflnB7qIHA
yuF1Zni6Q0xMuSnu7iWX/9RlENdUZg0DOdvgpfba01BA3UABoU2RPaYFO1lWzhyr
Vr8eHry3nCNxUpZrLFCLt3fUPyjtC8iFvh96QvNKOVRtuGJ6oMl7j8W3HF5RiC+F
zZl3LYrewbsCgYAOvGttqsFB+mp/h4VQNNiRxv49158Mg4Y+RKESE1tpmscQEBmT
azTs8CCfauIas5Jy0BcaRgFojGqN6MLBO4WGoSTskoS7WuUwtk3aaeK+OXkchpv1
U02yyz5tZ97QPCtoYcT1SkkvsxaKjR0Dc22QLO8ngA1I+416KzVfZsA21QKBgAur
CPxto87239lQfRXNRf0YDshrio1qmD/1wXoDNl4FTJG78hxoU225+v9TLAqcP1LS
w7hYwIvJuvDqeq5Q445cLPdnyYaZoXyYAnwlDmvSl0sm8NtDNeoCzrOqBNusYHX5
fNQ5jHF3mMVZ5JtlHVhfkQ+4cvO6jyK2OaSVGcM9AoGAWzjoJK8HLDGwma/euys2
z/wiKBCsLR8HB3qXzKvEgRq0NGC26GvM1IcMlbZm3S7rAo/uwa2Cz/TW1lM6Ji/l
/D2p5Z+IcLjs0MiyTLDIPe8k6dEeAthcpvfV5nd0i+qxNEjSwbOXZscdt608ce4/
WFVW3lDErGUFwOloWOBz6bo=
-----END PRIVATE KEY-----`
*/





// ✅ ESM 環境下取得 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// ✅ 定義資料儲存目錄
const DATA_DIR = path.resolve(__dirname, './data')              // <-- 指向 server/../data
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json')           // 簽發紀錄
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')       // 會議事件（webhook）

ensureFiles()

function ensureFiles () {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, JSON.stringify({ tokens: [] }, null, 2))
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ events: [] }, null, 2))
}

const loadJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8') || '{}')
const saveJSON = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2))
const monthKey = (ts = Date.now()) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
}
const shortHash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)


// 2025/08/18 ===== 第一位進房者 = 主持人（房內鎖）=====
/**
 * 前端先呼叫這個取得「第一人」：
 * GET /api/room/claim-host?room=ROOM&uid=UUID
 * → { isHost: boolean, hostId: string }
 */
const roomHosts = new Map() // room -> hostUid
app.get('/api/room/claim-host', (req, res) => {
  const { room, uid } = req.query
  if (!room || !uid) return res.status(400).json({ error: 'room & uid required' })
  if (!roomHosts.has(room)) roomHosts.set(room, uid) // 第一個呼叫者成為主持人
  const hostId = roomHosts.get(room)
  res.json({ isHost: hostId === uid, hostId })
})

// ===== 每次都簽新 token（方案A：主持人寫入 JWT）=====
function issueNewToken({ room, name = 'Guest', email = '', isHost = false }) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: 'jitsi',
    iss: 'chat',         // 固定
    sub: APP_ID,         // 你的 JaaS tenant
    room,                // 指定房名（不建議用 '*'）
    iat: now,
    nbf: now - 10,
    exp: now + 60 * 60 * 24 * 30, // 30 天
    jti: crypto.randomUUID(),
    context: {
      user: {
        name,
        email,
        ...(isHost ? { moderator: 'true' } : {}) // ★ 主持人寫進 JWT
      }
    }
  }
  const token = jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    header: { kid: KID, typ: 'JWT' }
  })

  // 記錄發放日誌
  const db = loadJSON(TOKENS_FILE)
  db.tokens = db.tokens || []
  db.tokens.push({
    month: monthKey(),
    ts: Date.now(),
    room, name, email,
    iat: payload.iat,
    exp: payload.exp,
    jti: payload.jti,
    isHost
  })
  saveJSON(TOKENS_FILE, db)

  return token
}

/**
 * 建議用的端點：POST /api/get-jwt
 * body: { room, name, email, uid }
 * 流程：
 *   1) 前端先打 /api/room/claim-host 取得 isHost
 *   2) 再把同一個 uid 帶過來，我們依房內鎖決定是否在 JWT 寫入 moderator
 */
app.post('/api/get-jwt', (req, res) => {
  try {
    const { room, name = 'Guest', email = '', uid } = req.body || {}
    if (!room) return res.status(400).json({ error: 'room is required' })

    const isHost = uid && roomHosts.get(room) === uid
    const token = issueNewToken({ room, name, email, isHost })
    res.json({ token, isHost })
  } catch (e) {
    console.error('[POST /api/get-jwt] error:', e)
    res.status(500).json({ error: 'JWT generation failed' })
  }
})

// 舊版相容：GET /api/jaas/token（不含主持人判斷，單純簽新）
app.get('/api/jaas/token', (req, res) => {
  try {
    const room  = String(req.query.room || 'demo-room-123')
    const name  = String(req.query.name || 'Guest')
    const email = String(req.query.email || '')
    const token = issueNewToken({ room, name, email, isHost: false })
    res.json({ token })
  } catch (e) {
    console.error('[GET /api/jaas/token] error:', e)
    res.status(500).json({ error: 'JWT issue failed' })
  }
})



/*
// 新增「JWT 簽發（優先重用）」
// ✅ 新增：POST /api/get-jwt  body: { room, name, email, reuse=true }
app.post('/api/get-jwt', (req, res) => {
  try {
    const { room, name = 'Guest', email = '', reuse = true } = req.body || {};
    if (!room || typeof room !== 'string') {
      return res.status(400).json({ error: 'room is required' });
    }
    if (!APP_ID || !KID || !PRIVATE_KEY) {
      return res.status(500).json({ error: 'Missing JAAS_APP_ID / JAAS_KID / JAAS_PRIVATE_KEY' });
    }

    const now = Math.floor(Date.now() / 1000);
    const db = loadJSON(TOKENS_FILE);


    // 1) 優先重用：room+email 相同且未過期
    if (reuse) {
      const existing = [...(db.tokens || [])]
        .filter(t => t.room === room && t.email === email && Number(t.exp) > now)
        .sort((a, b) => Number(b.iat) - Number(a.iat))[0];

      if (existing) {
        existing.reused = (existing.reused || 0) + 1;
        saveJSON(TOKENS_FILE, db);
        console.log('[get-jwt][reuse] room=%s email=%s jti=%s', room, email, existing.jti);
        return res.json({ token: existing.token, reused: true });
      }
    }

    // 2) 簽新 token（RSA/RS256）
    const iat = now;
    const nbf = iat - 10;
    const jti = crypto.randomUUID()
    const exp = now + 60 * 60 * 24 * 30;

    const payload = {
      aud: 'jitsi',
      iss: 'chat',       // ✅ JaaS 要求固定 'chat'
          // iss: APP_ID,
      // sub: '8x8.vc',     // ✅ JaaS 網域固定 '8x8.vc'
          sub: APP_ID, // 固定用你的 App ID
      room,             // 可指定房名或 *
      iat, 
      nbf, 
      exp, 
      jti,
      context: {
          user: { name, email }
        }
      // context: {
      //   user: {
      //     id: 'user-123',      // 依你的登入系統帶值
      //     name: 'Guest',
      //     moderator: 'true'    // 或 'false'
      //   }
      // }
    }

    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'RS256',
      header: { kid: KID, typ: 'JWT' }
    })

// 記錄到 tokens.json
    db.tokens = db.tokens || [];
    db.tokens.push({
      id: shortHash(jti),
      month: monthKey(),
      room, 
      name, 
      email,
      jti, 
      iat,
      exp,
      reused: 0,
      token
    });
    saveJSON(TOKENS_FILE, db);

    console.log('[get-jwt][new] room=%s email=%s jti=%s', room, email, jti);
    return res.json({ token, reused: false });
  } catch (err) {
    console.error('❌ /api/get-jwt failed:', err);
    return res.status(500).json({ error: 'JWT generation failed' });
  }
})

// Minimal JWT endpoint: /api/jaas/token?room=<roomName>
app.get('/api/jaas/token', (req, res) => {
  try {
    const room  = String(req.query.room || 'demo-room-123'); // 純房名，不含 tenant
    const name  = String(req.query.name || 'Guest');
    const email = String(req.query.email || '');
    // const room = '*'; // ← 這行保持一致
    console.log('[JWT] issuing token for room =', room);     // ← 新增：印出房名

    if (!APP_ID || !KID || !PRIVATE_KEY) {
      return res.status(500).json({ error: 'Missing JAAS_APP_ID / JAAS_KID / JAAS_PRIVATE_KEY' });
    }

    const iat = Math.floor(Date.now() / 1000);
    const nbf = iat - 10;
    const exp = iat + 60 * 60 * 24 * 30;
    const jti = crypto.randomUUID();

  const payload = {
    aud: 'jitsi',
    iss: 'chat',       // ✅ JaaS 要求固定 'chat'
        // iss: APP_ID,
    // sub: '8x8.vc',     // ✅ JaaS 網域固定 '8x8.vc'
        sub: APP_ID, // 固定用你的 App ID
      room,
      iat, 
      nbf, 
      exp, 
      jti,
      context: {
        user: { name, email }
      }
    // context: {
    //   user: {
    //     id: 'user-123',      // 依你的登入系統帶值
    //     name: 'Guest',
    //     moderator: 'true'    // 或 'false'
    //   }
    // }
  }

  const token = jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    header: { kid: KID, typ: 'JWT' }
  })

    console.log('[JWT] issuing token for room =', room);
    return res.json({ token });
  } catch (err) {
    console.error('[get-jwt] error:', err);
    return res.status(500).json({ error: 'JWT issue failed', detail: String(err?.message || err) });
  }
})
  */

app.use((req, _res, next) => { 
  console.log(`[srv] ${req.method} ${req.url}`); 
  next(); 
})

// 新增「每月統計」API
// ✅ 新增：GET /api/stats?month=YYYY-MM
app.get('/api/stats', (req, res) => {
  const qMonth = req.query.month || monthKey()
  const tokensDb = loadJSON(TOKENS_FILE)
  const sessionsDb = loadJSON(SESSIONS_FILE)

  const tokenRows = tokensDb.tokens.filter(t => t.month === qMonth)
  const issuedCount = tokenRows.length
  const reusedTotal = tokenRows.reduce((s, t) => s + (t.reused || 0), 0)

  const byRoom = {}
  for (const t of tokenRows) {
    if (!byRoom[t.room]) byRoom[t.room] = { issued: 0, reused: 0, hosts: 0, users: new Set() }
    byRoom[t.room].issued++
    if (t.isHost) byRoom[t.room].hosts++        // ← 用 byRoom，且要先有 hosts
    byRoom[t.room].reused += (t.reused || 0)
    byRoom[t.room].users.add(t.email)
  }
  const rooms = Object.entries(byRoom).map(([room, v]) => ({
    room,
    issued: v.issued,
    reused: v.reused,
    uniqueUsers: v.users.size
  }))

  // 會話統計（需配合 webhook）
  const sessionEvents = sessionsDb.events.filter(e => (e.month || monthKey(e.ts)) === qMonth)
  const sessions = sessionEvents.filter(e => e.type === 'participant_joined').length
  const uniqueSessionUsers = new Set(sessionEvents.filter(e => e.type === 'participant_joined').map(e => e.email)).size

  res.json({
    month: qMonth,
    totals: { issuedCount, reusedTotal, sessions, uniqueSessionUsers },
    rooms
  })
})

// ✅ 新增 JaaS Webhook 端點
// 指向端點（例如 POST https://your-domain/webhooks/jaas）
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'replace-me'
app.post('/webhooks/jaas', (req, res) => {
  const sig = req.headers['x-webhook-signature']
  if (!sig || sig !== WEBHOOK_SECRET) return res.status(401).end()

  const ev = req.body || {}
  const ts = Date.now()
  // 第一次串接時建議 console.log(ev) 看實際欄位再調整
  const normalized = {
    type: ev.event_type || 'participant_joined',
    room: ev.room_name || ev.meeting?.room_name || 'unknown',
    name: ev.user_name || ev.participant?.name || 'unknown',
    email: ev.user_email || ev.participant?.email || 'unknown',
    ts,
    month: monthKey(ts)
  }

  const db = loadJSON(SESSIONS_FILE)
  db.events.push(normalized)
  saveJSON(SESSIONS_FILE, db)

  res.json({ ok: true })
})

let PRIVATE_KEY = process.env.JAAS_PRIVATE_KEY
const PRIVATE_KEY_FILE = process.env.JAAS_PRIVATE_KEY_FILE
if (!PRIVATE_KEY && PRIVATE_KEY_FILE) {
  PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_FILE, 'utf8')
}

if (!APP_ID || !KID || !PRIVATE_KEY) {
  console.error('[Server] Missing JAAS_APP_ID, JAAS_KID, or JAAS_PRIVATE_KEY(_FILE)')
  process.exit(1)
}

// 健康檢查
app.get('/healthz', (_, res) => res.send('ok'))

const server = http.createServer(app)

// 支援多網域 CORS（逗號分隔）
const allowList = (process.env.CORS_ALLOW_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || allowList.includes('*') || allowList.includes(origin)) return cb(null, true)
      return cb(new Error(`CORS blocked for origin: ${origin}`))
    },
  },
  path: '/socket.io', // 預設
})

/** 簡單顏色池（也可放前端自行決定） */
const COLORS = ['#ef4444','#22c55e','#3b82f6','#eab308','#a855f7','#10b981','#f97316','#06b6d4','#f43f5e','#84cc16']
const userColor = new Map() // socket.id -> color

io.on('connection', (socket) => {
  // 客戶端 join 時應帶 room 與 userId
  socket.on('wb:join', ({ room, userId }) => {
    socket.join(room)
    // 指派顏色（以 socket 為單位）
    if (!userColor.has(socket.id)) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      userColor.set(socket.id, color)
    }
    const color = userColor.get(socket.id)
    socket.emit('wb:color', { color })
  })

  // 筆跡（分段）同步：其它人收到後即時畫
  socket.on('wb:stroke', ({ room, stroke }) => {
    // stroke: { x0,y0,x1,y1, width, color, ts }
    socket.to(room).emit('wb:stroke', { stroke })
  })

  // 清空白板（全房）
  socket.on('wb:clear', ({ room }) => {
    io.to(room).emit('wb:clear')
  })

  socket.on('disconnect', () => {
    userColor.delete(socket.id)
  })
})

const PORT = process.env.PORT || 5174
server.listen(PORT, () => {
  console.log(`[Server] JAAS token server listening on :${PORT}`)
  console.log('[Server] CORS allow origin:', allowList.join(', ') || '*')
})
